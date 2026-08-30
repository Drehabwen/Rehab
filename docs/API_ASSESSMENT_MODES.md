# 评估模式 API 文档

## 概述

本文档描述 Vision3 体态评估系统的评估模式 API，包括前端与后端的交互协议。

---

## 评估模式类型

### 1. 标准评估 (Standard Assessment)

**类型标识**: `standard`

**描述**: 前面-侧面-背面三视角完整评估

**特点**:
- 数据完整性高
- 诊断准确性高
- 全面分析体态问题
- 耗时约 3-5 分钟

**必需视角**: `['front', 'side', 'back']`

**流程**:
```
1. 用户选择"标准评估"
2. 拍摄正面视角 → 侧视角 → 背视角
3. 三视角完成后自动生成报告
4. 显示完整的多视角分析报告
```

---

### 2. 快速评估 (Quick Assessment)

**类型标识**: `quick`

**描述**: 单视角快速筛查

**特点**:
- 即时反馈
- 快速筛查
- 初步检查
- 耗时约 1-2 分钟

**必需视角**: 用户选择（`front` 或 `side` 或 `back`）

**流程**:
```
1. 用户选择"快速评估"
2. 用户选择视角（正面/侧面/背面）
3. 拍摄选定视角
4. 单视角完成后立即生成报告
5. 显示单视角分析报告 + 警告提示
```

---

## 前端 API

### 1. 评估模式配置

**文件**: `src/plugins/vision3/config/assessmentModes.ts`

```typescript
export type AssessmentType = 'standard' | 'quick';

export interface AssessmentModeConfig {
  type: AssessmentType;
  label: string;
  description: string;
  features: string[];
  estimatedTime: string;
  requiredViews: ('front' | 'side' | 'back')[];
}

export const ASSESSMENT_MODES: Record<AssessmentType, AssessmentModeConfig> = {
  standard: {
    type: 'standard',
    label: '标准评估',
    description: '前-侧-后三视角完整评估',
    features: ['数据完整', '诊断准确', '全面分析'],
    estimatedTime: '3-5 分钟',
    requiredViews: ['front', 'side', 'back']
  },
  quick: {
    type: 'quick',
    label: '快速评估',
    description: '单视角快速筛查',
    features: ['即时反馈', '快速筛查', '初步检查'],
    estimatedTime: '1-2 分钟',
    requiredViews: ['front']
  }
};
```

---

### 2. 模式选择接口

**组件**: `Vision3EntryHub`

**Props**:
```typescript
interface Vision3EntryHubProps {
  onSelectMode: (mode: AssessmentType, view?: 'front' | 'side' | 'back') => void;
}
```

**使用示例**:
```typescript
<Vision3EntryHub 
  onSelectMode={(mode, view) => {
    console.log(`Selected mode: ${mode}, view: ${view}`);
  }}
/>
```

---

### 3. 评估状态接口

**文件**: `src/plugins/vision3/Vision3Plugin.tsx`

```typescript
interface AssessmentState {
  assessmentType: AssessmentType;
  quickView: 'front' | 'side' | 'back';
  view: 'front' | 'side' | 'back';
  captureStatus: CaptureStatus;
  steppedResults: SteppedResults;
  markdownReport: string | null;
  auxiliaryReport: string | null;
}
```

---

### 4. 事件处理器接口

**文件**: `src/plugins/vision3/hooks/useVision3EventHandler.ts`

```typescript
interface UseVision3EventHandlerProps {
  assessmentType: AssessmentType;
  quickView: 'front' | 'side' | 'back';
  setCaptureStatus: React.Dispatch<React.SetStateAction<CaptureStatus>>;
  setView: (view: 'front' | 'side' | 'back') => void;
  setStep: (step: string) => void;
  setIsEntryMode: (entryMode: boolean) => void;
  setSteppedResults: React.Dispatch<React.SetStateAction<SteppedResults>>;
  setIsCameraOn: (on: boolean) => void;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  view: 'front' | 'side' | 'back';
  steppedResults: SteppedResults;
  analyzeStepped: (frames: SteppedFrame[], assessmentType: AssessmentType) => void;
}

interface UseVision3EventHandlerReturn {
  handleSelectAssessmentMode: (type: AssessmentType) => void;
  handleSelectQuickView: (view: 'front' | 'side' | 'back') => void;
  handleStartCapture: () => void;
  handleNextView: () => void;
  handleFinishStepped: () => void;
  handleResetToEntry: () => void;
  handleSelectMode: (mode: 'stepped' | 'realtime', view: 'front' | 'side' | 'back') => void;
}
```

---

## 后端 API

### 1. WebSocket 连接

**端点**: `ws://localhost:8000/ws/analyze`

**连接示例**:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/analyze');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

---

### 2. 请求消息格式

#### POSTURE_STEPPED_ANALYSIS

**用途**: 发送分步评估数据到后端生成报告

**消息结构**:
```json
{
  "type": "POSTURE_STEPPED_ANALYSIS",
  "frames": [
    {
      "view": "front",
      "width": 640,
      "height": 480,
      "timeSeriesLandmarks": [
        [
          {
            "x": 0.5,
            "y": 0.5,
            "z": 0.0,
            "visibility": 0.95
          }
        ]
      ],
      "timestamp": 1234567890
    }
  ],
  "assessmentType": "standard",
  "mock": false
}
```

**字段说明**:
| 字段 | 类型 | 必需 | 说明 |
|------|------|--------|------|
| `type` | string | 是 | 消息类型，固定为 "POSTURE_STEPPED_ANALYSIS" |
| `frames` | array | 是 | 视角帧数据数组 |
| `frames[].view` | string | 是 | 视角标识：front / side / back |
| `frames[].width` | number | 是 | 视频宽度 |
| `frames[].height` | number | 是 | 视频高度 |
| `frames[].timeSeriesLandmarks` | array | 是 | 时序骨骼点数据 |
| `frames[].timestamp` | number | 否 | 时间戳 |
| `assessmentType` | string | 否 | 评估类型：standard / quick（默认 standard） |
| `mock` | boolean | 否 | 是否使用模拟数据（测试用） |

---

### 3. 响应消息格式

#### POSTURE_REPORT

**用途**: 后端返回生成的评估报告

**消息结构**:
```json
{
  "type": "POSTURE_REPORT",
  "markdown": "### 体态评估报告\n\n## 评估结果\n...",
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "timeSeries": [
    {
      "timestamp": 1234567890,
      "view": "front",
      "shoulderAngle": 5.2,
      "hipAngle": 3.8
    }
  ],
  "metrics": {
    "shoulderAngle": 5.2,
    "hipAngle": 3.8,
    "headForward": 2.1
  },
  "auxiliaryDiagnosis": "根据分析，您存在轻微的头前伸问题",
  "issues": [
    {
      "id": "head_forward",
      "type": "forward_head",
      "severity": "mild",
      "title": "头前伸",
      "description": "头部前倾约 2.1cm",
      "recommendation": "注意调整屏幕高度，保持头部中立位"
    }
  ],
  "timestamp": 1234567890123,
  "assessmentType": "standard"
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | 消息类型，固定为 "POSTURE_REPORT" |
| `markdown` | string | Markdown 格式的评估报告 |
| `reportId` | string | 唯一报告标识符（UUID） |
| `timeSeries` | array | 时序分析数据（可选） |
| `metrics` | object | 体态指标数据（可选） |
| `auxiliaryDiagnosis` | string | 辅助诊断信息（可选） |
| `issues` | array | 体态问题列表（可选） |
| `timestamp` | number | 响应时间戳（毫秒） |
| `assessmentType` | string | 评估类型：standard / quick |

---

## 报告内容差异

### 标准评估报告

**内容**:
- 前面视角分析
- 侧面视角分析
- 背面视角分析
- 综合评估结论
- 个性化建议

**示例**:
```markdown
### 体态评估报告

## 前面视角分析
- 肩膀平衡度：正常
- 头部偏移：轻微前倾
- ...

## 侧面视角分析
- 头前伸：中度
- 脊柱曲度：正常
- ...

## 背面视角分析
- 脊柱侧弯：无
- 骨盆平衡：正常
- ...

## 综合评估
基于三视角数据，您的体态整体良好，但存在轻微头前伸问题。

## 建议
1. 每日进行颈部拉伸练习
2. 调整工作姿势，保持头部中立位
...
```

---

### 快速评估报告

**内容**:
- 单视角分析
- ⚠️ 警告提示：数据局限性
- 初步建议

**示例**:
```markdown
### 体态评估报告（快速模式）

> **⚠️ 警告**：此报告仅基于单视角数据，建议进行完整评估以获得更准确的诊断。

## 正面视角分析
- 肩膀平衡度：正常
- 头部偏移：轻微前倾
- ...

## 初步建议
基于单视角数据，建议您：
1. 注意保持正确坐姿
2. 定期进行肩颈放松练习

**重要提示**：此评估可能遗漏其他视角的问题，建议进行完整评估。
```

---

## 错误处理

### 前端错误处理

```typescript
try {
  analyzeStepped(frames, assessmentType);
} catch (error) {
  console.error('Failed to analyze:', error);
  setCaptureStatus('error');
  showErrorToast('分析失败，请重试');
}
```

### 后端错误处理

**错误响应格式**:
```json
{
  "type": "ERROR",
  "message": "Invalid frame data",
  "code": "INVALID_FRAME_DATA"
}
```

**常见错误码**:
| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `INVALID_FRAME_DATA` | 帧数据格式错误 | 检查骨骼点数据结构 |
| `NO_FRAMES_RECEIVED` | 未收到任何帧数据 | 提示用户重新拍摄 |
| `ANALYSIS_FAILED` | 分析过程失败 | 重试或联系技术支持 |
| `LLM_ERROR` | LLM 生成报告失败 | 使用备用报告生成逻辑 |

---

## 数据持久化

### 评估记录存储

**文件**: `src/store/useMeasurementStore.ts`

```typescript
interface PostureReport {
  id: string;
  date: number;
  view: string;
  html: string;
  markdown?: string;
  timeSeries?: TemporalAnalysis['timeSeries'];
  metrics?: PostureMetrics;
  issues?: PostureIssue[];
  auxiliaryDiagnosis?: string;
}

savePostureReport(
  view: string,
  html: string,
  markdown?: string,
  timeSeries?: TemporalAnalysis['timeSeries'],
  metrics?: PostureMetrics,
  issues?: PostureIssue[],
  auxiliaryDiagnosis?: string
): void
```

---

## 安全性考虑

### 1. 数据验证

**前端验证**:
- 检查骨骼点数据完整性
- 验证时间戳有效性
- 过滤低可见度数据点

**后端验证**:
- 验证消息类型
- 检查帧数据格式
- 限制数据大小

### 2. 错误边界

**前端错误边界**:
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <Vision3Plugin />
</ErrorBoundary>
```

### 3. 降级处理

**降级策略**:
1. WebSocket 连接失败 → 使用备用报告生成
2. LLM 超时 → 返回基础分析报告
3. 骨骼点丢失 → 显示"正在重新检测"提示

---

## 性能优化

### 1. 数据压缩

**时序数据压缩**:
- 只保留关键帧（每 5 帧采样 1 帧）
- 使用浮点数压缩（保留 2 位小数）

### 2. 缓存策略

**报告缓存**:
- 相同参数的评估结果缓存 5 分钟
- 使用 IndexedDB 存储缓存

### 3. 渲染优化

**骨骼点渲染优化**:
- 使用 Canvas 2D API 而非 SVG
- 批量绘制而非逐个绘制
- 使用 `requestAnimationFrame` 优化动画

---

## 版本历史

| 版本 | 日期 | 变更 |
|--------|------|------|
| 1.0.1 | 2026-03-02 | 更新接口文档，与实际实现一致 |
| 1.0.0 | 2026-03-01 | 初始版本，支持标准和快速评估模式 |

---

## 联系方式

如有问题或建议，请联系开发团队。
