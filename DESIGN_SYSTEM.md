# 项目设计规范

## 1. 概述

本文档定义了项目的统一设计规范，所有组件必须使用这些规范，**禁止硬编码 Tailwind 类名**。

## 2. 样式使用规则

### 2.1 核心原则

✅ **正确做法**：
```typescript
import { COLORS, SIZES } from '@/constants/uiStyles';

<div className={`${COLORS.neutral.light.bg} ${SIZES.radius.lg}`}>
```

❌ **错误做法**：
```typescript
<div className="bg-white rounded-lg">  // 硬编码样式
```

### 2.2 样式常量结构

#### COLORS 颜色系统

```typescript
COLORS = {
  primary: {     // 主色调（蓝色）
    blue, blueLight, blueHover, blueText, blueBg, blueBorder, blueShadow
  },
  secondary: {   // 次要色（紫色）
    purple, purpleLight, purpleHover, purpleText, purpleBg, purpleBorder, purpleShadow
  },
  success: {     // 成功色（翡翠绿）
    emerald, emeraldLight, emeraldHover, emeraldText, emeraldBg, emeraldBorder, emeraldShadow
  },
  info: {        // 信息色（青色）
    cyan, cyanLight, cyanText, cyanBg, cyanBorder
  },
  warning: {     // 警告色（琥珀色）
    amber, amberText, amberBg, amberBorder
  },
  danger: {      // 危险色（玫瑰红）
    rose, roseText, roseBg, roseBorder
  },
  neutral: {     // 中性色
    // 深色主题（用于暗色界面）
    white, whiteText, whiteBg, whiteBorder, slate, slateText, slateBg, slateBorder, ...
    // 浅色主题（用于明亮区域如报告）
    light: {
      bg, bgSoft, text, textSoft, textMuted, textLight,
      border, borderSoft, hover, selected,
      buttonDisabled, buttonInactive, indicator, indicatorActive
    }
  },
  antey: {       // 品牌色
    primary, primaryText, primaryBg, primaryBorder, primaryShadow,
    accent, accentText, accentBg, accentBorder, accentShadow
  }
}
```

#### SIZES 尺寸系统

```typescript
SIZES = {
  gap: {      // 间距
    xs, sm, md, lg, xl, xxl
  },
  padding: {  // 内边距
    xs, sm, md, lg, xl, xxl
  },
  radius: {   // 圆角
    sm, md, lg, xl, full, pill, pillLg, pillXl
  },
  font: {     // 字体大小
    xs, sm, md, lg, xl, xxl, xxxl, xxxxl, xxxxxl, xxxxxxl
  },
  size: {     // 元素尺寸
    xs, sm, md, lg, xl, xxl, xxxl
  }
}
```

#### ANIMATIONS 动画系统

```typescript
ANIMATIONS = {
  fadeIn, slideInTop, slideInRight, slideInLeft, slideInBottom,
  zoomIn, pulse, pulseSubtle, ping, spin, spinSlow, scan
}
```

#### TRANSITIONS 过渡效果

```typescript
TRANSITIONS = {
  default,  // duration-200
  slow,     // duration-300
  medium    // duration-500
}
```

#### SHADOWS 阴影系统

```typescript
SHADOWS = {
  sm, md, lg, inner
}
```

#### BACKDROP 背景模糊

```typescript
BACKDROP = {
  sm, md, lg
}
```

## 3. 使用场景

### 3.1 深色主题区域

```typescript
import { COLORS, SIZES } from '@/constants/uiStyles';

// 主容器
<div className={`${COLORS.neutral.slateBg} ${SIZES.radius.lg}`}>

// 按钮（非激活状态）
<button className={COLORS.neutral.light.buttonInactive}>

// 文本
<p className={COLORS.neutral.slateText}>
```

### 3.2 浅色主题区域（报告、卡片）

```typescript
import { COLORS, SIZES } from '@/constants/uiStyles';

// 报告容器
<div className={`${COLORS.neutral.light.bg} ${SIZES.radius.xl} ${COLORS.neutral.light.border}`}>

// 标题
<h3 className={COLORS.neutral.light.text}>

// 副标题
<p className={COLORS.neutral.light.textSoft}>

// 弱化文本
<span className={COLORS.neutral.light.textMuted}>

// 分隔线
<div className={COLORS.neutral.light.borderSoft}>
```

### 3.3 按钮状态

```typescript
// 主按钮（紫色）
<button className={`${COLORS.secondary.purple} text-white ${COLORS.secondary.purpleShadow}`}>

// 禁用按钮
<button disabled className={COLORS.neutral.light.buttonDisabled}>

// 非激活按钮
<button className={COLORS.neutral.light.buttonInactive}>
```

### 3.4 状态指示器

```typescript
// 激活状态
<div className={`${COLORS.primary.blueLight} ${COLORS.neutral.light.indicatorActive}`} />

// 非激活状态
<div className={COLORS.neutral.light.indicator} />
```

## 4. 样式扩展

如需添加新的样式类，请在 `uiStyles.ts` 中统一添加，遵循以下命名规范：

```typescript
// 新增样式示例
neutral: {
  light: {
    // 添加新的浅色主题样式
    newStyle: 'bg-slate-50 text-slate-900',
  }
}
```

## 5. 组件样式指南

### 5.1 面板组件

```typescript
// 浅色面板
<div className={`${COLORS.neutral.light.bg} ${SIZES.radius.lg} ${COLORS.neutral.light.border}`}>

// 深色面板
<div className={`${COLORS.neutral.slateBg} ${SIZES.radius.md} ${COLORS.neutral.slateBorder}`}>
```

### 5.2 文本层级

```typescript
// 主标题
<h1 className={COLORS.neutral.light.text}>

// 副标题
<h2 className={COLORS.neutral.light.textSoft}>

// 正文
<p className={COLORS.neutral.light.text}>

// 辅助文本
<span className={COLORS.neutral.light.textMuted}>
```

### 5.3 边框和分隔线

```typescript
// 主边框
<div className={COLORS.neutral.light.border}>

// 细分隔线
<div className={COLORS.neutral.light.borderSoft}>
```

## 6. 检查清单

在提交代码前，请检查：

- [ ] 是否使用了 `COLORS`、`SIZES` 等常量，而不是硬编码 Tailwind 类
- [ ] 是否正确选择了深色/浅色主题
- [ ] 是否使用了统一的间距和圆角
- [ ] 是否遵循了组件样式指南
- [ ] 新增样式是否在 `uiStyles.ts` 中定义

## 7. 违规示例

❌ **错误代码**：
```typescript
<div className="bg-white rounded-lg border border-slate-200">
  <h3 className="text-slate-900 font-semibold">
  <p className="text-slate-500">
```

✅ **正确代码**：
```typescript
import { COLORS, SIZES } from '@/constants/uiStyles';

<div className={`${COLORS.neutral.light.bg} ${SIZES.radius.lg} ${COLORS.neutral.light.border}`}>
  <h3 className={`${COLORS.neutral.light.text} font-semibold`}>
  <p className={COLORS.neutral.light.textMuted}>
```

## 8. 迁移指南

如果现有代码包含硬编码样式，请按以下步骤迁移：

1. 识别硬编码的 Tailwind 类（如 `bg-white`, `text-slate-900`）
2. 查找对应的 `COLORS` 或 `SIZES` 常量
3. 替换为模板字符串：`` `${CONSTANT.property}` ``
4. 多个类名使用空格连接：`` `${CLASS1} ${CLASS2}` ``
5. 条件样式使用三元运算符

## 9. 常见问题

**Q: 为什么不能直接使用 Tailwind 类？**
A: 统一使用常量可以：
- 确保设计一致性
- 便于主题切换
- 方便维护和修改
- 减少样式冗余

**Q: 找不到对应的常量怎么办？**
A: 在 `uiStyles.ts` 中添加新的样式类，遵循现有命名规范。

**Q: 动态样式怎么处理？**
A: 使用模板字符串和条件表达式：
```typescript
className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
```
