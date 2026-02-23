# Rehab 项目 UI 设计规范

> 统一规范：采用 NexusHub 设计风格

---

## 🎨 核心设计系统

### 1. 颜色系统

| 变量 | 值 | 用途 |
|------|-----|------|
| `--antey-primary` | `#0d9488` (teal-600) | 主色调，按钮、强调 |
| `--antey-accent` | `#3b82f6` (blue-500) | 辅助色，渐变 |
| `--antey-border` | `rgba(203, 213, 225, 0.5)` | 边框 |
| `--background` | `#f8fafc` | 页面背景 |

### 2. 圆角规范

| 场景 | 值 |
|------|-----|
| 大卡片 | `rounded-[2.5rem]` |
| 按钮 | `rounded-2xl` |
| 输入框 | `rounded-2xl` |
| 小部件 | `rounded-xl` |

### 3. 字重规范

| 类型 | 值 |
|------|-----|
| 标题 | `font-black` |
| 按钮文字 | `font-black` |
| 标签 | `font-black` |
| 正文 | `font-medium` |

### 4. 阴影规范

| 类型 | 值 |
|------|-----|
| 卡片悬停 | `hover:shadow-2xl` |
| 按钮 | `hover:shadow-lg` |
| 主色调 | `shadow-antey-primary/20` |

---

## 🧩 核心 CSS 工具类

### 背景
```css
.mesh-gradient      /* 网格渐变背景 */
.glass              /* 玻璃态白色 */
.glass-dark         /* 玻璃态深色 */
```

### 卡片
```css
.bento-card         /* 标准卡片 */
.bento-card-glass   /* 玻璃态卡片 */
.card-premium       /* 高级卡片 */
```

### 文本
```css
.text-gradient      /* 渐变色文字 */
```

---

## 📐 组件规范

### 按钮
```tsx
<button className="px-8 py-4 bg-gradient-to-r from-antey-primary to-teal-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:shadow-lg hover:shadow-antey-primary/30 transition-all" />
```

### 输入框
```tsx
<input className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium focus:ring-4 focus:ring-antey-primary/10 focus:border-antey-primary/30" />
```

### 模态框
```tsx
<div className="relative bg-white rounded-[3rem] shadow-2xl border border-slate-200" />
```

### 导航项
```tsx
<button className="px-4 py-4 rounded-2xl bg-white/10 text-white shadow-xl ring-1 ring-white/10" />
```

---

## 🗂️ 项目结构

```
src/
├── hub/                  # NexusHub 主界面
│   ├── NexusHub.tsx      # 主入口
│   └── components/       # 组件
├── plugins/              # 插件
│   ├── vision3/          # 体态分析
│   └── medvoice/         # 语音助手
├── store/                # 状态管理
├── lib/                  # 工具函数
└── types/                # 类型定义

src/archive/              # 已废弃旧组件
```

---

## ⚠️ 已废弃组件

以下旧组件已归档到 `src/archive/`，不再使用：
- `pages/Home.tsx`
- `components/Navbar.tsx`
- `components/Layout.tsx`

---

*更新日期: 2026-02-16*
