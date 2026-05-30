import React from 'react';
import { ArrowRight, Layers, Sparkles, Zap, Target, Check, X, Compass } from 'lucide-react';
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
  icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
  cost: string;
  scene: string;
  output: string;
  highlights: string[];
  accent: string;
  recommended?: boolean;
  recommendation?: string;
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
    recommendation: '适合需要完整报告 and 精细复评的场景',
  },
  {
    id: 'adams',
    icon: Compass,
    title: '亚当斯前屈评估',
    subtitle: '脊柱侧弯前屈专项筛查',
    cost: '2-3 分钟',
    scene: '脊柱专项筛查、ATR旋转角标定',
    output: 'ATR度数 + 躯干对称性 + 铅垂线图像',
    highlights: ['前屈筛查', 'ATR标定', '侧弯转诊警告'],
    accent: 'from-purple-600 to-indigo-500',
    recommendation: '适合脊柱健康筛查，利用CV对齐网格及临床量表',
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
    recommended: true,
    recommendation: '推荐先从这里开始，最快进入拍摄并完成初筛',
  },
];

export const Vision3EntryHub: React.FC<EntryHubProps> = ({ onSelectMode }) => {
  const detailTextClass = cn('text-sm', COLORS.neutral.light.textMuted);
  const featureChipClass = cn(
    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
    COLORS.neutral.light.border,
    COLORS.neutral.light.bgSoft,
    COLORS.neutral.light.textMuted,
  );
  const secondaryActionButtonClass = cn(
    'inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium transition-colors',
    COLORS.neutral.light.border,
    COLORS.neutral.light.text,
    COLORS.neutral.light.bg,
    COLORS.neutral.light.hover,
  );

  return (
    <div className="min-h-0 flex-1">
      <section className="rehab-page-title">
        <h1>体态分析</h1>
        <p>请选择评估模式，2 秒内完成模式决策。</p>
      </section>

      <section className="mt-6 grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
        {modeCards.map((mode) => {
          const isQuick = mode.id === 'quick';
          const isAdams = mode.id === 'adams';

          const articleClassName = cn(
            'relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 transition-all duration-300',
            isQuick
              ? 'border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))] shadow-[0_18px_50px_rgba(16,185,129,0.10)] ring-1 ring-emerald-100'
              : isAdams
                ? 'border-purple-200 bg-[linear-gradient(180deg,rgba(250,245,255,0.96),rgba(255,255,255,0.98))] shadow-[0_18px_50px_rgba(147,51,234,0.08)] ring-1 ring-purple-100'
                : 'border-slate-200 bg-white/96 shadow-[0_12px_36px_rgba(15,23,42,0.06)] hover:border-slate-300'
          );

          const timeBadgeClassName = isQuick
            ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
            : isAdams
              ? 'border-purple-200 bg-purple-100 text-purple-700'
              : 'border-blue-200 bg-blue-50 text-blue-700';

          return (
            <article key={mode.id} className={articleClassName}>
              {mode.recommended ? (
                <div className="absolute right-5 top-5 inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                  推荐路径
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3 pr-24">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm', COLORS.neutral.whiteText, mode.accent)}>
                  <mode.icon size={20} />
                </div>
                <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', timeBadgeClassName)}>
                  {mode.cost}
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-2">
                  <h3 className={cn('text-xl font-semibold tracking-tight', COLORS.neutral.light.text)}>{mode.title}</h3>
                  {mode.recommended ? <span className="text-xs font-medium text-emerald-600">优先推荐</span> : null}
                </div>
                <p className={cn('mt-1 text-sm', COLORS.neutral.slate500)}>{mode.subtitle}</p>
                {mode.recommendation ? (
                  <p className={cn('mt-3 text-sm leading-6', isQuick ? 'text-emerald-700' : isAdams ? 'text-purple-700' : 'text-slate-500')}>
                    {mode.recommendation}
                  </p>
                ) : null}
              </div>

              <div className={cn('mt-5 border-t pt-4', COLORS.neutral.light.border)}>
                {mode.id === 'standard' ? (
                  <div className="space-y-3">
                    <button
                      type="button"
                      aria-label="开始标准评估"
                      onClick={() => onSelectMode('stepped', 'front', 'standard')}
                      className={cn(secondaryActionButtonClass, 'w-full justify-between text-antey-primary')}
                    >
                      开始标准评估
                      <ArrowRight size={14} />
                    </button>
                    <p className="text-xs leading-5 text-slate-400">适合需要完整三视角信息、生成正式报告或做复评时使用。</p>
                  </div>
                ) : mode.id === 'adams' ? (
                  <div className="space-y-4">
                    <button
                      type="button"
                      aria-label="开始亚当斯评估"
                      onClick={() => onSelectMode('stepped', 'back', 'adams')}
                      className="inline-flex h-14 w-full items-center justify-between rounded-2xl bg-purple-600 px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(147,51,234,0.26)] transition-all duration-200 hover:bg-purple-500 hover:shadow-[0_16px_32px_rgba(147,51,234,0.30)]"
                    >
                      <span className="flex flex-col items-start text-left">
                        <span>开始亚当斯评估</span>
                        <span className="mt-1 text-xs font-medium text-purple-100">默认背面视角，网格对齐辅助</span>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                    <p className="text-xs leading-5 text-slate-400">结合CV网格定位与临床量表标定，脊柱侧弯筛查的黄金标准。</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      type="button"
                      aria-label="开始快速评估"
                      onClick={() => onSelectMode('stepped', 'front', 'quick')}
                      className="inline-flex h-14 w-full items-center justify-between rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(16,185,129,0.26)] transition-all duration-200 hover:bg-emerald-500 hover:shadow-[0_16px_32px_rgba(16,185,129,0.30)]"
                    >
                      <span className="flex flex-col items-start text-left">
                        <span>开始快速评估</span>
                        <span className="mt-1 text-xs font-medium text-emerald-100">默认正面视角，进入后可立即拍摄</span>
                      </span>
                      <ArrowRight size={16} />
                    </button>

                    <div className="rounded-2xl border border-emerald-100 bg-white/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className={cn('text-xs font-medium uppercase tracking-[0.18em]', COLORS.neutral.light.textLight)}>
                            切换视角
                          </p>
                          <p className={cn('mt-1 text-sm', COLORS.neutral.slate500)}>如果你要从侧面或背面开始，也可以直接选择。</p>
                        </div>
                        <span className="text-xs font-medium text-emerald-600">选择后直接进入拍摄</span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {quickViewOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-label={`快速评估：${option.label}`}
                            onClick={() => onSelectMode('stepped', option.value, 'quick')}
                            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            {`${option.label}开始`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={cn('mt-5 grid gap-3 rounded-2xl border p-4', COLORS.neutral.light.border, isQuick ? 'border-emerald-100 bg-emerald-50/50' : isAdams ? 'border-purple-100 bg-purple-50/50' : 'bg-slate-50/70')}>
                <div className={cn('grid gap-1.5', detailTextClass)}>
                  <div><span className={COLORS.neutral.light.textLight}>适用场景：</span>{mode.scene}</div>
                  <div><span className={COLORS.neutral.light.textLight}>输出差异：</span>{mode.output}</div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {mode.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className={cn(
                        featureChipClass,
                        isQuick && 'border-emerald-200 bg-white text-emerald-700',
                        isAdams && 'border-purple-200 bg-white text-purple-700',
                      )}
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
