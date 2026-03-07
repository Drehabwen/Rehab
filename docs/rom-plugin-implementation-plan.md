# ROM 评估插件原子级实现计划

## 📋 目录

- [1. 项目结构](#1-项目结构)
- [2. 原子级实现步骤](#2-原子级实现步骤)
- [3. 详细实现计划](#3-详细实现计划)
- [4. 集成计划](#4-集成计划)
- [5. 测试计划](#5-测试计划)

---

## 1. 项目结构

```
src/plugins/rom/
├── __tests__/                    # 测试文件
│   ├── ROMPlugin.test.tsx
│   ├── useROMAnalysis.test.ts
│   └── ROMService.test.ts
├── components/                   # UI 组件
│   ├── ROMCameraStage.tsx        # ROM 摄像头采集界面
│   ├── ROMWorkbench.tsx          # ROM 测量工作台（已存在）
│   ├── ROMReport.tsx             # ROM 报告组件
│   ├── ROMEntryHub.tsx           # ROM 入口界面
│   └── index.ts
├── hooks/                       # 自定义 Hooks
│   ├── useROMAnalysis.ts         # ROM 分析 Hook
│   ├── useROMCamera.ts           # ROM 摄像头 Hook
│   └── index.ts
├── services/                    # 服务层
│   ├── ROMService.ts             # ROM 数据处理服务
│   └── index.ts
├── types/                       # 类型定义
│   └── index.ts
├── constants/                   # 常量定义
│   └── uiText.ts
├── utils/                       # 工具函数
│   └── rom-utils.ts
├── ROMPlugin.tsx                # ROM 插件入口
└── index.ts                     # 插件导出
```

---

## 2. 原子级实现步骤

### **阶段 1：基础架构搭建**

| 步骤 | 任务 | 文件 | 描述 | 时间估计 |
|------|------|------|------|----------|
| 1.1 | 创建 ROM 插件目录结构 | - | 创建完整的目录结构 | 15 分钟 |
| 1.2 | 创建类型定义文件 | types/index.ts | 定义 ROM 相关类型 | 20 分钟 |
| 1.3 | 创建常量定义文件 | constants/uiText.ts | 定义 ROM 相关 UI 文本 | 15 分钟 |
| 1.4 | 创建工具函数 | utils/rom-utils.ts | 实现 ROM 计算工具函数 | 30 分钟 |

### **阶段 2：核心逻辑实现**

| 步骤 | 任务 | 文件 | 描述 | 时间估计 |
|------|------|------|------|----------|
| 2.1 | 创建 ROM 服务 | services/ROMService.ts | 实现 ROM 数据处理逻辑 | 45 分钟 |
| 2.2 | 创建 ROM 分析 Hook | hooks/useROMAnalysis.ts | 实现 ROM 分析逻辑 | 45 分钟 |
| 2.3 | 创建 ROM 摄像头 Hook | hooks/useROMCamera.ts | 实现 ROM 摄像头控制 | 30 分钟 |

### **阶段 3：UI 组件实现**

| 步骤 | 任务 | 文件 | 描述 | 时间估计 |
|------|------|------|------|----------|
| 3.1 | 创建 ROM 入口界面 | components/ROMEntryHub.tsx | ROM 评估入口界面 | 45 分钟 |
| 3.2 | 创建 ROM 摄像头界面 | components/ROMCameraStage.tsx | ROM 测量摄像头界面 | 60 分钟 |
| 3.3 | 创建 ROM 报告组件 | components/ROMReport.tsx | ROM 评估报告组件 | 30 分钟 |
| 3.4 | 更新 ROMWorkbench 组件 | components/ROMWorkbench.tsx | 优化 ROM 测量工作台 | 15 分钟 |

### **阶段 4：插件集成**

| 步骤 | 任务 | 文件 | 描述 | 时间估计 |
|------|------|------|------|----------|
| 4.1 | 创建 ROM 插件主组件 | ROMPlugin.tsx | ROM 插件主组件 | 30 分钟 |
| 4.2 | 集成到主系统 | src/hub/NexusHub.tsx | 在主界面添加 ROM 插件入口 | 15 分钟 |
| 4.3 | 更新工具栏 | src/hub/components/WorkspaceToolbar.tsx | 添加 ROM 工具到工具栏 | 15 分钟 |

### **阶段 5：测试与优化**

| 步骤 | 任务 | 文件 | 描述 | 时间估计 |
|------|------|------|------|----------|
| 5.1 | 编写单元测试 | __tests__/ | 为核心功能编写测试 | 60 分钟 |
| 5.2 | 集成测试 | - | 测试完整的 ROM 评估流程 | 30 分钟 |
| 5.3 | 性能优化 | - | 优化 ROM 评估性能 | 30 分钟 |
| 5.4 | 文档更新 | - | 更新插件开发文档 | 15 分钟 |

---

## 3. 详细实现计划

### **3.1 类型定义 (types/index.ts)**

```typescript
export type JointType = 
  | 'cervical'    // 颈椎
  | 'shoulder'    // 肩关节
  | 'elbow'       // 肘关节
  | 'wrist'       // 腕关节
  | 'hip'         // 髋关节
  | 'knee'        // 膝关节
  | 'ankle';      // 踝关节

export type MovementDirection = 
  | 'flexion'     // 屈曲
  | 'extension'   // 伸展
  | 'abduction'   // 外展
  | 'adduction'   // 内收
  | 'internal_rotation'  // 内旋
  | 'external_rotation'; // 外旋

export interface ROMData {
  joint: JointType;
  direction: MovementDirection;
  side: 'left' | 'right';
  angle: number;
  maxAngle: number;
  minAngle: number;
  timestamp: number;
  confidence: number;
}

export interface ROMAssessment {
  id: string;
  patientId: string;
  sessionId: string;
  createdAt: number;
  data: ROMData[];
  notes?: string;
  status: 'pending' | 'completed' | 'reviewed';
}

export interface ROMReport {
  id: string;
  patientId: string;
  assessmentId: string;
  createdAt: number;
  data: ROMData[];
  summary: string;
  recommendations: string[];
}
```

### **3.2 常量定义 (constants/uiText.ts)**

```typescript
export const ROM_TEXTS = {
  title: '关节活动度评估',
  description: '评估患者各关节的活动范围',
  joints: {
    cervical: '颈椎',
    shoulder: '肩关节',
    elbow: '肘关节',
    wrist: '腕关节',
    hip: '髋关节',
    knee: '膝关节',
    ankle: '踝关节',
  },
  directions: {
    flexion: '屈曲',
    extension: '伸展',
    abduction: '外展',
    adduction: '内收',
    internal_rotation: '内旋',
    external_rotation: '外旋',
  },
  status: {
    normal: '正常',
    limited: '活动受限',
    excessive: '活动过度',
  },
  messages: {
    start: '请开始关节活动',
    measuring: '正在测量...',
    completed: '测量完成',
    save: '保存评估',
  },
};
```

### **3.3 工具函数 (utils/rom-utils.ts)**

```typescript
export const jointNameMap: Record<string, string> = {
  cervical: '颈椎',
  shoulder: '肩关节',
  elbow: '肘关节',
  wrist: '腕关节',
  hip: '髋关节',
  knee: '膝关节',
  ankle: '踝关节',
};

export const directionNameMap: Record<string, string> = {
  flexion: '屈曲',
  extension: '伸展',
  abduction: '外展',
  adduction: '内收',
  internal_rotation: '内旋',
  external_rotation: '外旋',
};

export const normalROMRanges: Record<JointType, Record<MovementDirection, { min: number; max: number }>> = {
  cervical: {
    flexion: { min: 0, max: 45 },
    extension: { min: 0, max: 45 },
    abduction: { min: 0, max: 45 },
    adduction: { min: 0, max: 45 },
    internal_rotation: { min: 0, max: 45 },
    external_rotation: { min: 0, max: 45 },
  },
  // 其他关节的正常范围...
};

export const calculateROMStatus = (joint: JointType, direction: MovementDirection, angle: number): 'normal' | 'limited' | 'excessive' => {
  const range = normalROMRanges[joint]?.[direction];
  if (!range) return 'normal';
  
  if (angle < range.min) return 'limited';
  if (angle > range.max) return 'excessive';
  return 'normal';
};

export const calculateROMScore = (romData: ROMData[]): number => {
  const total = romData.length;
  if (total === 0) return 0;
  
  const normalCount = romData.filter(data => 
    calculateROMStatus(data.joint, data.direction, data.angle) === 'normal'
  ).length;
  
  return Math.round((normalCount / total) * 100);
};
```

### **3.4 ROM 服务 (services/ROMService.ts)**

```typescript
import { db } from '@/lib/db';
import type { ROMAssessment, ROMData } from '../types';
import { nanoid } from 'nanoid';

export const ROMService = {
  /**
   * 保存 ROM 评估数据
   */
  async saveAssessment(assessment: Omit<ROMAssessment, 'id' | 'createdAt'>): Promise<ROMAssessment> {
    const newAssessment: ROMAssessment = {
      ...assessment,
      id: nanoid(12),
      createdAt: Date.now(),
    };
    
    try {
      await db.romAssessments.add(newAssessment);
      return newAssessment;
    } catch (error) {
      console.error('[ROMService] 保存评估失败:', error);
      throw new Error('保存评估失败');
    }
  },
  
  /**
   * 加载患者的 ROM 评估记录
   */
  async loadAssessmentsByPatient(patientId: string): Promise<ROMAssessment[]> {
    try {
      const assessments = await db.romAssessments
        .where('patientId')
        .equals(patientId)
        .reverse()
        .sortBy('createdAt');
      
      return assessments;
    } catch (error) {
      console.error('[ROMService] 加载评估失败:', error);
      return [];
    }
  },
  
  /**
   * 生成 ROM 报告
   */
  generateReport(assessment: ROMAssessment): string {
    const { data } = assessment;
    const score = calculateROMScore(data);
    
    const sections = [
      '# 关节活动度评估报告',
      `## 总体评分: ${score}/100`,
      '## 详细数据',
    ];
    
    data.forEach(item => {
      const status = calculateROMStatus(item.joint, item.direction, item.angle);
      sections.push(`- ${jointNameMap[item.joint]} ${directionNameMap[item.direction]}: ${item.angle.toFixed(1)}° (${ROM_TEXTS.status[status]})`);
    });
    
    return sections.join('\n');
  },
};
```

### **3.5 ROM 分析 Hook (hooks/useROMAnalysis.ts)**

```typescript
import { useState, useCallback } from 'react';
import { usePostureWS } from '@/hooks/usePostureWS';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import type { JointType, MovementDirection } from '../types';

export function useROMAnalysis() {
  const { analyze } = usePostureWS();
  const { 
    activeMeasurements, 
    isMeasuring, 
    startMeasurement, 
    stopMeasurement, 
    resetMeasurement, 
    addMeasurement, 
    removeMeasurement, 
    updateMeasurementData 
  } = useMeasurementStore();
  
  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [selectedDirection, setSelectedDirection] = useState<MovementDirection>('flexion');
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  
  const startROMAssessment = useCallback(() => {
    // 清除现有测量
    resetMeasurement();
    
    // 添加新的测量
    addMeasurement(selectedJoint, selectedDirection, selectedSide);
    
    // 开始测量
    startMeasurement();
  }, [selectedJoint, selectedDirection, selectedSide, resetMeasurement, addMeasurement, startMeasurement]);
  
  const stopROMAssessment = useCallback(() => {
    stopMeasurement();
  }, [stopMeasurement]);
  
  const handleResults = useCallback((results: any, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
    // 处理 ROM 分析结果
    if (isMeasuring && activeMeasurements.length > 0) {
      const measurement = activeMeasurements[0];
      // 从 results 中提取角度数据
      const angle = extractAngleFromResults(results, measurement.joint, measurement.direction, measurement.side);
      updateMeasurementData(measurement.id, angle);
    }
  }, [isMeasuring, activeMeasurements, updateMeasurementData]);
  
  return {
    activeMeasurements,
    isMeasuring,
    selectedJoint,
    selectedDirection,
    selectedSide,
    setSelectedJoint,
    setSelectedDirection,
    setSelectedSide,
    startROMAssessment,
    stopROMAssessment,
    handleResults,
  };
}

// 从结果中提取角度数据
function extractAngleFromResults(results: any, joint: JointType, direction: MovementDirection, side: 'left' | 'right') {
  // 实现角度提取逻辑
  return Math.random() * 180; // 模拟数据
}
```

### **3.6 ROM 摄像头 Hook (hooks/useROMCamera.ts)**

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';

export const useROMCamera = () => {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  const toggleFullscreen = useCallback(() => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  return {
    isCameraOn,
    setIsCameraOn,
    isMirrored,
    setIsMirrored,
    isFullscreen,
    toggleFullscreen,
    videoContainerRef,
  };
};
```

### **3.7 ROM 入口界面 (components/ROMEntryHub.tsx)**

```typescript
import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { COLORS, SIZES, ANIMATIONS } from '@/constants/uiStyles';
import { ROM_TEXTS } from '../constants/uiText';

interface ROMEntryHubProps {
  onStartAssessment: (joint: JointType, direction: MovementDirection, side: 'left' | 'right') => void;
}

export const ROMEntryHub: React.FC<ROMEntryHubProps> = ({ onStartAssessment }) => {
  const joints: JointType[] = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'];
  const directions: MovementDirection[] = ['flexion', 'extension', 'abduction', 'adduction', 'internal_rotation', 'external_rotation'];
  
  return (
    <div className={cn('flex-1 flex flex-col', SIZES.gap.md, 'p-3', ANIMATIONS.fadeIn, ANIMATIONS.zoomIn)}>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2">{ROM_TEXTS.title}</h1>
        <p className="text-slate-400">{ROM_TEXTS.description}</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {joints.map((joint) => (
          <div 
            key={joint}
            className={cn('bento-card-glass p-6 cursor-pointer', COLORS.neutral.light.bgSoft, 'hover:shadow-2xl transition-all')}
          >
            <h3 className="text-xl font-black text-slate-900 mb-4">{ROM_TEXTS.joints[joint]}</h3>
            <div className="space-y-2">
              {directions.map((direction) => (
                <button
                  key={direction}
                  onClick={() => onStartAssessment(joint, direction, 'left')}
                  className={cn('w-full px-4 py-3 text-left rounded-xl', COLORS.neutral.light.hover, 'transition-all')}
                >
                  <div className="flex items-center justify-between">
                    <span>{ROM_TEXTS.directions[direction]}</span>
                    <ArrowRight size={16} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### **3.8 ROM 摄像头界面 (components/ROMCameraStage.tsx)**

```typescript
import React from 'react';
import { Maximize2, Video, VideoOff, Play, Stop, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import BaseWebcamView from '@/components/shared/BaseWebcamView';
import { ROMWorkbench } from './ROMWorkbench';
import { COLORS, SIZES, ANIMATIONS } from '@/constants/uiStyles';
import { ROM_TEXTS } from '../constants/uiText';

interface ROMCameraStageProps {
  videoContainerRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  isCameraOn: boolean;
  isMirrored: boolean;
  isMeasuring: boolean;
  activeMeasurements: any[];
  onResults: (results: any, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  startROMAssessment: () => void;
  stopROMAssessment: () => void;
  resetROMAssessment: () => void;
  setIsCameraOn: (enabled: boolean) => void;
  toggleFullscreen: () => void;
}

export const ROMCameraStage: React.FC<ROMCameraStageProps> = ({
  videoContainerRef,
  isFullscreen,
  isCameraOn,
  isMirrored,
  isMeasuring,
  activeMeasurements,
  onResults,
  startROMAssessment,
  stopROMAssessment,
  resetROMAssessment,
  setIsCameraOn,
  toggleFullscreen,
}) => {
  return (
    <div className="relative w-full h-full">
      {/* 摄像头视图 */}
      <BaseWebcamView
        isCameraOn={isCameraOn}
        isMirrored={isMirrored}
        onResults={onResults}
        className="w-full h-full"
      />
      
      {/* ROM 工作台 */}
      <ROMWorkbench 
        activeMeasurements={activeMeasurements} 
        isMeasuring={isMeasuring} 
      />
      
      {/* 控制按钮 */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-10">
        <button
          onClick={() => setIsCameraOn(!isCameraOn)}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center', COLORS.neutral.slateBg80, 'text-white')}
        >
          {isCameraOn ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        
        {isMeasuring ? (
          <button
            onClick={stopROMAssessment}
            className={cn('w-16 h-16 rounded-full flex items-center justify-center', COLORS.danger.rose, 'text-white shadow-lg')}
          >
            <Stop size={24} />
          </button>
        ) : (
          <button
            onClick={startROMAssessment}
            className={cn('w-16 h-16 rounded-full flex items-center justify-center', COLORS.success.emerald, 'text-white shadow-lg')}
          >
            <Play size={24} />
          </button>
        )}
        
        <button
          onClick={resetROMAssessment}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center', COLORS.neutral.slateBg80, 'text-white')}
        >
          <RotateCcw size={20} />
        </button>
        
        <button
          onClick={toggleFullscreen}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center', COLORS.neutral.slateBg80, 'text-white')}
        >
          <Maximize2 size={20} />
        </button>
      </div>
    </div>
  );
};
```

### **3.9 ROM 报告组件 (components/ROMReport.tsx)**

```typescript
import React from 'react';
import { FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS, SIZES, ANIMATIONS } from '@/constants/uiStyles';
import type { ROMAssessment } from '../types';
import { ROMService } from '../services/ROMService';

interface ROMReportProps {
  assessment: ROMAssessment;
  onExport: (assessment: ROMAssessment) => void;
}

export const ROMReport: React.FC<ROMReportProps> = ({ assessment, onExport }) => {
  const report = ROMService.generateReport(assessment);
  
  return (
    <div className={cn('bento-card p-6', ANIMATIONS.fadeIn)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', COLORS.primary.blueBg, 'text-blue-500')}>
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">关节活动度评估报告</h3>
            <p className="text-slate-400 text-sm">{new Date(assessment.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <button
          onClick={() => onExport(assessment)}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-xl', COLORS.primary.blue, 'text-white')}
        >
          <Download size={16} />
          导出报告
        </button>
      </div>
      
      <div className="prose max-w-none">
        {report.split('\n').map((line, index) => {
          if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-black mb-4">{line.substring(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-bold mb-2">{line.substring(3)}</h2>;
          }
          if (line.startsWith('- ')) {
            return <li key={index} className="mb-1">{line.substring(2)}</li>;
          }
          return <p key={index}>{line}</p>;
        })}
      </div>
    </div>
  );
};
```

### **3.10 ROM 插件主组件 (ROMPlugin.tsx)**

```typescript
import React, { useState } from 'react';
import { useROMAnalysis } from './hooks/useROMAnalysis';
import { useROMCamera } from './hooks/useROMCamera';
import { ROMEntryHub } from './components/ROMEntryHub';
import { ROMCameraStage } from './components/ROMCameraStage';
import { ROMReport } from './components/ROMReport';
import { ROMService } from './services/ROMService';
import type { JointType, MovementDirection, ROMAssessment } from './types';

export const ROMPlugin: React.FC = () => {
  const [isEntryMode, setIsEntryMode] = useState(true);
  const [isReportMode, setIsReportMode] = useState(false);
  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [selectedDirection, setSelectedDirection] = useState<MovementDirection>('flexion');
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  const [assessment, setAssessment] = useState<ROMAssessment | null>(null);
  
  const { 
    activeMeasurements,
    isMeasuring,
    startROMAssessment,
    stopROMAssessment,
    handleResults,
  } = useROMAnalysis();
  
  const { 
    videoContainerRef,
    isFullscreen,
    isCameraOn,
    isMirrored,
    toggleFullscreen,
    setIsCameraOn,
  } = useROMCamera();
  
  const handleStartAssessment = (joint: JointType, direction: MovementDirection, side: 'left' | 'right') => {
    setSelectedJoint(joint);
    setSelectedDirection(direction);
    setSelectedSide(side);
    setIsEntryMode(false);
    setIsReportMode(false);
  };
  
  const handleStopAssessment = async () => {
    stopROMAssessment();
    
    // 保存评估数据
    const newAssessment = await ROMService.saveAssessment({
      patientId: 'temp-patient', // 实际应用中从患者选择获取
      sessionId: 'temp-session',
      data: activeMeasurements.map(m => ({
        joint: m.joint,
        direction: m.direction,
        side: m.side,
        angle: m.currentAngle,
        maxAngle: m.maxAngle,
        minAngle: m.minAngle,
        timestamp: Date.now(),
        confidence: 0.95,
      })),
      status: 'completed',
    });
    
    setAssessment(newAssessment);
    setIsReportMode(true);
  };
  
  const handleResetAssessment = () => {
    setIsEntryMode(true);
    setIsReportMode(false);
    setAssessment(null);
  };
  
  const handleExport = (assessment: ROMAssessment) => {
    // 实现导出逻辑
    console.log('Exporting assessment:', assessment);
  };
  
  if (isEntryMode) {
    return <ROMEntryHub onStartAssessment={handleStartAssessment} />;
  }
  
  if (isReportMode && assessment) {
    return (
      <div className="h-full p-8 overflow-y-auto">
        <ROMReport assessment={assessment} onExport={handleExport} />
        <button
          onClick={handleResetAssessment}
          className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl"
        >
          重新评估
        </button>
      </div>
    );
  }
  
  return (
    <ROMCameraStage
      videoContainerRef={videoContainerRef}
      isFullscreen={isFullscreen}
      isCameraOn={isCameraOn}
      isMirrored={isMirrored}
      isMeasuring={isMeasuring}
      activeMeasurements={activeMeasurements}
      onResults={handleResults}
      startROMAssessment={startROMAssessment}
      stopROMAssessment={handleStopAssessment}
      resetROMAssessment={handleResetAssessment}
      setIsCameraOn={setIsCameraOn}
      toggleFullscreen={toggleFullscreen}
    />
  );
};
```

---

## 4. 集成计划

### **4.1 更新主系统配置**

1. **添加 ROM 插件到 NexusHub**
   - 修改 `src/hub/NexusHub.tsx`，添加 ROM 插件路由

2. **更新 WorkspaceToolbar**
   - 修改 `src/hub/components/WorkspaceToolbar.tsx`，添加 ROM 工具到工具栏

3. **更新类型定义**
   - 修改 `src/types/assessment.ts`，添加 ROM 相关类型

4. **更新数据库配置**
   - 修改 `src/lib/db.ts`，添加 ROM 评估存储

---

## 5. 测试计划

### **5.1 单元测试**

| 测试文件 | 测试内容 |
|---------|---------|
| ROMPlugin.test.tsx | 测试 ROM 插件渲染和状态管理 |
| useROMAnalysis.test.ts | 测试 ROM 分析 Hook 逻辑 |
| ROMService.test.ts | 测试 ROM 服务数据处理 |

### **5.2 集成测试**

1. **完整 ROM 评估流程测试**
   - 从入口选择关节和方向
   - 开始测量
   - 停止测量
   - 查看报告
   - 导出报告

2. **性能测试**
   - 测量 ROM 分析的响应时间
   - 测试摄像头实时数据处理性能

3. **兼容性测试**
   - 测试不同浏览器兼容性
   - 测试不同设备兼容性

---

## 6. 时间估计

| 阶段 | 时间估计 |
|------|----------|
| 基础架构搭建 | 1.5 小时 |
| 核心逻辑实现 | 2.5 小时 |
| UI 组件实现 | 3 小时 |
| 插件集成 | 1 小时 |
| 测试与优化 | 2 小时 |
| **总计** | **10 小时** |

---

## 7. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 角度计算准确性 | 高 | 实现基于 MediaPipe 的精确角度计算 |
| 性能问题 | 中 | 优化实时数据处理，使用 Web Workers |
| 浏览器兼容性 | 低 | 测试主流浏览器，使用 polyfills |
| 用户体验 | 中 | 提供清晰的操作指导和反馈 |

---

## 8. 成功标准

1. ✅ ROM 插件能够正常运行
2. ✅ 能够准确测量关节活动度
3. ✅ 能够生成详细的评估报告
4. ✅ 能够导出评估数据
5. ✅ 集成到主系统中
6. ✅ 测试覆盖率达到 80% 以上
7. ✅ 性能满足实时要求

---

## 9. 后续优化方向

1. **AI 辅助分析**：使用 AI 分析 ROM 数据，提供更详细的诊断建议
2. **历史对比**：实现 ROM 数据的历史对比功能
3. **云端存储**：支持 ROM 数据的云端存储和同步
4. **多语言支持**：添加多语言支持
5. **移动设备适配**：优化移动设备上的用户体验

---

## 10. 结论

本计划提供了一个完整的 ROM 评估插件实现方案，按照原子级步骤进行开发，确保代码质量和功能完整性。通过严格遵循插件开发规范，保证了代码的一致性和可维护性。

**预计完成时间**：10 小时
**预期结果**：功能完整、性能良好的 ROM 评估插件
