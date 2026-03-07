# Rehab 插件开发规范

## 📋 目录

- [1. 插件目录结构](#1-插件目录结构)
- [2. 命名约定](#2-命名约定)
- [3. 状态管理规范](#3-状态管理规范)
- [4. UI 组件规范](#4-ui-组件规范)
- [5. 自定义 Hooks 规范](#5-自定义-hooks-规范)
- [6. 数据流规范](#6-数据流规范)
- [7. 错误处理规范](#7-错误处理规范)
- [8. 测试规范](#8-测试规范)
- [9. 性能优化规范](#9-性能优化规范)
- [10. 文档规范](#10-文档规范)

---

## 1. 插件目录结构

### 1.1 标准插件结构

```
src/plugins/{plugin-name}/
├── __tests__/                    # 测试文件
│   ├── {ComponentName}.test.tsx
│   ├── {HookName}.test.ts
│   └── {ServiceName}.test.ts
├── components/                   # UI 组件
│   ├── {ComponentName}.tsx
│   ├── {SubComponentName}.tsx
│   └── index.ts
├── hooks/                       # 自定义 Hooks
│   ├── use{FeatureName}.ts
│   └── index.ts
├── store/                       # Zustand 状态管理
│   └── use{PluginName}Store.ts
├── services/                    # 服务层
│   ├── {ServiceName}.ts
│   └── index.ts
├── constants/                   # 常量定义
│   ├── uiText.ts
│   └── config.ts
├── config/                      # 配置文件
│   └── index.ts
├── types/                       # 类型定义
│   └── index.ts
├── utils/                       # 工具函数
│   ├── {utilName}.ts
│   └── index.ts
├── {PluginName}Plugin.tsx        # 插件入口组件
└── index.ts                     # 插件导出
```

### 1.2 文件命名规则

| 文件类型 | 命名规则 | 示例 |
|---------|---------|------|
| React 组件 | PascalCase.tsx | `Vision3CameraStage.tsx` |
| 自定义 Hook | use{FeatureName}.ts | `useVision3Camera.ts` |
| Store | use{PluginName}Store.ts | `usePostureAssessmentStore.ts` |
| 服务 | {ServiceName}.ts | `DataProcessor.ts` |
| 常量 | {category}Constants.ts | `uiText.ts` |
| 类型 | {category}Types.ts | `assessmentTypes.ts` |
| 工具函数 | {utilName}.ts | `vision3-utils.ts` |
| 测试文件 | {FileName}.test.{ext} | `Vision3CameraStage.test.tsx` |

---

## 2. 命名约定

### 2.1 文件命名

```typescript
// ✅ 正确
Vision3Plugin.tsx
useVision3Camera.ts
usePostureAssessmentStore.ts
uiText.ts

// ❌ 错误
vision3_plugin.tsx
vision3Camera.ts
postureAssessmentStore.ts
ui-text.ts
```

### 2.2 组件命名

```typescript
// ✅ 正确
export const Vision3Plugin: React.FC = () => {};
export const Vision3CameraStage: React.FC<Props> = ({ children }) => {};

// ❌ 错误
export const vision3Plugin = () => {};
export const vision3_camera_stage = () => {};
```

### 2.3 Hook 命名

```typescript
// ✅ 正确
export const useVision3Camera = () => {};
export const usePostureAnalysis = () => {};

// ❌ 错误
export const vision3Camera = () => {};
export const getPostureAnalysis = () => {};
```

### 2.4 Store 命名

```typescript
// ✅ 正确
export const usePostureAssessmentStore = create<State>((set) => ({}));
export const useMeasurementStore = create<State>((set) => ({}));

// ❌ 错误
export const postureAssessmentStore = create<State>((set) => ({}));
export const measurementStore = create<State>((set) => ({}));
```

### 2.5 常量命名

```typescript
// ✅ 正确
export const ASSESSMENT_TEXTS = {};
export const CAPTURE_STATUS_TEXTS = {};
export const VIEW_TEXTS = {};

// ❌ 错误
export const assessmentTexts = {};
export const captureStatusTexts = {};
export const viewTexts = {};
```

### 2.6 类型命名

```typescript
// ✅ 正确
export type AssessmentType = 'standard' | 'quick';
export interface AssessmentConfig {
  type: AssessmentType;
  label: string;
}

// ❌ 错误
export type assessment_type = 'standard' | 'quick';
export interface assessment_config {
  type: AssessmentType;
  label: string;
}
```

### 2.7 变量命名

```typescript
// ✅ 正确
const isCameraOn = true;
const captureStatus = 'idle';
const handleStartCapture = () => {};

// ❌ 错误
const camera_on = true;
const capture_status = 'idle';
const startCapture = () => {};
```

---

## 3. 状态管理规范

### 3.1 Store 结构

```typescript
import { create } from 'zustand';

// 定义状态接口
interface State {
  // 状态字段
  field1: Type1;
  field2: Type2;
  
  // Actions
  setField1: (value: Type1) => void;
  setField2: (value: Type2) => void;
  action1: () => Promise<void>;
  action2: (param: ParamType) => void;
  
  // 重置方法
  reset: () => void;
}

// 创建 Store
export const useStoreName = create<State>((set, get) => ({
  // 初始状态
  field1: initialValue1,
  field2: initialValue2,
  
  // Actions
  setField1: (value) => set({ field1: value }),
  
  action1: async () => {
    set({ isLoading: true });
    try {
      // 业务逻辑
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  reset: () => set({
    field1: initialValue1,
    field2: initialValue2,
  }),
}));
```

### 3.2 状态字段命名

```typescript
// ✅ 正确
interface State {
  isLoading: boolean;
  error: string | null;
  data: DataType[];
  currentPatient: Patient | null;
}

// ❌ 错误
interface State {
  loading: boolean;
  err: string;
  items: DataType[];
  patient: Patient;
}
```

### 3.3 Action 命名

```typescript
// ✅ 正确
interface Actions {
  setPatient: (patient: Patient) => void;
  addPatient: (patient: Patient) => Promise<void>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  loadPatients: () => Promise<void>;
  reset: () => void;
}

// ❌ 错误
interface Actions {
  patient: (patient: Patient) => void;
  add: (patient: Patient) => Promise<void>;
  update: (id: string, updates: Partial<Patient>) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
```

### 3.4 异步 Action 模式

```typescript
// ✅ 正确
const loadData = async () => {
  set({ isLoading: true, error: null });
  
  try {
    const data = await fetchData();
    set({ data, isLoading: false });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('[Store] 加载数据失败:', error);
    set({ 
      error: errorMessage,
      isLoading: false 
    });
  }
};

// ❌ 错误
const loadData = async () => {
  const data = await fetchData();
  set({ data });
};
```

---

## 4. UI 组件规范

### 4.1 组件结构

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { IconName } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS, SIZES, ANIMATIONS } from '@/constants/uiStyles';

interface ComponentProps {
  prop1: Type1;
  prop2?: Type2;
  onAction?: () => void;
}

export const ComponentName: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2,
  onAction 
}) => {
  // Hooks
  const [state, setState] = useState(initialValue);
  
  // Effects
  useEffect(() => {
    // 副作用
    return () => {
      // 清理
    };
  }, [dependencies]);
  
  // Handlers
  const handleClick = useCallback(() => {
    if (onAction) {
      onAction();
    }
  }, [onAction]);
  
  // Render
  return (
    <div className={cn('base-class', conditionalClass)}>
      {/* JSX */}
    </div>
  );
};
```

### 4.2 Props 定义

```typescript
// ✅ 正确
interface ComponentProps {
  requiredProp: string;
  optionalProp?: string;
  callbackProp?: () => void;
  children?: React.ReactNode;
}

// ❌ 错误
interface ComponentProps {
  requiredProp: string;
  optionalProp: string; // 应该是可选的
  callback: () => void; // 应该是可选的
}
```

### 4.3 样式使用

```typescript
// ✅ 正确
import { COLORS, SIZES, ANIMATIONS, TRANSITIONS } from '@/constants/uiStyles';

<div className={cn(
  'base-class',
  COLORS.primary.blueBg,
  SIZES.padding.md,
  ANIMATIONS.fadeIn,
  TRANSITIONS.default,
  condition && COLORS.primary.blueHover
)}>

// ❌ 错误
<div className="bg-blue-500/20 px-4 py-1.5 animate-in fade-in duration-500 transition-all duration-200">
```

### 4.4 条件渲染

```typescript
// ✅ 正确
{condition && <Component />}

{condition ? <ComponentA /> : <ComponentB />}

{condition && (
  <div>
    <Component />
  </div>
)}

// ❌ 错误
{condition === true && <Component />}

{condition ? <Component /> : null}
```

### 4.5 列表渲染

```typescript
// ✅ 正确
{items.map((item, index) => (
  <Component 
    key={item.id || index}
    data={item}
  />
))}

// ❌ 错误
{items.map((item) => (
  <Component 
    key={index} // 应该使用唯一 ID
    data={item}
  />
))}
```

---

## 5. 自定义 Hooks 规范

### 5.1 Hook 结构

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

interface HookProps {
  prop1: Type1;
  prop2?: Type2;
}

interface HookReturn {
  value1: Type1;
  value2: Type2;
  action1: () => void;
}

export const useHookName = ({ prop1, prop2 }: HookProps): HookReturn => {
  // State
  const [state, setState] = useState(initialValue);
  const ref = useRef<Value>(null);
  
  // Effects
  useEffect(() => {
    // 副作用
    return () => {
      // 清理
    };
  }, [dependencies]);
  
  // Callbacks
  const action = useCallback(() => {
    // 逻辑
  }, [dependencies]);
  
  // Return
  return {
    value1: state,
    value2: prop2,
    action1: action,
  };
};
```

### 5.2 Hook 命名

```typescript
// ✅ 正确
export const useVision3Camera = () => {};
export const usePostureAnalysis = () => {};
export const useVision3AutoSave = () => {};

// ❌ 错误
export const vision3Camera = () => {};
export const getPostureAnalysis = () => {};
export const autoSave = () => {};
```

### 5.3 Hook 返回值

```typescript
// ✅ 正确
return {
  value1,
  value2,
  action1,
  action2,
};

// ❌ 错误
return [value1, value2, action1, action2]; // 应该返回对象
```

---

## 6. 数据流规范

### 6.1 数据流架构

```
用户操作
    ↓
组件事件处理
    ↓
自定义 Hook
    ↓
Store Action
    ↓
状态更新
    ↓
组件重新渲染
```

### 6.2 WebSocket 数据流

```typescript
// ✅ 正确
const { analyze, result } = usePostureWS();

const handleAnalyze = () => {
  analyze(view, landmarks, width, height);
};

// ❌ 错误
const handleAnalyze = () => {
  // 直接调用 WebSocket，不经过 Hook
  ws.send(JSON.stringify({ view, landmarks }));
};
```

### 6.3 持久化数据流

```typescript
// ✅ 正确
const { addAssessment } = useAssessmentStore();

const handleSave = async () => {
  await addAssessment({
    sessionId,
    patientId,
    type: 'posture',
    mode: 'stepped',
    data: { /* ... */ }
  });
};

// ❌ 错误
const handleSave = async () => {
  // 直接操作 IndexedDB，不经过 Store
  await db.assessments.add({ /* ... */ });
};
```

---

## 7. 错误处理规范

### 7.1 Try-Catch 模式

```typescript
// ✅ 正确
const action = async () => {
  set({ isLoading: true, error: null });
  
  try {
    const result = await fetchData();
    set({ result, isLoading: false });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('[Component] 操作失败:', error);
    set({ 
      error: errorMessage,
      isLoading: false 
    });
  }
};

// ❌ 错误
const action = async () => {
  try {
    const result = await fetchData();
    set({ result });
  } catch (error) {
    console.error(error);
  }
};
```

### 7.2 错误状态管理

```typescript
// ✅ 正确
interface State {
  error: string | null;
  isLoading: boolean;
}

// ❌ 错误
interface State {
  err: string;
  loading: boolean;
}
```

### 7.3 用户友好的错误消息

```typescript
// ✅ 正确
const errorMessage = error instanceof Error 
  ? error.message 
  : '操作失败，请重试';

// ❌ 错误
const errorMessage = error.message || 'Error';
```

---

## 8. 测试规范

### 8.1 测试文件命名

```typescript
// ✅ 正确
Vision3Plugin.test.tsx
useVision3Camera.test.ts
DataProcessor.test.ts

// ❌ 错误
vision3_plugin.spec.tsx
Vision3Camera.spec.ts
data-processor.test.ts
```

### 8.2 测试结构

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  beforeEach(() => {
    // 每个测试前的准备
  });

  afterEach(() => {
    // 每个测试后的清理
  });

  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    render(<ComponentName />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });
});
```

---

## 9. 性能优化规范

### 9.1 使用 useCallback

```typescript
// ✅ 正确
const handleClick = useCallback(() => {
  onAction();
}, [onAction]);

// ❌ 错误
const handleClick = () => {
  onAction();
};
```

### 9.2 使用 useMemo

```typescript
// ✅ 正确
const filteredItems = useMemo(() => {
  return items.filter(item => item.active);
}, [items]);

// ❌ 错误
const filteredItems = items.filter(item => item.active);
```

### 9.3 避免不必要的渲染

```typescript
// ✅ 正确
const MemoizedComponent = React.memo(({ prop }) => {
  return <div>{prop}</div>;
});

// ❌ 错误
const Component = ({ prop }) => {
  return <div>{prop}</div>;
};
```

---

## 10. 文档规范

### 10.1 文件注释

```typescript
/**
 * Vision3 Plugin - 体态分析插件
 * 
 * 功能：
 * - 实时体态分析
 * - 分步评估模式
 * - AI 深度诊断
 * 
 * @module Vision3Plugin
 */

import React from 'react';
```

### 10.2 函数注释

```typescript
/**
 * 计算关节角度
 * 
 * @param landmarks - 关键点数据
 * @param jointType - 关节类型
 * @returns 关节角度（度数）
 * 
 * @example
 * ```typescript
 * const angle = calculateJointAngle(landmarks, 'elbow');
 * console.log(angle); // 45.5
 * ```
 */
export const calculateJointAngle = (
  landmarks: Landmark[],
  jointType: JointType
): number => {
  // 实现
};
```

### 10.3 组件注释

```typescript
/**
 * Vision3CameraStage 组件
 * 
 * 摄像头采集和实时分析的核心组件
 * 
 * @param videoContainerRef - 视频容器引用
 * @param isFullscreen - 是否全屏
 * @param isCameraOn - 摄像头是否开启
 * @param onResults - 分析结果回调
 */
export const Vision3CameraStage: React.FC<Props> = ({ 
  videoContainerRef,
  isFullscreen,
  isCameraOn,
  onResults 
}) => {
  // 实现
};
```

---

## 附录

### A. 常用工具函数

```typescript
import { cn } from '@/lib/utils';
import { COLORS, SIZES, ANIMATIONS } from '@/constants/uiStyles';

// 合并类名
const className = cn('base-class', conditionalClass);

// 使用样式常量
const styledDiv = (
  <div className={cn(
    COLORS.primary.blueBg,
    SIZES.padding.md,
    ANIMATIONS.fadeIn
  )}>
    Content
  </div>
);
```

### B. 常用图标

```typescript
import { 
  Camera, 
  Video, 
  VideoOff, 
  Scan, 
  Activity,
  FileText,
  Database,
  User,
  Calendar
} from 'lucide-react';
```

### C. 常用类型

```typescript
import type { 
  Landmark, 
  PostureMetrics, 
  PostureIssue 
} from '@/types/posture';

import type { 
  Assessment, 
  AssessmentMode 
} from '@/types/assessment';
```

---

## 总结

本规范文档旨在确保代码的一致性、可维护性和可扩展性。所有开发者应遵循这些规范，以保持代码库的高质量。

如有疑问或建议，请联系团队负责人。
