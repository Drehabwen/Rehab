# Rehab 项目设计规范

## 1. 概述

本文档定义了 Rehab 康复评估系统的设计规范，包括：
- 颜色系统
- 字体规范
- 间距与圆角
- UI 组件设计
- 项目架构规范
- 代码风格规范

---

## 2. 颜色系统

### 2.1 主色调

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `antey-primary` | `#0D9488` | 主色调（翡翠绿），用于主要按钮、链接和强调 |
| `antey-secondary` | `#0F172A` | 次要色（深石板色），用于背景和深色模式 |
| `antey-accent` | `#3B82F6` | 强调色（蓝色），用于辅助按钮和渐变 |
| `antey-surface` | `#F8FAFC` | 表面色，用于卡片背景 |
| `antey-border` | `#E2E8F0` | 边框色 |

### 2.2 渐变

```css
.gradient-primary {
  background: linear-gradient(to right, #0D9488, #0EA5E9);
}

.text-gradient {
  background: linear-gradient(to bottom right, #0D9488, #3B82F6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### 2.3 Tailwind 配置

```javascript
// tailwind.config.js
colors: {
  antey: {
    primary: "#0D9488",
    secondary: "#0F172A",
    accent: "#3B82F6",
    surface: "#F8FAFC",
    border: "#E2E8F0",
    gradient: {
      start: "#0D9488",
      end: "#3B82F6"
    }
  }
}
```

---

## 3. 字体系统

### 3.1 字体族

```css
:root {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

### 3.2 字体大小

| 类名 | 大小 | 行高 | 用途 |
|------|------|------|------|
| `text-2xs` | 9px | 1.4 | 最小文本（状态、标签） |
| `text-xs` | 10px | 1.4 | 小字（提示、时间戳） |
| `text-sm` | 11px | 1.5 | 辅助文本 |
| `text-base` | 14px | 1.5 | 正文 |
| `text-lg` | 16px | 1.4 | 小标题 |
| `text-xl` | 20px | 1.3 | 标题 |
| `text-2xl` | 24px | 1.3 | 大标题 |
| `text-3xl` | 30px | 1.2 | 超大标题 |
| `text-4xl` | 40px | 1.1 | 主要标题 |

### 3.3 字重规范

- 正常: `font-normal` (400)
- 中等: `font-medium` (500)
- 加粗: `font-bold` (700)
- 黑粗: `font-black` (900)

---

## 4. 间距与布局

### 4.1 间距规范

| 类名 | 像素值 | 用途 |
|------|--------|------|
| `space-x-xs` / `p-xs` | 4px | 最小间距 |
| `space-x-sm` / `p-sm` | 8px | 小间距 |
| `space-x-md` / `p-md` | 16px | 标准间距 |
| `space-x-lg` / `p-lg` | 24px | 大间距 |
| `space-x-xl` / `p-xl` | 32px | 超大间距 |
| `space-x-2xl` / `p-2xl` | 48px | 最大间距 |

### 4.2 圆角规范

| 类名 | 像素值 | 用途 |
|------|--------|------|
| `rounded-sm` | 6px | 小按钮 |
| `rounded-md` | 8px | 标准按钮 |
| `rounded-lg` | 12px | 卡片 |
| `rounded-xl` | 16px | 大卡片 |
| `rounded-2xl` | 24px | 超大组件 |

### 4.3 自定义圆角

```css
:root {
  --radius: 1.5rem; /* 24px */
}

.bento-card {
  border-radius: 2.5rem; /* 40px */
}
```

---

## 5. 通用样式类

### 5.1 玻璃态效果

```css
.glass {
  @apply bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm;
}

.glass-dark {
  @apply bg-slate-900/70 backdrop-blur-xl border border-slate-700/40 shadow-sm;
}

.bento-card {
  @apply bg-white border border-antey-border rounded-[2.5rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1 overflow-hidden relative;
}

.bento-card-glass {
  @apply bg-white/70 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] shadow-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden relative;
}
```

### 5.2 背景效果

```css
.mesh-gradient {
  background-color: #f8fafc;
  background-image: 
    radial-gradient(at 0% 0%, rgba(13, 148, 136, 0.05) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.05) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.05) 0px, transparent 50%),
    radial-gradient(at 0% 100%, rgba(20, 184, 166, 0.05) 0px, transparent 50%);
}
```

### 5.3 动画类

```css
.animate-shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  background-size: 200% 100%;
  animation: shimmer 2s infinite linear;
}

.animate-pulse-subtle {
  animation: pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.98); }
}
```

### 5.4 自定义滚动条

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded-full hover:bg-slate-300 transition-colors;
}
```

---

## 6. UI 组件规范

### 6.1 Button 组件

#### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `primary` / `secondary` / `outline` / `ghost` / `danger` | `primary` | 按钮类型 |
| `size` | `sm` / `md` / `lg` | `md` | 按钮尺寸 |
| `icon` | ReactNode | - | 按钮图标 |
| `iconPosition` | `left` / `right` | `left` | 图标位置 |
| `loading` | boolean | `false` | 加载状态 |

#### 变体样式

```typescript
const variantStyles = {
  primary: 'bg-gradient-to-r from-antey-primary to-teal-600 text-white hover:shadow-lg hover:shadow-antey-primary/20',
  secondary: 'bg-white border border-slate-200 text-slate-700 hover:border-antey-primary/30 hover:bg-slate-50',
  outline: 'bg-transparent border border-slate-300 text-slate-700 hover:border-antey-primary hover:text-antey-primary',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};
```

#### 尺寸样式

```typescript
const sizeStyles = {
  sm: 'px-3 py-1.5 text-[10px] gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-xs gap-2 rounded-xl',
  lg: 'px-6 py-3 text-sm gap-2.5 rounded-2xl',
};
```

### 6.2 IconButton 组件

```typescript
const variantStyles = {
  default: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
  primary: 'bg-antey-primary/10 hover:bg-antey-primary/20 text-antey-primary',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-500',
};

const sizeStyles = {
  sm: 'p-1.5 rounded-lg',
  md: 'p-2.5 rounded-xl',
  lg: 'p-3 rounded-2xl',
};
```

### 6.3 Card 组件

```typescript
export const Card = ({ children, className, glass = false, ...props }: CardProps) => (
  <div 
    className={cn(
      glass ? 'bento-card-glass' : 'bento-card',
      className
    )} 
    {...props}
  >
    {children}
  </div>
);
```

---

## 7. 项目架构规范

### 7.1 目录结构

```
src/
├── assets/              # 静态资源
├── components/          # 通用组件
│   ├── shared/          # 共享组件
│   ├── ui/              # UI 基类组件
│   └── __tests__/       # 组件测试
├── hooks/               # React Hooks
│   └── __tests__/       # Hook 测试
├── store/               # Zustand 状态管理
├── plugins/             # 插件模块
│   ├── vision3/         # 视觉插件
│   │   ├── components/  # 插件组件
│   │   ├── hooks/       # 插件 Hooks
│   │   ├── services/    # 插件服务
│   │   ├── store/       # 插件状态
│   │   └── __tests__/   # 插件测试
│   └── medvoice/        # 语音插件
├── hub/                 # 核心功能模块
├── pages/               # 页面
├── lib/                 # 工具库
├── types/               # TypeScript 类型
├── utils/               # 工具函数
├── App.tsx              # 根组件
├── main.tsx             # 入口文件
└── index.css            # 全局样式
```

### 7.2 命名规范

#### 文件命名
- 组件文件：`PascalCase.tsx` (如 `Vision3Plugin.tsx`)
- Hook 文件：`camelCase.ts` (如 `usePostureAnalysis.ts`)
- 工具文件：`camelCase.ts` (如 `vision3-utils.ts`)
- 测试文件：`*.test.tsx` / `*.test.ts`

#### 变量与函数
- 组件和类型：`PascalCase`
- 变量和函数：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- 私有变量：`_camelCase`

#### 目录命名
- 目录名：`kebab-case` 或小写 (如 `vision3`, `medvoice`)

### 7.3 组件结构规范

```typescript
import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  // Props 定义
}

export const ComponentName: React.FC<ComponentProps> = ({
  prop1,
  prop2,
  className,
  ...props
}) => {
  // 状态、逻辑
  
  return (
    <div className={cn("base-class", className)} {...props}>
      {/* 内容 */}
    </div>
  );
};
```

### 7.4 Hook 结构规范

```typescript
import { useState, useCallback, useEffect } from 'react';

interface UseHookProps {
  // Props 定义
}

export const useHookName = ({ prop1, prop2 }: UseHookProps) => {
  const [state, setState] = useState();
  
  const callback = useCallback(() => {
    // 回调逻辑
  }, []);

  useEffect(() => {
    // 副作用
  }, []);

  return {
    state,
    callback
  };
};
```

---

## 8. 代码风格规范

### 8.1 工具函数

#### cn() 类名合并

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**用途**：合并 Tailwind 类名，自动去重。

### 8.2 TypeScript 类型

- 始终定义明确的类型，避免 `any`
- 使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型、工具类型等

```typescript
// Good
interface User {
  id: string;
  name: string;
}

// Good
type Status = 'idle' | 'loading' | 'success' | 'error';

// Avoid
const user: any = { id: '1', name: 'Test' };
```

### 8.3 导入顺序

1. React 导入
2. 第三方库导入
3. 内部模块导入（从 @/ 开始）
4. 本地导入（相对路径）
5. CSS 导入

```typescript
import React, { useState, useEffect } from 'react';
import { Button } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useUserStore } from '@/store/useUserStore';

import { MyComponent } from './MyComponent';
import './styles.css';
```

---

## 9. 状态管理规范

### 9.1 Zustand Store 结构

```typescript
import { create } from 'zustand';

interface State {
  // 状态定义
}

interface Actions {
  // Action 定义
}

export const useStore = create<State & Actions>((set, get) => ({
  // 初始状态
  
  // Actions
  action1: () => set({ /* state */ }),
  action2: () => {
    const current = get();
    set({ /* state */ });
  }
}));
```

### 9.2 状态使用原则

- 局部状态用 `useState`
- 跨组件共享状态用 Zustand
- 异步逻辑在 Hooks 中处理

---

## 10. 测试规范

### 10.1 测试文件位置

```
__tests__/
├── Component.test.tsx       # 组件测试
├── useHook.test.ts          # Hook 测试
└── utils.test.ts            # 工具函数测试
```

### 10.2 测试框架

- **单元测试**: Vitest
- **组件测试**: React Testing Library
- **断言库**: @testing-library/jest-dom

---

## 11. 性能最佳实践

### 11.1 React 优化

- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存函数
- 合理使用 `React.memo` 避免不必要的重渲染
- 列表渲染使用 `key`

### 11.2 Tailwind 优化

- 避免使用动态类名拼接（如 `bg-${color}`）
- 使用 `cn()` 合并类名时自动去重
- 常用组合抽取为自定义工具类

---

## 12. Git 提交规范

```
<type>(<scope>): <subject>

<type> 类型:
- feat: 新功能
- fix: 修复
- refactor: 重构
- style: 样式调整
- test: 测试
- docs: 文档
- chore: 构建/工具

示例:
- feat(vision3): 添加评估范围选择
- fix(ui): 修复按钮点击事件
- refactor: 拆分大型组件
```

---

## 附录

### A. 相关依赖

| 库 | 用途 |
|----|------|
| `react` | UI 框架 |
| `tailwindcss` | 样式框架 |
| `clsx` + `tailwind-merge` | 类名合并 |
| `zustand` | 状态管理 |
| `lucide-react` | 图标库 |
| `@mediapipe/holistic` | 人体姿态检测 |
| `vitest` | 测试框架 |
| `vite` | 构建工具 |

### B. 编辑器配置

推荐使用 VSCode 配合以下插件：
- Tailwind CSS IntelliSense
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
