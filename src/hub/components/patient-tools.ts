import {
  Activity,
  Mic,
  Scale,
  Footprints,
  Layers,
  CircleDot,
  BarChart3,
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
    id: 'medvoice',
    name: '语音接诊',
    description: '实时语音转写并结构化生成病历要点。',
    icon: Mic,
    color: 'from-violet-600 to-purple-500',
    category: 'record',
    available: true,
  },
  {
    id: 'vision3',
    name: '体态分析',
    description: '基于视觉关键点进行体态评估和问题识别。',
    icon: Activity,
    color: 'from-blue-600 to-cyan-500',
    category: 'assessment',
    available: true,
  },
  {
    id: 'rom',
    name: '关节活动度',
    description: '测量关节活动范围并输出左右侧差异。',
    icon: Layers,
    color: 'from-green-600 to-emerald-500',
    category: 'assessment',
    available: true,
  },
  {
    id: 'comparison',
    name: '前后对比',
    description: '对比不同时间的评估结果并显示改善趋势。',
    icon: BarChart3,
    color: 'from-cyan-600 to-teal-500',
    category: 'analysis',
    available: true,
  },
  {
    id: 'balance',
    name: '平衡评估',
    description: '静态与动态平衡评估，识别跌倒风险。',
    icon: CircleDot,
    color: 'from-amber-500 to-orange-500',
    category: 'assessment',
    available: false,
  },
  {
    id: 'scale',
    name: '量表评估',
    description: '标准化量表采集疼痛、功能与生活质量。',
    icon: Scale,
    color: 'from-teal-600 to-emerald-500',
    category: 'record',
    available: false,
  },
  {
    id: 'gait',
    name: '步态分析',
    description: '分析步态参数，定位异常步态模式。',
    icon: Footprints,
    color: 'from-rose-500 to-pink-500',
    category: 'assessment',
    available: false,
  },
];
