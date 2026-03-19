# Rehab Development Standards

本文档只描述当前仓库中仍然成立的开发约定。

如果本文档与代码冲突，以以下文件为准：

1. [src/hub/NexusHub.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/hub/NexusHub.tsx)
2. [src/config/index.ts](C:/Users/DORAT/Desktop/Rehab-main/src/config/index.ts)
3. [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py)
4. [backend/models.py](C:/Users/DORAT/Desktop/Rehab-main/backend/models.py)

## 1. Current Project Structure

### Frontend

```text
src/
  hub/                应用壳子、患者工作台、数据/报告中心
  plugins/
    vision3/          体态分析插件
    rom/              ROM 评估插件
    medvoice/         语音接诊插件
  components/         通用与共享组件
  hooks/              通用 hooks
  api/                HTTP API client
  store/              Zustand 状态
  lib/                Dexie、工具与底层适配
  utils/              纯工具函数
  types/              TS 类型
  config/             运行时配置
```

### Backend

```text
backend/
  main.py             FastAPI 入口与路由
  models.py           Pydantic 模型
  utils/              分析、会话、报告、LLM 服务
  tests/              后端测试
```

### Embedded Project

- `Deeprehab-MedVoice-AI--/` 是内嵌子项目。
- 它不是主前端壳子，但后端在可用时会挂载到 `/medvoice`。

## 2. Frontend Standards

### 2.1 App Shell

- 顶层路由统一进入 `NexusHub`。
- 新功能优先落在已有壳子内，而不是新增平行应用入口。
- 患者工作流优先遵守 `dashboard -> toolbox -> workspace` 的现有模式。

### 2.2 State Management

- 局部交互状态：`useState`
- 跨页面/跨插件共享状态：Zustand
- 持久化数据：
  - Dexie / IndexedDB 见 [src/lib/db.ts](C:/Users/DORAT/Desktop/Rehab-main/src/lib/db.ts)
  - localStorage helper 仅用于少量轻量持久化

### 2.3 API Access

- HTTP 调用统一放在 `src/api/` 或少数明确的服务模块中。
- 当前真实 API client 是：
  - [src/api/treatmentPlanApi.ts](C:/Users/DORAT/Desktop/Rehab-main/src/api/treatmentPlanApi.ts)
  - [src/api/sessionReportApi.ts](C:/Users/DORAT/Desktop/Rehab-main/src/api/sessionReportApi.ts)
- WebSocket posture transport 当前集中在：
  - [src/hooks/usePostureWS.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/usePostureWS.ts)

### 2.4 Camera / MediaPipe

- 相机预览、骨架渲染和 MediaPipe 处理应尽量复用现有通道：
  - [src/components/shared/BaseWebcamView.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/components/shared/BaseWebcamView.tsx)
  - [src/hooks/useCameraStream.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/useCameraStream.ts)
  - [src/hooks/useMediaPipe.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/useMediaPipe.ts)
  - [src/hooks/useSkeletonRenderer.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/useSkeletonRenderer.ts)
- 实时绘制与回调优先使用 `requestAnimationFrame` 路径，不要回退到粗粒度 `setInterval`。

### 2.5 Styling

- 视觉规范的代码级锚点是：
  - [src/constants/uiStyles.ts](C:/Users/DORAT/Desktop/Rehab-main/src/constants/uiStyles.ts)
  - [src/index.css](C:/Users/DORAT/Desktop/Rehab-main/src/index.css)
- 新 UI 优先复用现有 token、共享类、layout 组件。
- 仓库仍存在历史 raw Tailwind class；允许渐进迁移，但不要再新增明显重复的样式模式。

### 2.6 File Naming

- React 组件：`PascalCase.tsx`
- hooks：`camelCase.ts` 且以 `use` 开头
- 工具函数：`camelCase.ts`
- 测试文件：`*.test.ts` / `*.test.tsx`

## 3. Backend Standards

### 3.1 Routing

- 所有当前生产接口统一收敛在 [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py)。
- 新增接口前先检查是否能扩展现有：
  - `/ws/analyze`
  - `/api/treatment-plan/*`
  - `/api/session-report/generate`

### 3.2 Models

- 请求/响应模型统一定义在 [backend/models.py](C:/Users/DORAT/Desktop/Rehab-main/backend/models.py)。
- 新增接口不要在路由函数内部偷偷发明协议结构。

### 3.3 Error Handling

- HTTP 失败优先返回明确 `HTTPException`。
- 配置缺失、上游数据缺失、内部异常要分层处理，不要全部压成同一种错误。
- WebSocket 分支至少要记录清楚收到的 `type` 和处理失败原因。

### 3.4 Performance

- 高密度计算逻辑优先留在 `backend/utils/` 的独立函数中，不要把算法直接堆在路由里。
- 姿态与时序数据转换要避免无谓重复序列化。

## 4. Testing Standards

### 4.1 Frontend

- 测试框架：
  - Vitest
  - React Testing Library
  - `@testing-library/jest-dom`
- 测试 setup 当前统一由：
  - [src/test/setup.ts](C:/Users/DORAT/Desktop/Rehab-main/src/test/setup.ts)
- 新增组件/Hook 时，优先补目标式单测，不要只依赖大而脆的集成回归。

### 4.2 Backend

- 后端测试主目录：
  - `backend/tests/`
- 根目录也存在历史 Python 验证脚本；保留可用，但不应继续扩散这类零散脚本作为主要测试入口。

## 5. Documentation Standards

- 项目说明优先更新：
  - [README.md](C:/Users/DORAT/Desktop/Rehab-main/README.md)
  - [docs/API_SPECIFICATION.md](C:/Users/DORAT/Desktop/Rehab-main/docs/API_SPECIFICATION.md)
  - [docs/ROLE_PERMISSION_EXECUTION_SPEC.md](C:/Users/DORAT/Desktop/Rehab-main/docs/ROLE_PERMISSION_EXECUTION_SPEC.md)
  - [PROJECT_INFO_MAP.md](C:/Users/DORAT/Desktop/Rehab-main/PROJECT_INFO_MAP.md)
- 若接口、端口、入口文件发生变化，上述文档必须同步。
- 历史复盘、工时报告、阶段性设计稿不应再充当“当前真相文档”。

## 6. Practical Rules for New Work

- 先看现有模块，再决定是否新建模块。
- 先复用现有 store / hook / API client，再新增平行实现。
- 先对齐当前壳子和交互流，再改样式细节。
- 先让文档和代码同一口径，再继续叠加新设计说明。
