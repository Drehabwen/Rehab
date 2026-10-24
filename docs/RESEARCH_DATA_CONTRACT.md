# 研究数据流通契约 v1（RehabMain → Galen）

> 状态：**已实现并联调通过**（2026-10-20）。本文件是两边共同遵守的接口说明。
> 验证命令：`node scripts/research-e2e.mjs`（在 RehabMain 仓库根目录执行）——构建真实批次、落盘、Galen 导入、幂等校验，一条命令跑通。

---

## 1. 目标与边界

- 临床端（RehabMain）：日常把数据录对、文书写完，**点一下「导出并传输」**。
- 研究端（Galen）：拿到干净的批量数据，做队列、统计、选题与成稿。
- **单向批量**：不做实时双向、不做 UI 互嵌。
- **RehabID 是唯一枢纽**：临床端本地保留真实身份，导出包只出现 RehabID。

## 2. RehabID

| 规则 | 说明 |
|---|---|
| 生成 | `RID-<shortCode>`（大写，去空格）；没有 shortCode 时退化为 `RID-<UUID 前 10 位>` |
| 映射位置 | 只在 RehabMain 本地（`patient.id → RehabID`），不导出映射表 |
| 禁止导出 | 姓名、备注、联系方式、地址、原始音视频、影像 |
| 出现位置 | 所有 JSONL 的 `rehabId` 字段；文书正文中的姓名会被替换为 RehabID |

实现：`src/services/research/schema.ts`（`toRehabId` / `buildRehabIdIndex`）。

## 3. 批次目录

```
%LOCALAPPDATA%\Rehab\GalenConnector\exports\<batchId>\
├─ manifest.json      # 元数据 + 每文件 sha256/字节数/行数
├─ patients.jsonl     # RehabID + 粗粒度信息
├─ events.jsonl       # 临床事件流（visit / assessment / session_report）
└─ documents.jsonl    # 文书（姓名已脱敏为 RehabID）
```

`batchId` 格式：`batch-YYYYMMDD-HHMMSS-<4位随机>`（`src/services/research/build.ts` 的 `createBatchId`）。

写入实现：`desktop/galen-research-export.cjs` —— 原子写（staging 目录 → rename）、同 batchId 覆盖、单文件 ≤20MB、整批 ≤50MB。

## 4. manifest.json

```json
{
  "schema": "rehab-research/1",
  "batchId": "batch-20261020-120000-e2e1",
  "exportedBy": "rehab-workbench",
  "exportedAt": 1700000400000,
  "since": null,
  "coverage": { "from": 1700000200000, "to": 1700000310000 },
  "counts": { "visit": 2, "assessment": 3, "session_report": 1, "patients": 2, "documents": 1 },
  "quality": {
    "patients": 2, "patientsWithAssessment": 2, "visits": 2, "assessments": 3,
    "documents": 1, "moduleCoverage": { "posture": 1, "rom": 1, "medvoice": 0, "scale": 1, "adams": 0 },
    "incompleteEvents": 0, "lastEventAt": 1700000310000
  },
  "files": [
    { "name": "patients.jsonl", "bytes": 120, "sha256": "…", "lines": 2 },
    { "name": "events.jsonl", "bytes": 1800, "sha256": "…", "lines": 6 },
    { "name": "documents.jsonl", "bytes": 300, "sha256": "…", "lines": 1 }
  ],
  "note": "RehabMain 研究数据批次（去标识）"
}
```

`since` 为 null 表示全量；否则表示"只包含 occurredAt > since 的记录"。RehabMain 本地记录导出游标（localStorage `rehab.research.exportCursor`），下次自动增量。

## 5. JSONL 记录

**patients.jsonl**
```json
{ "rehabId": "RID-CS-2418", "createdAt": 1700000000000, "shortCode": "CS-2418", "tagCount": 0 }
```

**events.jsonl**（三类）
```json
{ "eventId": "visit-s-1", "rehabId": "RID-CS-2418", "type": "visit", "occurredAt": 1700000200000,
  "recordedAt": 1700000200000, "schemaVersion": 1, "completeness": "complete",
  "payload": { "visitSeq": 1, "status": "completed", "isBaseline": true, "assessmentCount": 0 } }

{ "eventId": "assessment-a-1", "rehabId": "RID-CS-2418", "type": "assessment", "occurredAt": 1700000210000,
  "recordedAt": 1700000210000, "schemaVersion": 1, "completeness": "complete",
  "payload": { "assessmentId": "a-1", "sessionId": "s-1", "assessmentType": "posture", "mode": "quick",
               "status": "completed", "data": { "posture": { "metrics": { "headForward": 12 } } } } }

{ "eventId": "report-r-1", "rehabId": "RID-CS-2418", "type": "session_report", "occurredAt": 1700000230000,
  "recordedAt": 1700000230000, "schemaVersion": 1, "completeness": "complete",
  "payload": { "reportId": "r-1", "sessionId": "s-1", "sourceAssessmentCount": 2,
               "insightCount": 1, "recommendationCount": 1 } }
```

- `eventId` 确定性生成（`type-源记录ID`）→ Galen 侧按 `eventId` 幂等去重。
- `completeness`：结构化数据为空 / 文书未生成 → `partial`，用于 Galen 判断数据质量，**不丢数据**。

**documents.jsonl**
```json
{ "documentId": "r-1", "rehabId": "RID-CS-2418", "sessionId": "s-1", "createdAt": 1700000230000,
  "kind": "session_report", "chars": 86,
  "markdown": "## RID-CS-2418\n头前伸 12°，建议胸椎伸展训练。",
  "insights": ["RID-CS-2418 头前伸改善 2°"],
  "recommendations": ["RID-CS-2418 每周 2 次肩胛稳定训练"] }
```

## 6. 传输链路（已实现）

```
RehabMain 数据中心
  └─ ResearchDataPanel「导出并传输」
       └─ src/services/research/service.ts
            ├─ buildCurrentResearchPackage()   # Dexie → 事件流 + 文书（脱敏）
            └─ window.rehabDesktop.exportGalenResearch(pkg)
                 └─ desktop/main.cjs  IPC 'galen-research:export'
                      └─ galen-research-export.cjs → exports\<batchId>\  （原子写）
                            └─ Galen: lib/research.js  listBatches / importBatch / researchSummary
                                 └─ 状态：~/.dsh/galen-workspace/research.json
```

IPC / 浏览器桥类型见 `src/vite-env.d.ts`（`exportGalenResearch` / `listGalenResearchBatches`）。
Galen 侧端点（`galen-workspace`）：

| endpoint | 说明 |
|---|---|
| `research/batches` | 列出可用批次（读 manifest，忽略不完整/损坏批次） |
| `research/import` | 指定 `batchId` 导入；不传则导入所有未入库批次；返回 summary |
| `research/summary` | 聚合：患者数/事件数/文书数/按类型/模块覆盖/时间范围/未完整事件 |

## 7. 质量门（写入前强制）

1. 字段白名单：出现 `name / notes / phone / markdownReport / transcript / answers …` → 直接拒绝（`galen-research-export.cjs` 与 `galen-connector.cjs` 双重校验）。
2. 逐行 JSON 校验；非对象/非法 JSON 拒绝。
3. sha256：写入时算，导入时校验；任何文件被改动 → 拒绝导入。
4. 体积上限：单文件 20MB / 整批 50MB。
5. 幂等：同 `batchId` 覆盖；同 `eventId` 不重复入库。

## 8. 已验证

| 验证 | 结果 |
|---|---|
| `npx vitest run src/services/research` | 9/9 通过（RehabID、事件排序、增量游标、脱敏、打包、质量指标） |
| `node --test desktop/galen-research-export.test.cjs` | 3/3 通过（原子写、哈希、私密字段拒绝、批次列表） |
| `node --test tests/research.test.js`（Galen 仓库） | 5/5 通过（列批次、幂等导入、pending 导入、篡改拒绝、路径覆盖） |
| `node --test tests/analysis.test.js`（Galen 仓库） | 4/4 通过（结局抽取、纵向档案、队列/选题/缺口、空数据） |
| `node scripts/research-e2e.mjs` | **通过**：2 患者 / 10 事件 / 1 文书 → 导入 10 条、分析出 `topic-prepost n=2 score=68`、缺口 `noDocument: [RID-CS-2421]`、重复导入 0 条 |

## 9. 研究分析（Galen 侧，已实现）

端点：`research/analyze`（body 可选 `{ "importPending": true }`：先导入新批次再分析）。
实现：`galen-workspace/lib/analysis.js`；只读，不修改 research.json。

输出结构：

```json
{
  "patients": 2,
  "cohorts": [
    { "id": "cohort-followup", "label": "有随访的纵向队列", "size": 2, "criteria": "≥2 次接诊" },
    { "id": "cohort-delta", "label": "可计算前后差值", "size": 2 },
    { "id": "cohort-single", "label": "仅单次评估", "size": 0 }
  ],
  "topics": [{
    "id": "topic-prepost",
    "title": "康复干预前后结局变化的回顾性分析",
    "design": "before-after",
    "n": 2,
    "outcomeKeys": ["posture.headForward"],
    "medianFollowUpDays": 345600000,
    "feasibility": {
      "score": 68,
      "reasons": ["样本 2 例 → 16/40", "≥2 次随访占比 100% → 20/20",
                  "可计算前后差值占比 100% → 20/20", "有文书占比 50% → 12/20"]
    },
    "nextActions": ["可进入统计方案设计"]
  }],
  "gaps": {
    "noFollowUp": [], "partialEvents": [],
    "noDocument": ["RID-CS-2421"], "noOutcomeDelta": [],
    "missingModules": [{ "module": "medvoice", "patients": ["RID-CS-2418", "RID-CS-2421"] }]
  },
  "visitDistribution": { "single": 0, "followUp": 2, "total": 2 },
  "moduleCoverage": { "posture": 2, "rom": 1, "medvoice": 0, "scale": 2, "adams": 0 }
}
```

判据（全部透明可解释）：

| 队列 | 判据 |
|---|---|
| `cohort-followup` | ≥2 次接诊 |
| `cohort-delta` | 同一结局指标（`posture.*` / `rom.side.joint.direction` / `scale.<量表>.*`）出现 ≥2 次 |
| `cohort-single` | 只有 1 次接诊 → 进入缺口（需补随访） |

选题出现条件：`topic-prepost` 需 ≥2 例纵向；`topic-posture-followup` / `topic-rom-followup` 需该结局 ≥2 例有差值；`topic-cross-sectional` 需总患者 ≥3。
可行性评分 = 样本(40) + 随访(20) + 可算差值(20) + 文书(20)，每一项都在 `reasons` 里给出算式。

## 10. 下一阶段（未做）

- 文书模板与字段同源（写文书即结构化数据）；
- 数据质量仪表扩展为"入组可行性"（按病种/随访窗口）；
- Galen 客户端 UI：把 `research/analyze` 渲染成「队列 / 选题卡 / 缺口待办」；
- 传输加密（当前本地文件；跨机需签名/加密）。
