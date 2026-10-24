# RehabMain → 康复师工作台：差距分析与改造方案

> 版本：v1（2026-10-19） · 范围：`Rehab-main` 仓库（分支 `codex/project-closure`）
> 定位结论：**RehabMain 保持"临床现场端"产品，Galen/DSH 作为"研究大脑"，通过 Connector 契约打通；不把 RehabMain 重写成 DSH 插件。**

---

## 1. 结论（TL;DR）

RehabMain 已经是一个**能用的评估型工作台**（37.5k 行、241 个前端测试、Electron 安装包、FastAPI 后端已落 SQLite 的部分业务表）。要变成康复师**每天会打开**的工作台，缺的不是功能数量，而是四根柱子：

1. **主数据在后端**（现在患者/接诊/评估主数据在浏览器 IndexedDB）
2. **身份、角色、审计**（现在只有 Nginx Basic Auth）
3. **患者时间线**（现在接诊/评估/报告分散在三个页面）
4. **计划执行闭环**（现在"治疗计划"是一段文本 blob，没有逐条执行记录）

产品楔子一句话：**把「接诊 → 评估 → 计划 → 每次治疗执行 → 复测 → 报告 → 科研证据」串成一条可回溯的患者时间线。**

---

## 2. 现状盘点

### 2.1 能力矩阵

| 模块 | 现状 | 证据 |
|---|---|---|
| Vision3 体态分析 | 可用，MediaPipe 前端采集 + 后端姿态/关节分析 | `src/plugins/vision3/`（47 文件）、`backend/utils/posture_analysis.py`、`joint_analysis.py` |
| ROM 关节活动度 | 可用 | `src/plugins/rom/`（15 文件）、`docs/ROM_CORE_DRAFT.md` |
| MedVoice 语音接诊 | 可用，结构化病历生成 | `src/plugins/medvoice/`、`backend/utils/session_reporter.py`、`llm_reporter.py` |
| 报告中心 / 数据中心 / 前后对比 | 可用 | `src/hub/components/NexusReportCenter.tsx`、`views/DataCenterView.tsx`、`ProgressComparison.tsx` |
| 患者档案 + 工具箱 | 可用（档案、家庭访问、推送中心） | `PatientToolbox.tsx`、`FamilyAccessManager.tsx`、`ParentPushCenter.tsx` |
| 量表下发/回收 | 可用（C 端填写） | `/api/integration/scale/*`、`pending_scales` 表 |
| 早筛同步 | 可用（待接诊导入） | `/api/integration/sync-screening`、`synced_screenings` 表 |
| 康复计划生成 | 可用（LLM 生成） | `/api/treatment-plan/generate*`、`treatment_plans.plan_content` |
| 计划执行 | **缺**（只有 C 端 `daily_tracking` 自报） | `daily_tracking` 表字段：exercises_completed(JSON)/duration/symptoms |
| 患者时间线 | **缺**（事件散落） | 无 events 表；`patients` 无事件流 |
| 角色/权限/审计 | **缺** | 后端 grep `audit|role|permission` 无结果 |
| 多设备 | **缺** | 文档明确"固定一台电脑 + 一个浏览器配置" |
| 分发 | 半成品 | `release-lean/RehabMain-Setup-0.1.0-internal-x64.exe`，未签名 |

### 2.2 数据现状（最关键）

**双主数据源**：

- 前端 Dexie（IndexedDB）v4：`patients`、`sessions`、`assessments`、`sessionReports`
- 后端 SQLite：`patients`（patient_id/short_code/display_name/sex/age/height/suc）、`patient_aliases`、`patient_access_links`、`treatment_plans`、`assessment_summaries`、`parent_reports`、`daily_tracking`、`pending_scales`、`synced_screenings`、`translation_cache`

两边都有 `patients`，字段模型不一致（IndexedDB 有 sequence/session 关系，SQLite 有 short_code/suc/aliases）。**这是最大技术债**：清缓存丢数据、多设备不可能、报告与科研数据对不齐。

### 2.3 工程底座（可复用，别动）

- 前端单测 241 通过；后端有 `scripts/release_acceptance.py` 无污染闭环验收
- 打包：Electron + electron-builder；部署：Docker Compose + Nginx Basic Auth + SQLite
- 与 Galen 的连接器已存在：`src/lib/galenConnector.ts` → `%LOCALAPPDATA%\Rehab\GalenConnector\latest.json`；Galen 回写 `feedback.json`

---

## 3. 目标架构

```
┌──────────────────────── 前端（React） ────────────────────────┐
│  今日工作台 │ 患者时间线 │ 计划执行 │ 评估（Vision3/ROM/MedVoice）│
│  报告中心   │ 设置/团队                                             │
└───────────────┬───────────────────────────────────────────────┘
                │ 离线队列（Dexie 仅作缓存 + 待同步）
┌───────────────▼───────────────┐        ┌──────────────────────┐
│ FastAPI（源数据 + 业务）       │ 契约 → │ Galen / DSH（研究端） │
│ PostgreSQL（首发可 SQLite）    │        │ latest.json/feedback │
│ users/roles/audit/events       │        └──────────────────────┘
└───────────────────────────────┘
```

原则：
1. **后端是唯一事实源**；Dexie 降级为离线缓存 + 写队列（断网可采集，恢复后幂等同步）
2. **一切状态变更写事件**（`patient_events`），页面读的是投影
3. 评估算法（MediaPipe/关节/LLM）保持现状，不动

---

## 4. 数据模型改造

### 4.1 新增表

```sql
-- 统一事件流（时间线的唯一来源）
CREATE TABLE patient_events (
  event_id     TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL,
  session_id   TEXT,
  kind         TEXT NOT NULL,   -- intake/assessment/report/plan/execution/retest/feedback/note
  payload      TEXT NOT NULL,   -- JSON（按 kind 定义 schema）
  actor_id     TEXT,            -- 谁触发
  occurred_at  TEXT NOT NULL,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_events_patient_time ON patient_events(patient_id, occurred_at);

-- 结构化计划（替代 plan_content 文本 blob，保留原字段做兼容）
CREATE TABLE plan_items (
  item_id      TEXT PRIMARY KEY,
  plan_id      TEXT NOT NULL,
  patient_id   TEXT NOT NULL,
  seq          INTEGER NOT NULL,
  title        TEXT NOT NULL,
  dosage       TEXT,            -- 剂量/次数/时长
  target       TEXT,            -- 目标（ROM/肌力/步态…）
  status       TEXT DEFAULT 'pending',
  created_at   TEXT NOT NULL
);

-- 治疗执行记录（康复师/助理打卡）
CREATE TABLE execution_logs (
  log_id       TEXT PRIMARY KEY,
  plan_item_id TEXT NOT NULL,
  patient_id   TEXT NOT NULL,
  session_id   TEXT,
  status       TEXT NOT NULL,   -- done/partial/skipped
  actual       TEXT,            -- 实际剂量/完成度
  note         TEXT,
  actor_id     TEXT NOT NULL,
  executed_at  TEXT NOT NULL
);

-- 身份与审计
CREATE TABLE users (
  user_id TEXT PRIMARY KEY, display_name TEXT, role TEXT NOT NULL, -- admin/therapist/assistant
  org_id TEXT, active INTEGER DEFAULT 1, created_at TEXT
);
CREATE TABLE audit_log (
  audit_id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL,
  target_type TEXT, target_id TEXT, before TEXT, after TEXT, at TEXT NOT NULL
);
```

### 4.2 迁移策略（Dexie → 后端）

1. 前端启动时检测 Dexie 版本 4 的存量数据，走一次性迁移向导：导出备份 → 逐表 `POST /api/migrate/batch`（幂等 upsert）→ 标记 `migrated_at`
2. 迁移期内双写（后端为准，Dexie 只写缓存），迁移完成后 Dexie 只保留队列
3. `patients` 字段合并规则：以 `patient_id` 为主键；`short_code` 唯一；`suc`/`aliases` 保留在后端；Dexie 的 `sequence` 归入 `sessions.sequence`
4. 验收：同一患者迁移后 会话数/评估数/报告数 与迁移前一致；断网新建的评估恢复后入库且不重复

---

## 5. 分期计划（10 周）

### P0（第 1–3 周）数据与身份 —— 不做完就没有"工作台"

| # | 任务 | 验收 |
|---|---|---|
| P0-1 | 后端主数据 API：patients/sessions/assessments/reports 增删改查 | 前端不再依赖 Dexie 读主数据 |
| P0-2 | Dexie → 后端一次性迁移 + 后端为唯一源 | 迁移脚本全绿；断网写入 → 恢复幂等 |
| P0-3 | users/roles + 登录（会话 Cookie）+ audit_log | 角色越权被拒；关键操作可在审计里查到 |
| P0-4 | `patient_events` 事件流 + 写入钩子 | 任意一次接诊/评估/报告都产生事件 |

### P1（第 4–7 周）工作台化 —— 让康复师每天打开

| # | 任务 | 验收 |
|---|---|---|
| P1-1 | **今日工作台**：待接诊 / 待评估 / 待复测 / 待确认报告 / 今日执行 | 一屏看清今天要做什么 |
| P1-2 | **患者时间线**：纵向时间轴，聚合事件，可筛选类型 | 一个患者从建档到最近一次治疗全部可回溯 |
| P1-3 | 计划结构化：`treatment_plans.plan_content` → `plan_items`（LLM 输出结构化） | 计划可勾选执行、可调整 |
| P1-4 | 执行打卡：done/partial/skipped + 实际剂量 | 每次治疗有记录，可统计依从性 |
| P1-5 | 多设备：后端会话 + 账号 | 两台电脑同一账号看到同一数据 |

### P2（第 8–10 周）闭环与分发

| # | 任务 | 验收 |
|---|---|---|
| P2-1 | 复测对比：执行 N 周后自动提示复测，报告自动出前后对比 | 复测报告一键生成 |
| P2-2 | Galen 闭环 UI：把 `feedback.json` 的"复采/复测/接受/排除"变成待办 | 待办里出现"Galen 要求复采"并可执行 |
| P2-3 | 报告模板化 + 导出（PDF/DOCX） | 三种模板随选 |
| P2-4 | 分发：签名、安装器、自动更新 | 干净机安装可用 |

---

## 6. 信息架构（页面）

```
今日工作台（默认首页）
├─ 今日待办（接诊/评估/复测/报告确认）
├─ 今日计划执行（按患者分组的 plan_items）
└─ 快捷入口（新建患者 / 新建接诊 / 扫码建档）

患者
├─ 患者列表（搜索、标签、最近一次评估）
└─ 患者详情
   ├─ 概览（基本信息 + 最近指标 + 待办）
   ├─ 时间线（核心页）
   ├─ 评估（Vision3 / ROM / MedVoice / 量表）
   ├─ 计划（结构化 plan_items + 执行记录）
   └─ 报告（历次报告 + 前后对比）

数据中心 / 设置（团队、角色、备份、Galen 连接）
```

---

## 7. 与 Galen 的分工与契约

| | RehabMain | Galen（DSH） |
|---|---|---|
| 职责 | 现场采集、评估、计划执行、复测、家长/患者回访 | 文献、证据链、PRISMA、agent 编排、科研产出 |
| 数据 | 结构化评估 + 执行记录 | 研究快照、判定、反馈任务 |
| 契约 | `latest.json`（最小研究快照） | `feedback.json`（接受/排除/纠正/复采/复测） |

本次改造需扩展快照字段：`plan_items`（计划与剂量）、`execution_logs`（依从性）、`events`（时间线摘要）。**不把患者原始影像/视频放进快照**。

---

## 8. 风险与合规

| 风险 | 处理 |
|---|---|
| git 历史提交过 `backend/rehab_integration.db` | 仓库转私有 + 重写历史（需批准后执行） |
| "诊断"表述 | 全线保持"评估/辅助信息，不构成诊断"；报告页固定免责声明 |
| 迁移丢数据 | 迁移前强制导出备份；迁移幂等；失败可回滚到 Dexie 快照 |
| 多设备后权限 | 角色矩阵最小化：康复师可写、助理只执行、管理员管账号 |
| 单点部署 | 首发仍可 Docker + SQLite，但接口层按 Postgres 设计（不用 SQLite 专有语法） |
| 审计膨胀 | audit_log 按月归档，只保留关键动作 |

---

## 9. 明确不做的事

1. **不把 RehabMain 重写成 DSH 插件**——技术栈差异大（React+FastAPI+MediaPipe vs TS+Cordis），会丢掉最值钱的采集能力
2. 不重写 Vision3 / ROM / MedVoice 的算法层（它们是资产）
3. 不在本阶段做"AI 自动诊断"或"治疗建议直接给患者"
4. 不做多机构 SaaS（等单工作站跑顺再谈）

---

## 10. 第一周任务清单（可直接开工）

- [ ] 梳理 Dexie 所有读写点（`grep -r "db\\.\(patients|sessions|assessments|sessionReports\)" src/`），产出调用清单
- [ ] 定义 `patients/sessions/assessments/sessionReports` 的后端 API 契约（OpenAPI）
- [ ] 建 `users/roles/audit_log/patient_events` 表 + 迁移脚本
- [ ] 前端加 `apiClient` 统一层 + 离线队列骨架（写失败入队，恢复重放）
- [ ] 今日工作台 + 患者时间线的静态骨架（先假数据跑通信息架构）

---

## 11. 需要拍板的三件事

1. 数据库：首发继续 SQLite，还是一步到 PostgreSQL？（建议：接口按 PG 写，首发可 SQLite）
2. 登录方式：本地账号，还是复用现有机构账号/微信？（建议：先本地账号 + 角色）
3. 时间线粒度：只聚合"业务事件"，还是连操作审计也上时间线？（建议：业务事件上时间线，审计进设置页）
