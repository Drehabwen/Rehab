# RehabMain 设计系统（实际在用的版本）

> 2026-10-19 重写。此前两份文档（旧 `DESIGN_SYSTEM.md`、`docs/UI_DESIGN_GUIDE.md`）与代码脱节，已合并到此。
> Token 定义在 [`src/index.css`](src/index.css) 的 `:root`；组件在 [`src/components/ui`](src/components/ui)。

---

## 1. 原则

1. **颜色/圆角/阴影只从 token 取**，不写死 hex；新代码用语义类（`bg-surface-card`、`text-ink-muted`、`shadow-elev-1`）
2. **先复用组件，再写样式**：`Button / Card / StatCard / EmptyState / Tag`，不要手写第 4 种卡片
3. **一个页面只有一个主操作**（primary 按钮），其余用 secondary/ghost
4. **空态必须给下一步**（`EmptyState` 的 actions），不要只写"暂无数据"
5. 旧变量（`--n900`、`.bento-card`、`--antey-*`）保留兼容，但**新代码不再使用**

## 2. 颜色 token

| 语义 | Token / 类 | 值 | 用途 |
|---|---|---|---|
| 品牌主色 | `--brand` / `text-brand` `bg-brand` | `#0f9b8e` | 主按钮、激活态、品牌元素 |
| 品牌深 | `--brand-strong` | `#0a8278` | hover |
| 品牌浅底 | `--brand-soft` / `bg-brand-soft` | `#def7f3` | 浅色强调底 |
| 页面背景 | `--surface-page` / `bg-surface-page` | `#f8fafc` | 内容区底色 |
| 卡片底 | `--surface-card` / `bg-surface-card` | `#ffffff` | 卡片 |
| 下沉底 | `--surface-sunken` / `bg-surface-sunken` | `#f1f5f9` | 空态图标块、表头 |
| 主文字 | `--text-strong` / `text-ink-strong` | `#0f172a` | 标题、数值 |
| 正文 | `--text-body` / `text-ink-body` | `#334155` | 正文 |
| 次要 | `--text-muted` / `text-ink-muted` | `#64748b` | 说明、标签 |
| 弱化 | `--text-faint` / `text-ink-faint` | `#94a3b8` | 占位、时间 |
| 分隔线 | `--line-subtle` / `border-line-subtle` | `#e2e8f0` | 卡片边框、分割 |
| 强边框 | `--line-strong` / `border-line-strong` | `#cbd5e1` | hover、分组框 |
| 信息 | `--state-info` | `#2563eb` | 进行中、提示 |
| 待办 | `--state-warn` | `#b45309` | 待处理、待确认 |
| 危险 | `--state-danger` | `#b91c1c` | 失败、删除、风险 |
| 完成 | `--state-success` | `#15803d` | 完成、通过 |
| 侧栏 | `--surface-inverse` | `#0f172a` | 深色导航壳 |

**语义色固定映射**：蓝=信息/进行中，琥珀=待办/需注意，红=危险/失败，绿=完成。**不要**给同一含义换颜色（例如主操作永远是 brand，不要用 emerald 替代）。

## 3. 字体与字号

字体栈：`"PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Segoe UI", sans-serif`（不引品牌字体）。

| 用途 | 类 | 实际 px |
|---|---|---|
| 页面标题 | `text-[28px] font-semibold` | 28 |
| 卡片标题 | `text-lg font-semibold` | 16 |
| 统计数值 | `text-[26px] font-semibold tabular-nums` | 26 |
| 正文 | `text-sm` | 11（注意：Tailwind scale 被改写，`text-sm` 是 11px） |
| 辅助 | `text-xs` | 10 |
| 微型标签 | `text-[11px]` | 11 |

> ⚠️ Tailwind 的 `fontSize` 在本项目被改写过（xs=10 / sm=11 / base=14）。写新 UI 时**优先用上表的组合**，不要用 `text-[9px]` 这类任意值。

## 4. 间距 / 圆角 / 阴影 / 动效

| 维度 | Token | 值 |
|---|---|---|
| 间距 | `--space-8/12/16/20/24/32/40/48` | 8–48 |
| 圆角 | `--radius-xs/sm/md/lg/xl` | 8 / 12 / 20 / 24 / 28 |
| 卡片圆角 | `rounded-token-md` | 20 |
| 小元素圆角 | `rounded-token-sm` | 12 |
| 阴影 1 | `--elev-1` / `shadow-elev-1` | 卡片 |
| 阴影 2 | `--elev-2` / `shadow-elev-2` | hover / 浮层 |
| 阴影 3 | `--elev-3` / `shadow-elev-3` | 弹层 |
| 动效 | `--dur-fast/base/slow` + `--ease-out` | 120/200/300ms |

## 5. 组件

| 组件 | 用法 | 备注 |
|---|---|---|
| `Button` | `variant`: primary / secondary / tertiary / ghost / outline / danger；`size`: sm / md / lg | 主操作每屏一个 |
| `Card` | `variant`: default / elevated / outlined；`padding`: none / sm / md / lg | 不再直接用 `.bento-card` |
| `StatCard` | `value/label/icon/tone/hint/onClick` | 所有统计卡统一用它 |
| `EmptyState` | `icon/title/description/actions` | 空态必须给下一步 |
| `Tag` / `StatusTag` | 状态标签 | 语义色固定 |
| `PageHeader` | `eyebrow/title/description/summary/actions` | 每页最多 3 个动作 |

## 6. 页面骨架

```tsx
<div className="rehab-page custom-scrollbar">
  <div className="rehab-page-inner space-y-5">
    <PageHeader eyebrow="患者 → 接诊 → 评估 → 报告" title="…" description="…"
      summary={<span className="tag">…</span>}
      actions={<Button variant="primary" icon={<Plus size={16} />}>新建患者</Button>} />

    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard value={n} label="…" icon={Users} tone="brand" />
    </section>

    <Card variant="default" padding="lg"> … </Card>
  </div>
</div>
```

## 7. 迁移状态（2026-10-19）

- ✅ token 层补齐语义别名（surface / ink / line / state / elev / dur / ease）
- ✅ `StatCard`、`EmptyState` 新增；`Card` 改为 token；`StatsCard` 标记 deprecated
- ✅ 已迁移：接诊中心（统计卡 + 空态）、评估中心（统计卡 + 空态）、数据中心（统计卡）
- ⏳ 待迁移：报告中心（筛选区/准备度标签）、患者工具箱、设置弹层、其余手写卡片
- 验收口径：`grep -r "text-\[1[0-9]px\]" src/` 数量应持续下降；新文件不出现硬编码 hex

## 8. 废弃说明

- `docs/UI_DESIGN_GUIDE.md`：已废弃（teal + font-black + `rounded-[2.5rem]` 的旧方案），只保留跳转
- `.bento-card` / `.card-premium` / `--antey-*`：兼容保留，新代码不要用
