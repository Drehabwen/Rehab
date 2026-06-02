import React from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui';
import type { SessionReportOutput } from '@/types/report-center';

interface ReportInsightsListProps {
  generatedSessionReport: SessionReportOutput | undefined;
  insightCards: Array<{
    id: string;
    title: string;
    summary: string;
    evidence: string[];
    action: string;
  }>;
  recommendationCards: string[];
}

const trimText = (value: string | null | undefined, maxLength = 120) => {
  if (!value) return '当前模块尚未生成结构化摘要。';
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return '当前模块尚未生成结构化摘要。';
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength)}...`;
};

export const ReportInsightsList: React.FC<ReportInsightsListProps> = ({
  generatedSessionReport,
  insightCards,
  recommendationCards,
}) => {
  const displayInsights = generatedSessionReport?.insights?.length
    ? generatedSessionReport.insights.map((insight, index) => ({
        id: `insight-${index}`,
        title: `AI 分析 ${index + 1}`,
        summary: trimText(insight, 140),
        evidence: [],
        action: '用于生成综合报告结论。',
      }))
    : insightCards;

  return (
    <div className="space-y-4">
      <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-[0.14em] text-slate-400">综合判断</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">AI 分析</h2>
            <p className="mt-1 text-sm text-slate-500">将多模块结果压缩成短结论卡片，帮助快速判断本次接诊重点。</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <Brain size={18} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {displayInsights.map((card) => (
            <div key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">{card.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.summary}</p>
              {'evidence' in card && card.evidence && (card.evidence as string[]).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(card.evidence as string[]).map((evidence) => (
                    <span key={evidence} className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">
                      {evidence}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 text-xs text-slate-500">{card.action}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-[0.14em] text-slate-400">执行建议</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">康复建议</h2>
            <p className="mt-1 text-sm text-slate-500">只保留可执行建议，避免长段文字占据页面注意力。</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <Sparkles size={18} />
          </div>
        </div>

        {recommendationCards.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            生成综合报告或康复建议后，这里会展示结构化建议卡片。
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {recommendationCards.map((recommendation, index) => (
              <div key={`${recommendation}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">建议 {index + 1}</div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
