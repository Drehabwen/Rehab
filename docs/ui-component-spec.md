# UI 组件开发规范

## 📋 目录

- [1. 组件设计原则](#1-组件设计原则)
- [2. 组件结构规范](#2-组件结构规范)
- [3. 样式规范](#3-样式规范)
- [4. 布局规范](#4-布局规范)
- [5. 交互规范](#5-交互规范)
- [6. 响应式设计](#6-响应式设计)
- [7. 无障碍访问](#7-无障碍访问)
- [8. 性能优化](#8-性能优化)
- [9. 测试规范](#9-测试规范)

---

## 1. 组件设计原则

### 1.1 单一职责原则

```typescript
// ✅ 正确：每个组件只负责一个功能
function UserAvatar({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="avatar" />;
}

function UserName({ name }: { name: string }) {
  return <span className="name">{name}</span>;
}

function UserProfile({ user }: { user: User }) {
  return (
    <div className="profile">
      <UserAvatar src={user.avatar} alt={user.name} />
      <UserName name={user.name} />
    </div>
  );
}

// ❌ 错误：一个组件负责多个功能
function UserProfile({ user }: { user: User }) {
  return (
    <div className="profile">
      <img src={user.avatar} alt={user.name} className="avatar" />
      <span className="name">{user.name}</span>
      <span className="email">{user.email}</span>
      <button onClick={() => editUser(user)}>编辑</button>
      <button onClick={() => deleteUser(user.id)}>删除</button>
    </div>
  );
}
```

### 1.2 组件复用性

```typescript
// ✅ 正确：通过 Props 实现复用
function Button({ 
  variant = 'primary', 
  size = 'md', 
  children,
  onClick 
}: { 
  variant?: 'primary' | 'secondary'; 
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600',
    secondary: 'bg-gray-500 hover:bg-gray-600',
  };
  
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button 
      onClick={onClick}
      className={cn('rounded-lg', variants[variant], sizes[size])}
    >
      {children}
    </button>
  );
}

// 使用
<Button variant="primary" size="md" onClick={handleClick}>
  点击我
</Button>

// ❌ 错误：硬编码样式，无法复用
function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg">
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-lg">
      {children}
    </button>
  );
}
```

### 1.3 组件组合性

```typescript
// ✅ 正确：通过组合实现复杂功能
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('card', className)}>{children}</div>;
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>;
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>;
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="card-footer">{children}</div>;
}

// 使用
<Card>
  <CardHeader>标题</CardHeader>
  <CardBody>内容</CardBody>
  <CardFooter>底部</CardFooter>
</Card>

// ❌ 错误：通过 Props 传递所有内容
function Card({ 
  header, 
  body, 
  footer 
}: { 
  header: React.ReactNode;
  body: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header">{header}</div>
      <div className="card-body">{body}</div>
      <div className="card-footer">{footer}</div>
    </div>
  );
}
```

---

## 2. 组件结构规范

### 2.1 基本结构

```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IconName } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS, SIZES, ANIMATIONS, TRANSITIONS } from '@/constants/uiStyles';

interface ComponentProps {
  requiredProp: string;
  optionalProp?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export const ComponentName: React.FC<ComponentProps> = ({ 
  requiredProp, 
  optionalProp,
  onAction,
  children 
}) => {
  // 1. Hooks
  const [state, setState] = useState(initialValue);
  const ref = useRef<HTMLDivElement>(null);
  
  // 2. Effects
  useEffect(() => {
    // 副作用
    return () => {
      // 清理
    };
  }, [dependencies]);
  
  // 3. Computed Values
  const computedValue = useMemo(() => {
    return expensiveCalculation(state);
  }, [state]);
  
  // 4. Event Handlers
  const handleClick = useCallback(() => {
    if (onAction) {
      onAction();
    }
  }, [onAction]);
  
  // 5. Render
  return (
    <div 
      ref={ref}
      className={cn('base-class', conditionalClass)}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};
```

### 2.2 Props 定义

```typescript
// ✅ 正确：明确的类型定义
interface ComponentProps {
  requiredProp: string;
  optionalProp?: string;
  callbackProp?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const Component: React.FC<ComponentProps> = ({ 
  requiredProp, 
  optionalProp,
  callbackProp,
  children,
  className 
}) => {
  // 实现
};

// ❌ 错误：不明确的类型定义
export const Component = ({ 
  requiredProp, 
  optionalProp,
  callbackProp,
  children,
  className 
}: any) => {
  // 实现
};
```

### 2.3 默认值

```typescript
// ✅ 正确：使用解构默认值
interface ComponentProps {
  count?: number;
  isActive?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Component: React.FC<ComponentProps> = ({ 
  count = 0, 
  isActive = false,
  variant = 'primary'
}) => {
  // 实现
};

// ❌ 错误：在组件内部设置默认值
export const Component: React.FC<ComponentProps> = ({ count, isActive, variant }) => {
  const finalCount = count ?? 0;
  const finalIsActive = isActive ?? false;
  const finalVariant = variant ?? 'primary';
  
  // 实现
};
```

---

## 3. 样式规范

### 3.1 使用样式常量

```typescript
// ✅ 正确：使用样式常量
import { COLORS, SIZES, ANIMATIONS, TRANSITIONS } from '@/constants/uiStyles';

<div className={cn(
  COLORS.primary.blueBg,
  SIZES.padding.md,
  ANIMATIONS.fadeIn,
  TRANSITIONS.default
)}>

// ❌ 错误：硬编码样式
<div className="bg-blue-500/20 px-4 py-1.5 animate-in fade-in duration-500 transition-all duration-200">
```

### 3.2 使用 cn 工具函数

```typescript
// ✅ 正确：使用 cn 合并类名
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  condition && 'conditional-class',
  'another-class'
)}>

// ❌ 错误：手动拼接类名
<div className={`base-class ${condition ? 'conditional-class' : ''} another-class`}>
```

### 3.3 条件样式

```typescript
// ✅ 正确：使用 cn 处理条件样式
<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' && 'primary-class',
  variant === 'secondary' && 'secondary-class'
)}>

// ❌ 错误：使用三元运算符
<div className={`base-class ${isActive ? 'active-class' : ''} ${variant === 'primary' ? 'primary-class' : ''}`}>
```

### 3.4 响应式样式

```typescript
// ✅ 正确：使用 Tailwind 响应式类
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ❌ 错误：不使用响应式类
<div className="grid grid-cols-3 gap-4">
```

---

## 4. 布局规范

### 4.1 Flexbox 布局

```typescript
// ✅ 正确：使用 Flexbox 布局
<div className="flex items-center justify-between gap-4">
  <div>左侧内容</div>
  <div>右侧内容</div>
</div>

// ❌ 错误：使用绝对定位
<div className="relative">
  <div className="absolute left-0 top-0">左侧内容</div>
  <div className="absolute right-0 top-0">右侧内容</div>
</div>
```

### 4.2 Grid 布局

```typescript
// ✅ 正确：使用 Grid 布局
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <div key={item.id}>{item.name}</div>
  ))}
</div>

// ❌ 错误：使用 Flexbox 模拟 Grid
<div className="flex flex-wrap gap-4">
  {items.map(item => (
    <div key={item.id} className="w-1/3">{item.name}</div>
  ))}
</div>
```

### 4.3 间距规范

```typescript
// ✅ 正确：使用间距常量
import { SIZES } from '@/constants/uiStyles';

<div className={SIZES.gap.md}>
  <div>内容 1</div>
  <div>内容 2</div>
</div>

// ❌ 错误：硬编码间距
<div className="gap-3">
  <div>内容 1</div>
  <div>内容 2</div>
</div>
```

---

## 5. 交互规范

### 5.1 按钮状态

```typescript
// ✅ 正确：完整的按钮状态
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children 
}) => {
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400',
    secondary: 'bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400',
    danger: 'bg-red-500 hover:bg-red-600 disabled:bg-gray-400',
  };
  
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'rounded-lg font-medium transition-colors',
        variants[variant],
        sizes[size]
      )}
    >
      {loading ? '加载中...' : children}
    </button>
  );
};

// ❌ 错误：不完整的按钮状态
export const Button: React.FC<{ onClick?: () => void; children: React.ReactNode }> = ({ 
  onClick, 
  children 
}) => {
  return (
    <button onClick={onClick} className="bg-blue-500 px-4 py-2 rounded-lg">
      {children}
    </button>
  );
};
```

### 5.2 表单交互

```typescript
// ✅ 正确：完整的表单交互
interface FormProps {
  onSubmit: (data: FormData) => void;
  loading?: boolean;
}

export const Form: React.FC<FormProps> = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = '姓名不能为空';
    if (!formData.email) newErrors.email = '邮箱不能为空';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>姓名</label>
        <input 
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <span className="text-red-500">{errors.name}</span>}
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? '提交中...' : '提交'}
      </button>
    </form>
  );
};

// ❌ 错误：不完整的表单交互
export const Form: React.FC<{ onSubmit: (data: FormData) => void }> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<FormData>({});
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(formData);
    }}>
      <input 
        type="text"
        value={formData.name || ''}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <button type="submit">提交</button>
    </form>
  );
};
```

### 5.3 加载状态

```typescript
// ✅ 正确：显示加载状态
export const DataLoader: React.FC = () => {
  const { data, isLoading, error } = useData();
  
  if (isLoading) {
    return <div className="loading">加载中...</div>;
  }
  
  if (error) {
    return <div className="error">加载失败: {error}</div>;
  }
  
  if (!data) {
    return <div className="empty">暂无数据</div>;
  }
  
  return <div className="data">{data}</div>;
};

// ❌ 错误：不显示加载状态
export const DataLoader: React.FC = () => {
  const { data, isLoading } = useData();
  
  return <div className="data">{data}</div>;
};
```

---

## 6. 响应式设计

### 6.1 断点使用

```typescript
// ✅ 正确：使用 Tailwind 断点
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <div key={item.id}>{item.name}</div>
  ))}
</div>

// ❌ 错误：不使用响应式设计
<div className="grid grid-cols-3 gap-4">
  {items.map(item => (
    <div key={item.id}>{item.name}</div>
  ))}
</div>
```

### 6.2 移动优先

```typescript
// ✅ 正确：移动优先设计
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">内容 1</div>
  <div className="flex-1">内容 2</div>
</div>

// ❌ 错误：桌面优先设计
<div className="flex flex-row gap-4 md:flex-col">
  <div className="flex-1">内容 1</div>
  <div className="flex-1">内容 2</div>
</div>
```

---

## 7. 无障碍访问

### 7.1 语义化 HTML

```typescript
// ✅ 正确：使用语义化标签
<nav>
  <ul>
    <li><a href="/">首页</a></li>
    <li><a href="/about">关于</a></li>
  </ul>
</nav>

<main>
  <h1>标题</h1>
  <p>内容</p>
</main>

<footer>
  <p>版权信息</p>
</footer>

// ❌ 错误：使用 div 模拟语义化标签
<div>
  <div>
    <div><a href="/">首页</a></div>
    <div><a href="/about">关于</a></div>
  </div>
</div>

<div>
  <div>标题</div>
  <div>内容</div>
</div>

<div>
  <div>版权信息</div>
</div>
```

### 7.2 ARIA 属性

```typescript
// ✅ 正确：使用 ARIA 属性
<button 
  aria-label="关闭"
  aria-pressed={isActive}
  onClick={handleClose}
>
  <X size={20} />
</button>

<input 
  type="text"
  aria-label="搜索"
  placeholder="搜索..."
/>

// ❌ 错误：不使用 ARIA 属性
<button onClick={handleClose}>
  <X size={20} />
</button>

<input 
  type="text"
  placeholder="搜索..."
/>
```

### 7.3 键盘导航

```typescript
// ✅ 正确：支持键盘导航
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  点击我
</div>

// ❌ 错误：不支持键盘导航
<div onClick={handleClick}>
  点击我
</div>
```

---

## 8. 性能优化

### 8.1 使用 React.memo

```typescript
// ✅ 正确：使用 React.memo 避免不必要的渲染
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
});

// ❌ 错误：不使用 React.memo
export const ExpensiveComponent: React.FC<Props> = ({ data }) => {
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
};
```

### 8.2 使用 useMemo

```typescript
// ✅ 正确：使用 useMemo 缓存计算结果
export const Component: React.FC<Props> = ({ items, filter }) => {
  const filteredItems = useMemo(() => {
    return items.filter(item => item.type === filter);
  }, [items, filter]);
  
  return (
    <ul>
      {filteredItems.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};

// ❌ 错误：不使用 useMemo
export const Component: React.FC<Props> = ({ items, filter }) => {
  const filteredItems = items.filter(item => item.type === filter);
  
  return (
    <ul>
      {filteredItems.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
};
```

### 8.3 使用 useCallback

```typescript
// ✅ 正确：使用 useCallback 稳定函数引用
export const Component: React.FC<Props> = ({ onAction }) => {
  const handleClick = useCallback(() => {
    if (onAction) {
      onAction();
    }
  }, [onAction]);
  
  return <button onClick={handleClick}>点击</button>;
};

// ❌ 错误：不使用 useCallback
export const Component: React.FC<Props> = ({ onAction }) => {
  const handleClick = () => {
    if (onAction) {
      onAction();
    }
  };
  
  return <button onClick={handleClick}>点击</button>;
};
```

---

## 9. 测试规范

### 9.1 组件测试

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interaction', async () => {
    const onAction = jest.fn();
    render(<Component onAction={onAction} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
  
  it('should display loading state', () => {
    render(<Component loading />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });
});
```

---

## 总结

本规范文档旨在确保 UI 组件的一致性、可维护性和可扩展性。所有开发者应遵循这些规范，以保持代码库的高质量。

如有疑问或建议，请联系团队负责人。
