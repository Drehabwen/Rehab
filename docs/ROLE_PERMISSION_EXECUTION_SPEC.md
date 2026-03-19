# Rehab 角色权限与执行规范

本文档用于约束 `Rehab-V3.1` 在单平台双终端（教练端 + 场边移动端）下的角色权限、职责边界与开发落地标准，避免需求迭代跑偏。

如果本文档与代码冲突，以后端权限校验实现为准；前端仅做可见性控制，不作为安全边界。

## 1. 目标与范围

- 目标：统一角色能力、接口权限、页面可见性与团队协作边界。
- 范围：教练端（PC）、场边移动端（手机/平板网页）、后端接口鉴权。
- 不在范围：跨系统同步、多平台并行主数据源。

## 2. 角色定义

| 角色代码 | 中文角色 | 职责摘要 | 主要终端 |
|---|---|---|---|
| `super_head_coach` | 总教练 | 全队策略、风险总览、审批与监督 | PC |
| `head_coach` | 主教练 | 日常评估执行、复测安排、训练调整 | PC + 场边移动端 |
| `assistant_medic` | 助教/队医 | 采集执行、补录、现场异常标注 | 场边移动端 |
| `athlete_readonly` | 队员只读 | 查看个人简报与任务反馈 | 移动端只读 |

## 3. 权限命名规范

- 权限格式：`resource.action.scope`
- `resource`：业务资源（如 `assessment`、`report`）
- `action`：动作（如 `read`、`create`、`approve`）
- `scope`：数据范围（`self`、`team`、`org`）

示例：

- `assessment.create.team`
- `report.export.team`
- `dashboard.read.org`

## 4. 资源动作字典

| resource | actions |
|---|---|
| `athlete` | `read/create/update/archive` |
| `assessment` | `read/create/update/delete/submit/retest` |
| `report` | `read/create/update/approve/export/delete` |
| `plan` | `read/create/update/publish/close` |
| `dashboard` | `read` |
| `settings` | `read/update` |
| `user_role` | `read/assign/revoke` |
| `audit_log` | `read/export` |

## 5. RBAC 主权限矩阵

说明：

- `✅` 允许
- `❌` 禁止
- `△` 条件允许（见第 6 节）

| 权限项 | 总教练 | 主教练 | 助教/队医 | 队员只读 |
|---|---:|---:|---:|---:|
| `dashboard.read.org` | ✅ | ❌ | ❌ | ❌ |
| `dashboard.read.team` | ✅ | ✅ | ✅ | ❌ |
| `athlete.read.team` | ✅ | ✅ | ✅ | ❌ |
| `athlete.create.team` | ✅ | ✅ | △ | ❌ |
| `athlete.update.team` | ✅ | ✅ | △ | ❌ |
| `assessment.create.team` | ✅ | ✅ | ✅ | ❌ |
| `assessment.submit.team` | ✅ | ✅ | ✅ | ❌ |
| `assessment.retest.team` | ✅ | ✅ | ✅ | ❌ |
| `assessment.update.team` | ✅ | ✅ | △ | ❌ |
| `assessment.delete.team` | ✅ | △ | ❌ | ❌ |
| `assessment.read.self` | ✅ | ✅ | ✅ | ✅ |
| `report.create.team` | ✅ | ✅ | △ | ❌ |
| `report.update.team` | ✅ | ✅ | ❌ | ❌ |
| `report.approve.team` | ✅ | ❌ | ❌ | ❌ |
| `report.export.team` | ✅ | △ | ❌ | ❌ |
| `plan.publish.team` | ✅ | ✅ | ❌ | ❌ |
| `settings.update.org` | ✅ | ❌ | ❌ | ❌ |
| `user_role.assign.org` | ✅ | ❌ | ❌ | ❌ |
| `audit_log.read.org` | ✅ | △ | ❌ | ❌ |

## 6. 条件权限规则（△）

| 权限项 | 限制规则 |
|---|---|
| `athlete.create.team`（助教/队医） | 创建后为待审核状态，需主教练确认生效 |
| `athlete.update.team`（助教/队医） | 仅可修改非核心字段（备注、身高体重、伤痛记录） |
| `assessment.update.team`（助教/队医） | 仅可补录 RPE/疼痛，不可改原始评分与关键点结果 |
| `assessment.delete.team`（主教练） | 仅 24 小时内软删除，必须写入审计日志 |
| `report.create.team`（助教/队医） | 仅可创建草稿，不可定稿 |
| `report.export.team`（主教练） | 仅可导出本队数据，不可导出全机构 |
| `audit_log.read.org`（主教练） | 仅可读取本队审计日志 |

## 7. 场景职责（RACI）

| 流程环节 | 总教练 | 主教练 | 助教/队医 | 队员 |
|---|---|---|---|---|
| 日计划制定 | A | R | C | I |
| 场边采集执行 | I | A/R | R | I |
| 异常标注 | C | A | R | I |
| 结果提交 | I | A/R | R | I |
| 报告定稿 | A | R | C | I |
| 训练调整发布 | A | R | C | I |
| 个人反馈查看 | I | C | C | R |

说明：`R` 执行、`A` 最终负责、`C` 协作、`I` 知会。

## 8. 页面能力边界

### 8.1 教练端（PC）

- 保留：全量仪表盘、评估工作台、报告中心、数据中心、计划管理、角色管理。
- 受控：高危操作（导出、删除、审批）必须鉴权 + 审计。

### 8.2 场边移动端

- 保留：队员选择、快速评估、当次结果、提交确认、个人简报回看。
- 隐藏：全队趋势、复杂对比、系统设置、角色管理、全量导出。

## 9. 接口权限映射模板

后端每个接口都必须标注权限需求与数据范围策略，按下表维护：

| 模块 | 方法 | 路径 | required_permission | scope_strategy | 审计 |
|---|---|---|---|---|---|
| assessment | POST | `/api/...` | `assessment.create.team` | `team_from_token` | 是 |
| report | POST | `/api/...` | `report.create.team` | `team_from_token` | 是 |
| report | POST | `/api/.../approve` | `report.approve.team` | `team_from_token` | 是 |

`scope_strategy` 约定值：

- `self_from_token`
- `team_from_token`
- `org_admin_only`

## 10. 开发防跑偏规则

- 后端先行：先接权限校验，再开放前端入口。
- 前端最小暴露：无权限不渲染入口，不发送请求。
- 数据范围强制：任何查询必须附带 scope 过滤，不允许全表透出。
- 高危留痕：审批、删除、导出、角色变更全部审计。
- 变更评审门槛：涉及权限矩阵的改动必须同步更新本文档和接口映射。

## 11. Definition of Done（权限相关）

需求完成必须同时满足：

1. 接口已有 `required_permission`；
2. 数据范围策略已实现并验证；
3. 前端入口按角色正确裁剪；
4. 审计日志覆盖高危动作；
5. 权限单测与越权测试通过；
6. 本文档和接口映射同步更新。

## 12. 版本记录

- `v1.0`：建立单平台双终端下的角色权限与执行规范基线。
