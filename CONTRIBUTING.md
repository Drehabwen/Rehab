# 贡献规则（工作台）

> 适用于 `src/hub/**`、`src/services/**`、`src/plugins/**`。

## 规则 1 · 单一事实来源

同一条业务规则只允许一个实现，放在 `src/hub/` 的领域模块里，组件与页面只调用。

| 规则 | 唯一实现 | 禁止 |
|---|---|---|
| 报告就绪度 | `src/hub/report-readiness.ts` | 各组件自己写 `getXStatus` |
| 报告门禁 | `src/hub/report-gate.ts` | 页面里判断 `completedModules === total` |
| 接诊任务聚合 | `src/hub/workflow.ts` | 页面里 `assessments.filter(...)` |
| 模块必需/可选 | `WORKFLOW_MODULES[].required` | 硬编码"四项都要做" |

新增规则前先检查：是否已有模块能承载？能就扩展它，不要新开一套。

## 规则 2 · 类型即契约

- **禁止** `as unknown as`（Lint 已警告）；确需双层断言必须在该行上方写 `// 理由：…`
- **禁止** 构造残缺对象再断言成实体类型，例如 `{ id, name } as Patient`；
  改用 `onSelectPatientById(id)` 或先确认数据存在再调用
- 优先修类型定义（可空/联合/泛型），不要用断言压报错

## 规则 3 · 性能预算

| 指标 | 预算 | 守护测试 |
|---|---|---|
| 1000 患者聚合 | < 80ms | `perf-visit-tasks.test.ts` |
| 1000 卡渲染节点 | < 5,000 | `perf-render-dashboard.test.tsx` |
| 单文件行数 | ≤ 400（超出拆模块） | ESLint `max-lines` |

新增列表/聚合逻辑时，先写一条对应压测，再合入。

## 规则 4 · 日志与调试

- 生产代码禁用 `console.log`（Lint 警告）；错误用 `console.error` 并带上下文
- 调试代码不得进主干；临时开关用环境变量而不是注释

## 提交前自检

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint src/hub src/services
npx vitest run src/hub/__tests__
```
