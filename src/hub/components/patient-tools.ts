import { 
  Activity, 
  Mic, 
  Scale,
  Footprints,
  Layers,
  CircleDot
} from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: string;
  available: boolean;
}

export const tools: Tool[] = [
  {
    id: 'vision3',
    name: '体态分析',
    description: '基于 MediaPipe 全身关键点追踪，实时捕捉身体细微偏差',
    icon: Activity,
    color: 'from-antey-primary to-cyan-400',
    category: 'assessment',
    available: true
  },
  {
    id: 'medvoice',
    name: '语音接诊',
    description: '语音转文字记录患者主诉，自动生成病历摘要',
    icon: Mic,
    color: 'from-blue-500 to-indigo-500',
    category: 'record',
    available: true
  },
  {
    id: 'rom',
    name: '关节活动度',
    description: '测量关节活动范围，评估运动功能受限程度',
    icon: Layers,
    color: 'from-violet-500 to-purple-500',
    category: 'assessment',
    available: false
  },
  {
    id: 'balance',
    name: '平衡评估',
    description: '静态动态平衡能力测试，评估跌倒风险',
    icon: CircleDot,
    color: 'from-amber-500 to-orange-500',
    category: 'assessment',
    available: false
  },
  {
    id: 'scale',
    name: '量表评估',
    description: '标准化问卷评估 pain/功能/生活质量',
    icon: Scale,
    color: 'from-emerald-500 to-teal-500',
    category: 'record',
    available: false
  },
  {
    id: 'gait',
    name: '步态分析',
    description: '行走模式分析，识别异常步态特征',
    icon: Footprints,
    color: 'from-rose-500 to-pink-500',
    category: 'assessment',
    available: false
  }
];
