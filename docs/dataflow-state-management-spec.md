# 数据流和状态管理规范

## 📋 目录

- [1. 数据流架构](#1-数据流架构)
- [2. 状态管理原则](#2-状态管理原则)
- [3. Zustand Store 规范](#3-zustand-store-规范)
- [4. 数据持久化规范](#4-数据持久化规范)
- [5. WebSocket 数据流](#5-websocket-数据流)
- [6. 组件间通信](#6-组件间通信)
- [7. 数据验证和错误处理](#7-数据验证和错误处理)

---

## 1. 数据流架构

### 1.1 单向数据流

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

### 1.2 数据流层次

```
┌─────────────────────────────────────────────────────────┐
│                   UI 层                          │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  组件 A      │  │  组件 B      │            │
│  └──────┬───────┘  └──────┬───────┘            │
└─────────┼──────────────────┼─────────────────────┘
          │                  │
          ↓                  ↓
┌─────────────────────────────────────────────────────────┐
│                  Hook 层                          │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ useHookA     │  │ useHookB     │            │
│  └──────┬───────┘  └──────┬───────┘            │
└─────────┼──────────────────┼─────────────────────┘
          │                  │
          ↓                  ↓
┌─────────────────────────────────────────────────────────┐
│                 Store 层                          │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Store A      │  │ Store B      │            │
│  └──────┬───────┘  └──────┬───────┘            │
└─────────┼──────────────────┼─────────────────────┘
          │                  │
          ↓                  ↓
┌─────────────────────────────────────────────────────────┐
│                 数据层                            │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ IndexedDB    │  │ WebSocket    │            │
│  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 状态管理原则

### 2.1 状态分类

```typescript
// 1. 本地状态（组件内部）
const [localState, setLocalState] = useState(initialValue);

// 2. 共享状态（跨组件）
const sharedState = useSharedStore();

// 3. 全局状态（应用级别）
const globalState = useGlobalStore();

// 4. 服务器状态（远程数据）
const { data, isLoading, error } = useSWR('/api/data');
```

### 2.2 状态提升原则

```typescript
// ✅ 正确：状态提升到最近的共同父组件
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <>
      <ChildA count={count} />
      <ChildB setCount={setCount} />
    </>
  );
}

// ❌ 错误：状态分散在多个组件中
function ChildA() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

function ChildB() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>+</button>;
}
```

### 2.3 单一数据源原则

```typescript
// ✅ 正确：单一数据源
const { assessments } = useAssessmentStore();

// ❌ 错误：多个数据源
const { assessments } = useAssessmentStore();
const { reports } = useMeasurementStore(); // 重复数据
```

---

## 3. Zustand Store 规范

### 3.1 Store 结构

```typescript
import { create } from 'zustand';

// 定义状态接口
interface State {
  // 状态字段
  field1: Type1;
  field2: Type2;
  isLoading: boolean;
  error: string | null;
  
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
  isLoading: false,
  error: null,
  
  // Actions
  setField1: (value) => set({ field1: value }),
  
  action1: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await fetchData();
      set({ result, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[Store] 操作失败:', error);
      set({ 
        error: errorMessage,
        isLoading: false 
      });
    }
  },
  
  reset: () => set({
    field1: initialValue1,
    field2: initialValue2,
    isLoading: false,
    error: null,
  }),
}));
```

### 3.2 状态字段命名

```typescript
// ✅ 正确
interface State {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  data: DataType[];
  currentPatient: Patient | null;
  selectedAssessment: Assessment | null;
}

// ❌ 错误
interface State {
  loading: boolean;
  saving: boolean;
  err: string;
  items: DataType[];
  patient: Patient;
  assessment: Assessment;
}
```

### 3.3 Action 命名规范

```typescript
// ✅ 正确
interface Actions {
  // Setters
  setPatient: (patient: Patient) => void;
  setSelectedAssessment: (assessment: Assessment) => void;
  
  // CRUD
  addPatient: (patient: Patient) => Promise<void>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  
  // Loaders
  loadPatients: () => Promise<void>;
  loadPatientById: (id: string) => Promise<void>;
  
  // Actions
  startCapture: () => void;
  stopCapture: () => void;
  resetCapture: () => void;
  
  // Reset
  reset: () => void;
}

// ❌ 错误
interface Actions {
  patient: (patient: Patient) => void;
  assessment: (assessment: Assessment) => void;
  add: (patient: Patient) => Promise<void>;
  update: (id: string, updates: Partial<Patient>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  load: () => Promise<void>;
  start: () => void;
  stop: () => void;
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

### 3.5 使用 get() 访问当前状态

```typescript
// ✅ 正确
const updateItem = (id: string, updates: Partial<Item>) => {
  const { items } = get();
  const updatedItems = items.map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
  set({ items: updatedItems });
};

// ❌ 错误
const updateItem = (id: string, updates: Partial<Item>) => {
  set(state => ({
    items: state.items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    )
  }));
};
```

---

## 4. 数据持久化规范

### 4.1 持久化架构

```
UI 层
    ↓
Store 层
    ↓
Service 层
    ↓
IndexedDB
```

### 4.2 Service 层规范

```typescript
import { db } from '@/lib/db';

export const AssessmentService = {
  /**
   * 加载所有评估记录
   */
  async loadAll(): Promise<Assessment[]> {
    try {
      const assessments = await db.assessments
        .orderBy('createdAt')
        .reverse()
        .toArray();
      
      return assessments;
    } catch (error) {
      console.error('[AssessmentService] 加载评估记录失败:', error);
      throw new Error('加载评估记录失败');
    }
  },
  
  /**
   * 加载患者的评估记录
   */
  async loadByPatient(patientId: string): Promise<Assessment[]> {
    if (!patientId) {
      throw new Error('患者 ID 不能为空');
    }
    
    try {
      const assessments = await db.assessments
        .where('patientId')
        .equals(patientId)
        .reverse()
        .sortBy('createdAt');
      
      return assessments;
    } catch (error) {
      console.error('[AssessmentService] 加载患者评估失败:', error);
      throw new Error('加载患者评估失败');
    }
  },
  
  /**
   * 保存评估记录
   */
  async save(assessment: Assessment): Promise<void> {
    try {
      await db.assessments.put(assessment);
      console.log('[AssessmentService] 评估记录已保存:', assessment.id);
    } catch (error) {
      console.error('[AssessmentService] 保存评估失败:', error);
      throw new Error('保存评估失败');
    }
  },
  
  /**
   * 删除评估记录
   */
  async delete(id: string): Promise<void> {
    try {
      await db.assessments.delete(id);
      console.log('[AssessmentService] 评估记录已删除:', id);
    } catch (error) {
      console.error('[AssessmentService] 删除评估失败:', error);
      throw new Error('删除评估失败');
    }
  },
};
```

### 4.3 Store 与 Service 集成

```typescript
// ✅ 正确：Store 通过 Service 访问数据
export const useAssessmentStore = create<AssessmentState>((set) => ({
  assessments: [],
  isLoading: false,
  error: null,
  
  loadAssessments: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const assessments = await AssessmentService.loadAll();
      set({ assessments, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
    }
  },
  
  addAssessment: async (data) => {
    set({ isLoading: true, error: null });
    
    try {
      const assessment = await AssessmentService.save(data);
      set(state => ({ 
        assessments: [assessment, ...state.assessments],
        isLoading: false 
      }));
      
      return assessment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw error;
    }
  },
}));

// ❌ 错误：Store 直接操作 IndexedDB
export const useAssessmentStore = create<AssessmentState>((set) => ({
  assessments: [],
  
  addAssessment: async (data) => {
    await db.assessments.add(data); // 不应该直接操作
    set(state => ({ 
      assessments: [data, ...state.assessments]
    }));
  },
}));
```

### 4.4 数据缓存策略

```typescript
// ✅ 正确：使用 Zustand 作为缓存层
export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  assessments: [], // 内存缓存
  
  loadAssessments: async () => {
    const { assessments } = get();
    
    // 如果缓存存在，直接返回
    if (assessments.length > 0) {
      return assessments;
    }
    
    // 否则从数据库加载
    const loaded = await AssessmentService.loadAll();
    set({ assessments: loaded });
    return loaded;
  },
}));

// ❌ 错误：每次都从数据库加载
export const useAssessmentStore = create<AssessmentState>((set) => ({
  assessments: [],
  
  loadAssessments: async () => {
    const loaded = await AssessmentService.loadAll(); // 每次都加载
    set({ assessments: loaded });
  },
}));
```

---

## 5. WebSocket 数据流

### 5.1 WebSocket Hook 规范

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url: string) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [data, setData] = useState<DataType | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const connect = useCallback(() => {
    try {
      setStatus('connecting');
      wsRef.current = new WebSocket(url);
      
      wsRef.current.onopen = () => {
        setStatus('connected');
        console.log('[WebSocket] 已连接');
      };
      
      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setData(message);
      };
      
      wsRef.current.onerror = (error) => {
        setStatus('error');
        console.error('[WebSocket] 错误:', error);
      };
      
      wsRef.current.onclose = () => {
        setStatus('disconnected');
        console.log('[WebSocket] 已断开');
        
        // 自动重连
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    } catch (error) {
      setStatus('error');
      console.error('[WebSocket] 连接失败:', error);
    }
  }, [url]);
  
  useEffect(() => {
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);
  
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);
  
  return {
    status,
    data,
    send,
    connect,
  };
};
```

### 5.2 WebSocket 数据处理

```typescript
// ✅ 正确：在 Hook 中处理数据
const { analyze, result } = usePostureWS();

const handleAnalyze = () => {
  analyze(view, landmarks, width, height);
};

// ❌ 错误：组件直接发送 WebSocket 消息
const handleAnalyze = () => {
  wsRef.current?.send(JSON.stringify({ view, landmarks }));
};
```

---

## 6. 组件间通信

### 6.1 Props 传递

```typescript
// ✅ 正确：通过 Props 传递数据
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <Child count={count} setCount={setCount} />
  );
}

function Child({ count, setCount }: { count: number; setCount: (value: number) => void }) {
  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}

// ❌ 错误：通过 Context 传递简单数据
const CountContext = createContext<{ count: number; setCount: (value: number) => void }>({
  count: 0,
  setCount: () => {},
});

function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <CountContext.Provider value={{ count, setCount }}>
      <Child />
    </CountContext.Provider>
  );
}
```

### 6.2 Context 使用

```typescript
// ✅ 正确：使用 Context 管理全局状态
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
});

function App() {
  const [theme, setTheme] = useState<Theme>('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Child />
    </ThemeContext.Provider>
  );
}

function Child() {
  const { theme, setTheme } = useContext(ThemeContext);
  
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      切换主题
    </button>
  );
}

// ❌ 错误：使用 Context 传递局部状态
const LocalContext = createContext<{ count: number; setCount: (value: number) => void }>({
  count: 0,
  setCount: () => {},
});

function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <LocalContext.Provider value={{ count, setCount }}>
      <Child />
    </LocalContext.Provider>
  );
}
```

### 6.3 事件冒泡

```typescript
// ✅ 正确：通过 Props 传递事件处理函数
function Parent() {
  const handleClick = () => {
    console.log('Button clicked');
  };
  
  return <Child onClick={handleClick} />;
}

function Child({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick}>Click me</button>;
}

// ❌ 错误：在子组件中直接调用父组件方法
function Parent() {
  const handleClick = () => {
    console.log('Button clicked');
  };
  
  return <Child parent={this} />;
}

function Child({ parent }: { parent: any }) {
  return <button onClick={() => parent.handleClick()}>Click me</button>;
}
```

---

## 7. 数据验证和错误处理

### 7.1 输入验证

```typescript
// ✅ 正确：验证输入参数
const addPatient = async (name?: string) => {
  if (!name || name.trim().length === 0) {
    throw new Error('患者姓名不能为空');
  }
  
  if (name.length > 100) {
    throw new Error('患者姓名不能超过 100 个字符');
  }
  
  const patient: Patient = {
    id: generateId(),
    name: name.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await db.patients.add(patient);
};

// ❌ 错误：不验证输入参数
const addPatient = async (name?: string) => {
  const patient: Patient = {
    id: generateId(),
    name,
    createdAt: Date.now(),
  };
  
  await db.patients.add(patient);
};
```

### 7.2 错误处理

```typescript
// ✅ 正确：完整的错误处理
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
    
    // 可选：显示用户友好的错误消息
    toast.error(errorMessage);
  }
};

// ❌ 错误：不完整的错误处理
const action = async () => {
  try {
    const result = await fetchData();
    set({ result });
  } catch (error) {
    console.error(error);
  }
};
```

### 7.3 数据类型检查

```typescript
// ✅ 正确：检查数据类型
const processData = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('无效的数据格式');
  }
  
  const assessment = data as Assessment;
  
  if (!assessment.id || !assessment.patientId) {
    throw new Error('缺少必要的字段');
  }
  
  return assessment;
};

// ❌ 错误：不检查数据类型
const processData = (data: unknown) => {
  const assessment = data as Assessment;
  return assessment;
};
```

---

## 总结

本规范文档旨在确保数据流和状态管理的一致性、可维护性和可扩展性。所有开发者应遵循这些规范，以保持代码库的高质量。

如有疑问或建议，请联系团队负责人。
