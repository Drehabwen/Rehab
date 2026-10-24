# RehabMain 插件化架构（借鉴 DSH）

> 版本：v1（2026-10-19） · 对应方案：`docs/WORKBENCH_TRANSFORMATION_PLAN.md`
> 结论：**借鉴 DSH 的"内核 + 插件 + 插槽 + 服务缝 + 清单编排"五件套，在 RehabMain 现有 React + FastAPI 栈内实现；不迁移到 DSH 运行时。**

---

## 0. 为什么不是"照抄 DSH 运行时"

DSH 的插件体系建立在 Cordis（TS DI 内核）+ Electron 双半边 + 模块表 externals 之上。RehabMain 的资产是 **React SPA + FastAPI(Python/MediaPipe)**，整体搬迁等于重写。借鉴的是**架构模式**，不是它的运行时：

| DSH 概念 | 含义 | RehabMain 对应 |
|---|---|---|
| 内核 ctx + 服务注入 | 插件只依赖服务，不互相 import | `kernel.ts` 的 `ctx` + `inject` 声明 |
| bundle / patch 分层 | 组合式装配，可覆盖配置 | `rehab.plugins.json` 清单 + `profiles/{dev,prod}.json` 覆盖 |
| slots（single/list/keyed/chain） | 类型化 UI 扩展点 | `<Slot name>` + 注册表 |
| seam（能力服务） | 数据/文件/LLM 由内核提供 | `patientStore / eventStore / llm / files / audit` |
| client / host 半边 | 一个插件两块，契约清晰 | `plugin.client.tsx` + `backend/plugins/<id>/plugin.py` |
| plugin manager | 安装/启停/版本约束 | 设置页「插件」+ 启用状态存 DB |
| HMR | 改插件即刷新 | Vite HMR（开发）+ 插件边界热替换（可选） |

---

## 1. 目标形态

```
前端
  kernel/            ctx（服务容器）+ loader + slot registry + 命令/设置
  slots/             slot 名称与类型定义（唯一允许跨插件引用的类型层）
  plugins/
    vision3/         manifest + client entry + services + slot 贡献
    rom/
    medvoice/
    report-center/   （把报告中心也插件化，作为"可替换能力"的样板）
后端
  core/              patients / events / audit / files / llm / auth
  plugins/
    vision3/         plugin.py（APIRouter + migrations + manifest）
    rom/
    medvoice/
```

### 硬规则（对齐 DSH 的纪律）

1. **插件之间零直接 import**（组件、store、service 都不行）；只能通过 `ctx.services` 与 `<Slot>`
2. 插件不直连数据库 / IndexedDB；所有持久化走内核 `patientStore/eventStore`，内核负责审计与事件
3. 每个插件声明 `inject`，内核拓扑排序初始化；缺失依赖 → 插件进入 `pending`，不阻塞其它插件
4. 每个插件必须有 `manifest`（id/version/apiVersion/inject/provides/slots/permissions）
5. 插件的失败被隔离：单个插件抛错只卸载自己，页面其余部分照常
6. 插件卸载必须可逆：`apply()` 返回 disposer，所有注册（slot/service/command）在卸载时回收

---

## 2. 前端契约

### 2.1 清单

```ts
// src/kernel/types.ts
export interface PluginManifest {
  id: string;                 // 'vision3'
  version: string;            // '1.2.0'
  apiVersion: number;         // 内核契约版本，不匹配拒绝加载
  displayName: string;
  inject?: string[];          // ['patientStore', 'eventStore', 'llm']
  provides?: string[];        // ['assessment:posture']
  slots?: {                   // 贡献点
    'assessment.tools'?: { id: string; order?: number }[];
    'report.sections'?: { id: string; order?: number }[];
  };
  permissions?: string[];     // ['patient:read', 'patient:write', 'media:camera']
  capabilities?: string[];    // ['camera', 'llm']
}
```

### 2.2 入口

```ts
// src/plugins/vision3/index.ts
import type { Plugin } from '@/kernel/types';
import { Vision3Tool } from './components/Vision3Tool';
import { Vision3ReportSection } from './components/Vision3ReportSection';
import { useVision3Store } from './store/useVision3Store';

export const vision3Plugin: Plugin = {
  manifest: { /* … */ },
  apply(ctx) {
    const disposeTool = ctx.slots.register('assessment.tools', 'vision3', Vision3Tool, { order: 10 });
    const disposeReport = ctx.slots.register('report.sections', 'vision3', Vision3ReportSection, { order: 20 });
    ctx.services.register('assessment:posture', { run: useVision3Store.getState().run });
    return () => { disposeTool(); disposeReport(); };
  },
};
```

### 2.3 插槽目录（首批）

| Slot | 类型 | 谁贡献 | 谁渲染 |
|---|---|---|---|
| `sidebar.entries` | list | 各插件 | HubSidebar |
| `today.panels` | list | 计划执行 / 待办 / 复测提醒 | 今日工作台 |
| `patient.overview.cards` | list | 评估摘要、最近计划、随访 | 患者详情 |
| `assessment.tools` | list | vision3 / rom / 量表 | 评估中心 |
| `assessment.result.renderers` | keyed（按 type） | 各评估插件 | 报告中心 |
| `report.sections` | list | 各评估插件 + 报告中心 | 报告页 |
| `timeline.kinds` | keyed（按 event kind） | 各插件 | 患者时间线 |
| `patient.toolbox.actions` | list | 家庭访问 / 推送 / 复采 | 患者工具箱 |

`keyed` 用于「同一种数据、不同插件渲染」的场景（评估结果、时间线事件），与 DSH 的 keyed slot 同构；`chain`（优先级抢渲染）先不引入，避免过度设计。

### 2.4 内核服务（缝）

```ts
interface Services {
  patientStore: { list(q): Promise<Patient[]>; get(id): Promise<Patient>; upsert(p): Promise<Patient> };
  eventStore: { append(e: PatientEvent): Promise<void>; list(patientId, filter?): Promise<PatientEvent[]> };
  assessmentStore: { save(a: Assessment): Promise<void>; listByPatient(id): Promise<Assessment[]> };
  llm: { complete(prompt, opts): Promise<string>; stream(...): AsyncIterable<string> };
  files: { upload(f): Promise<FileRef>; url(ref): string };
  audit: { log(action, target, before?, after?): void };
  permissions: { has(scope: string): boolean; require(scope: string): void };
  galenConnector: { publish(snapshot): Promise<void>; readFeedback(): Promise<Feedback[]> };
}
```

**插件永远拿不到 `db` / `fetch` / `localStorage`**——这条守住，后面的多设备、审计、迁移才有意义。

---

## 3. 后端契约

```python
# backend/plugins/vision3/plugin.py
from fastapi import APIRouter
from core.plugin import Plugin, PluginManifest

router = APIRouter(prefix="/api/plugins/vision3", tags=["vision3"])

MANIFEST = PluginManifest(
    id="vision3", version="1.2.0", api_version=1,
    inject=["patients", "events", "files", "llm"],
    permissions=["patient:read", "patient:write", "media:camera"],
    migrations=["001_init.sql"],   # 只建 plugin_vision3_* 表
)

def register(app): app.include_router(router)
```

规则：
- 每个插件自己的表一律 `plugin_<id>_*`；跨插件共享的核心表（patients/sessions/events/audit）只能经 core 服务写
- 插件路由统一前缀 `/api/plugins/<id>/`，OpenAPI 上可见、可单独鉴权
- 现有 `routers/integration.py`（95KB）按插件拆分：`patients / scales / screening / treatment-plan / family` 各自落位；拆完 integration 只留跨插件编排
- 迁移：`core/migrations.py` 统一跑，按 `schema_migrations(plugin_id, version)` 记录

---

## 4. 加载与生命周期

**开发/内置**：Vite `import.meta.glob('../plugins/*/index.ts')` 静态注册，构建期确定，可 tree-shake。
**外部插件（Electron）**：从 `%APPDATA%/RehabMain/plugins/<id>` 读取 manifest + 打包好的 `client.js`（ESM），用 `import(file://…)` 动态加载；manifest 校验 `apiVersion` 与 `permissions` 后才允许 `apply`。
**启停**：启用状态存 DB（`plugin_state(id, enabled, config)`)；禁用 = 调用 disposer + 从 slot 注销 + 服务下线；重启后按状态恢复。
**错误隔离**：内核为每个插件包 `<PluginBoundary>`，捕获渲染错误 → 显示"该插件已停用（可重试）"，不影响其它插件。
**版本约束**：`apiVersion` 不匹配直接拒绝，并在设置页给出原因（与 DSH 的 engines 检查同思路）。

---

## 5. 与 Galen/DSH 的关系

- 短期：RehabMain 用**自研内核**（DSH 启发，非 DSH 兼容）
- 中期：manifest 字段与 DSH 对齐（`id/version/inject/provides/client`），插件产物按"closure factory + externals"打包，为将来"同一插件跑在两个宿主"留出适配层
- 长期（可选）：写 `dsh-adapter`，把 RehabMain 的 client 插件注册进 DSH 的 slots（共享 React 组件与设计 token），Galen 侧即可复用评估面板

**不建议**现在就把 RehabMain 迁到 DSH 运行时：会丢掉 FastAPI/MediaPipe 计算链路和 241 个测试，收益不匹配成本。

---

## 6. 迁移路径（3–4 周，与工作台改造并行）

| 阶段 | 内容 | 产出 / 验收 |
|---|---|---|
| P-A（3–4 天） | 内核骨架：ctx/services/slots/loader/manifest 校验 + `<Slot>` | 空白页能加载一个 hello 插件并渲染 slot |
| P-B（4–5 天） | 三个现有功能改成插件（vision3/rom/medvoice），行为不变 | 241 个测试仍全绿；页面无回归 |
| P-C（3 天） | 报告中心 / 数据中心改成 slot 组合；`assessment.result.renderers` 生效 | 报告页由插件拼装 |
| P-D（3 天） | 后端拆分：integration.py → core + 插件路由；插件表命名空间 + 迁移表 | 接口路径不变（保留旧路由别名） |
| P-E（2 天） | 设置页「插件」：启停、版本、权限、错误 | 禁用 vision3 后，评估中心不再出现体态入口 |
| P-F（2 天） | 外部插件加载（Electron）+ SDK 模板 `create-rehab-plugin` | 一个示例插件（如"随访提醒"）能装、能跑、能卸 |

### 当前进度（2026-10-19）

- ✅ **P-A 完成**：`src/kernel/{types,services,slots,kernel,react,loader,index}.ts` + `src/plugins/hello`（示例插件）+ `/kernel-demo` 自检页；9 个测试覆盖服务容器、插槽排序/keyed、manifest 校验、依赖排序、pending、apiVersion 拒绝、错误隔离、可逆卸载
- ✅ **P-B 完成**：`vision3 / rom / medvoice` 已是真插件（`src/plugins/*/plugin.tsx`），贡献 `assessment.tools` 与 `assessment.workspace`（keyed）；`AssessmentCenterView` 的评估模块与 `NexusHub` 的工作区渲染改为插槽；新增 4 个接线测试（共 13 个内核测试）
- ✅ **P-C 完成（报告中心）**：
  - `assessment.result.renderers`（keyed）真正生效：`ModuleResultsGrid` 对每个模块先问插槽，有插件渲染器就用插件，没有就回退默认卡片（`scale` 走回退，行为不变）
  - `report.sections`：报告页新增插件段落（体态 / ROM / 语音各一段）
  - 共用展示层抽到 `src/components/workflow/ModuleResultCard.tsx`（插件之间仍不互相 import）
  - 新增 2 个测试（渲染器注册矩阵 + 渲染回退），内核测试共 15 个
  - 数据中心仍保留自有表格（下一阶段再看是否用 `assessment.result.renderers` 渲染行）
- 插槽接线方式：`App` 挂 `KernelProvider`（内核单例）→ 页面里 `<Slot name="…" />`


---

## 7. 风险与反模式

| 风险 | 处理 |
|---|---|
| 过度设计（插件化本身不产出功能） | 只抽取**已存在的**边界（三个评估 + 报告中心），不为假想需求建抽象 |
| 插件间绕过服务直接 import | ESLint 规则：`src/plugins/*` 禁止 import 其它 `plugins/*`；CI 拦截 |
| Zustand store 散落 | 插件内部 store 允许保留，但跨插件状态必须经 `ctx.services` |
| IndexedDB 耦合 | 迁移期内核提供兼容层：`patientStore` 内部先读写 Dexie，后续换 API，插件无感 |
| 测试大面积重写 | 保留组件公共 API；测试只改 import 路径，不改断言 |
| 动态加载的安全边界 | 外部插件只接受本地已签名清单（或内测白名单）；默认只加载内置插件 |

---

## 8. 需要拍板

1. **插件边界**：报告中心/数据中心是否也插件化？（建议：是，作为"可替换能力"样板）
2. **外部插件**：首发是否允许第三方插件？（建议：首发只内置 + 白名单，外部加载留开关）
3. **服务粒度**：`patientStore` 先包 Dexie 再换 API，还是一步到 API？（建议：先兼容层，与 P0 后端化并行）
