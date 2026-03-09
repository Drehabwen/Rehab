import React from 'react';
import { ArrowRight, Layers, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssessmentType } from '../store/usePostureAssessmentStore';

export type AssessmentMode = 'realtime' | 'stepped';

interface EntryHubProps {
  onSelectMode: (mode: AssessmentMode, view: 'front' | 'side' | 'back', assessmentType: AssessmentType) => void;
}

const modeCards: Array<{
  id: AssessmentType;
  icon: typeof Layers;
  title: string;
  subtitle: string;
  cost: string;
  scene: string;
  output: string;
  accent: string;
}> = [
  {
    id: 'standard',
    icon: Layers,
    title: '标准评估',
    subtitle: '三视角完整评估',
    cost: '3-5 分钟',
    scene: '首诊、复评、报告生成',
    output: '完整指标 + 结构化分析报告',
    accent: 'from-blue-600 to-cyan-500',
  },
  {
    id: 'quick',
    icon: Zap,
    title: '快速评估',
    subtitle: '单视角快速筛查',
    cost: '1-2 分钟',
    scene: '门诊快速筛查、训练前后检查',
    output: '关键指标 + 快速结论',
    accent: 'from-emerald-600 to-teal-500',
  },
];

export const Vision3EntryHub: React.FC<EntryHubProps> = ({ onSelectMode }) => {
  return (
    <div className="flex-1 min-h-0">
      <section className="rehab-page-title">
        <h1>体态分析</h1>
        <p>请选择评估模式，2 秒内完成模式决策。</p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mt-4">
        {modeCards.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectMode('stepped', 'front', mode.id)}
            className="bento-card p-5 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br text-white flex items-center justify-center', mode.accent)}>
                <mode.icon size={20} />
              </div>
              <span className="status-badge status-processing">{mode.cost}</span>
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">{mode.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{mode.subtitle}</p>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div><span className="text-slate-400">适用场景：</span>{mode.scene}</div>
              <div><span className="text-slate-400">输出差异：</span>{mode.output}</div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center text-sm font-medium text-antey-primary">
              开始评估
              <ArrowRight size={14} className="ml-1" />
            </div>
          </button>
        ))}
      </section>
    </div>
  );
};
