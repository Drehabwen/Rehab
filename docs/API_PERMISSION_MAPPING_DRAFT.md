# Rehab 接口权限映射初稿

本文档是 `ROLE_PERMISSION_EXECUTION_SPEC` 的接口落地补充，用于后端逐条接入 `required_permission` 与 `scope_strategy`。

适用范围：`backend/main.py` 当前已暴露的 HTTP 与 WebSocket 接口。

## 1. 字段约定

| 字段 | 含义 |
|---|---|
| `required_permission` | 接口调用所需权限键 |
| `scope_strategy` | 数据范围策略：`self_from_token` / `team_from_token` / `org_admin_only` |
| `audit_required` | 是否必须写审计日志 |
| `sideline_allowed` | 是否允许在场边移动端调用 |

## 2. HTTP 接口映射

| 方法 | 路径 | 业务模块 | required_permission | scope_strategy | audit_required | sideline_allowed | 备注 |
|---|---|---|---|---|---|---|---|
| GET | `/health` | system | `settings.read.org` | `org_admin_only` | 否 | 否 | 仅运维与管理员使用 |
| GET | `/video_feed` | camera | `assessment.create.team` | `team_from_token` | 否 | 是 | 评估预览流 |
| POST | `/camera/start` | camera | `assessment.create.team` | `team_from_token` | 是 | 是 | 设备启动应留痕 |
| POST | `/camera/stop` | camera | `assessment.create.team` | `team_from_token` | 是 | 是 | 设备关闭应留痕 |
| POST | `/api/treatment-plan/generate` | plan | `plan.publish.team` | `team_from_token` | 是 | 否 | 主教练及以上 |
| POST | `/api/treatment-plan/generate/stream` | plan | `plan.publish.team` | `team_from_token` | 是 | 否 | 同上，流式版本 |
| POST | `/api/treatment-plan/generate-from-session-report` | plan | `plan.publish.team` | `team_from_token` | 是 | 否 | 从会话报告生成 |
| POST | `/api/treatment-plan/generate-from-session-report/stream` | plan | `plan.publish.team` | `team_from_token` | 是 | 否 | 同上，流式版本 |
| POST | `/api/session-report/generate` | report | `report.create.team` | `team_from_token` | 是 | 否 | 助教仅草稿，主教练可继续定稿 |

## 3. WebSocket 接口映射

WebSocket 主入口：`/ws/analyze`。  
建议在连接建立后完成一次角色鉴权，并按消息类型做二次权限判断。

| ws type | 能力 | required_permission | scope_strategy | audit_required | sideline_allowed | 备注 |
|---|---|---|---|---|---|---|
| `POSTURE_SYNC` | 实时姿态分析 | `assessment.create.team` | `team_from_token` | 否 | 是 | 场边核心能力 |
| `JOINT_ANALYSIS` | 关节角度测量 | `assessment.create.team` | `team_from_token` | 否 | 是 | 场边核心能力 |
| `POSTURE_BATCH_ANALYSIS` | 批量姿态报告 | `assessment.submit.team` | `team_from_token` | 是 | 是 | 提交动作建议留痕 |
| `POSTURE_STEPPED_ANALYSIS` | 多视角分步评估 | `assessment.submit.team` | `team_from_token` | 是 | 是 | 提交动作建议留痕 |
| `POSTURE_DEEP_ANALYSIS` | 深度报告流输出 | `report.create.team` | `team_from_token` | 是 | 否 | 默认仅教练端启用 |

## 4. 角色到接口调用边界

| 角色 | 可调用接口范围 |
|---|---|
| `super_head_coach` | 全部 |
| `head_coach` | 除 `settings` 与 `user_role` 外全部业务接口 |
| `assistant_medic` | camera + ws 评估 + report 草稿生成，不可计划发布 |
| `athlete_readonly` | 不可调用写接口；仅允许个人只读查询接口（待补充） |

## 5. 后端接入步骤

1. 在认证中间层解析 `user_id`、`role`、`team_id`。  
2. 在每个接口声明 `required_permission`。  
3. 在数据层统一注入 `scope_strategy` 过滤条件。  
4. 对 `audit_required=是` 的接口统一写审计日志。  
5. 为每个接口补一条越权测试（403）。

## 6. 验收清单

- 每个接口可追溯到权限键。  
- 无权限用户在后端被拒绝（不是前端静默拦截）。  
- 跨队访问全部被拒绝。  
- 高危动作审计字段完整（操作者、队伍、时间、目标对象、结果）。  
- 与 `ROLE_PERMISSION_EXECUTION_SPEC.md` 保持一致版本。  
