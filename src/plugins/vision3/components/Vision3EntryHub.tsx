import React from 'react';
import { ArrowRight, Layers, Zap } from 'lucide-react';
import { COLORS } from '@/constants/uiStyles';
import { cn } from '@/lib/utils';
import { AssessmentType } from '../store/usePostureAssessmentStore';

export type AssessmentMode = 'realtime' | 'stepped';

const quickViewOptions = [
  { value: 'front', label: '正面' },
  { value: 'side', label: '侧面' },
  { value: 'back', label: '背面' },
] as const;

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
  highlights: string[];
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
    highlights: ['数据完整', '诊断准确', '全面分析'],
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
    highlights: ['即时反馈', '快速筛查', '初步检查'],
    accent: 'from-emerald-600 to-teal-500',
  },
];

export const Vision3EntryHub: React.FC<EntryHubProps> = ({ onSelectMode }) => {
  const cardShellClass = cn(
    'bento-card flex h-full flex-col p-5 transition-colors',
    COLORS.neutral.light.hover,
  );
  const detailTextClass = cn('text-sm', COLORS.neutral.light.textMuted);
  const featureChipClass = cn(
    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
    COLORS.neutral.light.border,
    COLORS.neutral.light.bgSoft,
    COLORS.neutral.light.textMuted,
  );
  const actionButtonClass = cn(
    'inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium transition-colors',
    COLORS.neutral.light.border,
    COLORS.neutral.light.text,
    COLORS.neutral.light.bg,
    COLORS.neutral.light.hover,
  );

  return (
    <div className="flex-1 min-h-0">
      <section className="rehab-page-title">
        <h1>体态分析</h1>
        <p>请选择评估模式，2 秒内完成模式决策。</p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mt-4">
        {modeCards.map((mode) => (
          <article key={mode.id} className={cardShellClass}>
            <div className="flex items-start justify-between gap-3">
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br', COLORS.neutral.whiteText, mode.accent)}>
                <mode.icon size={20} />
              </div>
              <span className="status-badge status-processing">{mode.cost}</span>
            </div>

            <h3 className={cn('mt-4 text-lg font-semibold', COLORS.neutral.light.text)}>{mode.title}</h3>
            <p className={cn('mt-1 text-sm', COLORS.neutral.slate500)}>{mode.subtitle}</p>

            <div className={cn('mt-4 space-y-2', detailTextClass)}>
              <div><span className={COLORS.neutral.light.textLight}>适用场景：</span>{mode.scene}</div>
              <div><span className={COLORS.neutral.light.textLight}>输出差异：</span>{mode.output}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {mode.highlights.map((highlight) => (
                <span key={highlight} className={featureChipClass}>
                  {highlight}
                </span>
              ))}
            </div>

            <div className={cn('mt-5 border-t pt-4', COLORS.neutral.light.border)}>
              {mode.id === 'standard' ? (
                <button
                  type="button"
                  aria-label="开始标准评估"
                  onClick={() => onSelectMode('stepped', 'front', 'standard')}
                  className={cn(actionButtonClass, 'w-full justify-between text-antey-primary')}
                >
                  开始标准评估
                  <ArrowRight size={14} />
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={cn('text-xs font-medium uppercase tracking-[0.18em]', COLORS.neutral.light.textLight)}>
                        快速视角
                      </p>
                      <p className={cn('mt-1 text-sm', COLORS.neutral.slate500)}>选择一个视角直接开始。</p>
                    </div>
                    <span className={cn('text-xs font-medium', COLORS.neutral.light.textMuted)}>单击即进入</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {quickViewOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-label={`快速评估：${option.label}`}
                        onClick={() => onSelectMode('stepped', option.value, 'quick')}
                        className={cn(actionButtonClass, 'justify-center')}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};
