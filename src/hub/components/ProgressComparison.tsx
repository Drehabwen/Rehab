import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  Download,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader,
  CheckCircle,
} from 'lucide-react';
import { useComparisonStore } from '@/store/useComparisonStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { TrendChart } from './TrendChart';
import { cn } from '@/lib/utils';
import { StatePanel, PageTitleSection, UnifiedStatusBadge } from '@/components/layout';
import { COLORS } from '@/constants/uiStyles';

interface ProgressComparisonProps {
  patientId: string;
  patientName?: string;
  onBack: () => void;
}

const metricStatusTone: Record<'improved' | 'stable' | 'worsened', 'success' | 'processing' | 'warning'> = {
  improved: 'success',
  stable: 'processing',
  worsened: 'warning',
};

const metricStatusText: Record<'improved' | 'stable' | 'worsened', string> = {
  improved: '改善',
  stable: '稳定',
  worsened: '恶化',
};

const selectInputClass = 'w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm';
const sectionTitleClass = cn('text-base font-semibold', COLORS.neutral.light.text);
const bodyTextClass = cn('text-sm', COLORS.neutral.slate500);
const labelTextClass = cn('block mb-1 text-sm', COLORS.neutral.light.textMuted);
const loadingTextClass = cn('flex items-center gap-2', COLORS.neutral.light.textSoft);
const tableHeaderClass = 'grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_0.8fr] gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 text-xs text-slate-500';
const tableRowClass = 'grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_0.8fr] gap-3 px-4 py-3 items-center hover:bg-slate-50/80';
const numberTextClass = cn('text-sm tabular-nums', COLORS.neutral.light.textSoft);
const metricNameClass = cn('text-sm font-medium', COLORS.neutral.light.text);
const metaTextClass = cn('text-xs', COLORS.neutral.slate500);
const scoreLabelClass = bodyTextClass;
const scoreValueClass = (score: number) => cn('mt-1 text-4xl font-semibold', score > 0 ? 'text-emerald-600' : score < 0 ? 'text-red-600' : COLORS.neutral.light.textSoft);
const deltaTextClass = (value: number) => cn('text-sm tabular-nums', value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : COLORS.neutral.light.textSoft);

export const ProgressComparison: React.FC<ProgressComparisonProps> = ({
  patientId,
  patientName,
  onBack,
}) => {
  const {
    comparison,
    trendData,
    isLoading,
    error,
    loadComparison,
    loadTrendData,
    clearComparison,
    getRecommendedBaseline,
    getRecommendedCurrent,
  } = useComparisonStore();

  const { assessments } = useAssessmentStore();

  const [selectedBaseline, setSelectedBaseline] = useState('');
  const [selectedCurrent, setSelectedCurrent] = useState('');
  const [isRecommending, setIsRecommending] = useState(true);

  useEffect(() => {
    loadTrendData(patientId);

    const loadRecommendations = async () => {
      setIsRecommending(true);
      const [baselineId, currentId] = await Promise.all([
        getRecommendedBaseline(patientId),
        getRecommendedCurrent(patientId),
      ]);
      if (baselineId) setSelectedBaseline(baselineId);
      if (currentId) setSelectedCurrent(currentId);
      setIsRecommending(false);
    };

    loadRecommendations();

    return () => clearComparison();
  }, [patientId, loadTrendData, clearComparison, getRecommendedBaseline, getRecommendedCurrent]);

  const completedAssessments = useMemo(() => {
    return assessments
      .filter((a) => a.patientId === patientId && a.status === 'completed')
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [assessments, patientId]);

  const hasEnoughAssessments = completedAssessments.length >= 2;
  const hasSelection = Boolean(selectedBaseline && selectedCurrent);
  const isSameSelection = Boolean(selectedBaseline && selectedBaseline === selectedCurrent);
  const canCompare = hasSelection && !isSameSelection;

  const pageState: 'insufficient' | 'selectable' | 'generated' = !hasEnoughAssessments
    ? 'insufficient'
    : comparison
      ? 'generated'
      : 'selectable';

  const pageStateBadge =
    pageState === 'insufficient'
      ? { status: 'warning' as const, text: '记录不足' }
      : pageState === 'generated'
        ? { status: 'success' as const, text: '已生成对比结果' }
        : { status: 'processing' as const, text: '可选择对比' };

  const handleCompare = async () => {
    if (!canCompare) return;
    await loadComparison(patientId, selectedBaseline, selectedCurrent);
  };

  const applyRecommendations = async () => {
    setIsRecommending(true);
    const [baselineId, currentId] = await Promise.all([
      getRecommendedBaseline(patientId),
      getRecommendedCurrent(patientId),
    ]);
    if (baselineId) setSelectedBaseline(baselineId);
    if (currentId) setSelectedCurrent(currentId);
    setIsRecommending(false);
  };

  const handleExportJson = () => {
    if (!comparison) return;
    const dataStr = JSON.stringify(comparison, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${comparison.patientId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportCsv = () => {
    if (!comparison) return;

    let csvContent = 'metric,label,unit,baseline,current,change,improvement,status\n';
    comparison.metrics.forEach((m) => {
      csvContent += `${m.key},${m.label},${m.unit},${m.baseline},${m.current},${m.change},${m.improvement},${m.status}\n`;
    });
    csvContent += `\noverall_score,,${comparison.overallScore}\n`;
    csvContent += `comparison_date,,${new Date(comparison.comparisonDate).toLocaleString('zh-CN')}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${comparison.patientId}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportMarkdown = () => {
    if (!comparison) return;

    let markdown = '# 前后对比报告\n\n';
    markdown += `- 患者 ID: ${comparison.patientId}\n`;
    markdown += `- 对比日期: ${new Date(comparison.comparisonDate).toLocaleString('zh-CN')}\n`;
    markdown += `- 基线评估: ${new Date(comparison.baselineSnapshot.createdAt).toLocaleDateString('zh-CN')}\n`;
    markdown += `- 当前评估: ${new Date(comparison.currentSnapshot.createdAt).toLocaleDateString('zh-CN')}\n\n`;
    markdown += `## 综合改善率\n\n**${comparison.overallScore > 0 ? '+' : ''}${comparison.overallScore}%**\n\n`;
    markdown += '## 指标对比\n\n';

    comparison.metrics.forEach((m) => {
      markdown += `- ${m.label}: ${m.baseline}${m.unit} -> ${m.current}${m.unit} (变化 ${m.change > 0 ? '+' : ''}${m.change}, 改善率 ${m.improvement}%)\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-report-${comparison.patientId}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner">
        <PageTitleSection
          title="前后对比"
          description={patientName ? `${patientName} · 疗效趋势分析` : '疗效趋势分析'}
          right={
            <>
              <UnifiedStatusBadge status={pageStateBadge.status} text={pageStateBadge.text} />
              <button className="btn-secondary" onClick={onBack}>
                <ChevronLeft size={14} />
                返回
              </button>
            </>
          }
        />

        {!hasEnoughAssessments ? (
          <StatePanel
            title="记录不足，暂时无法对比"
            description={`至少需要 2 次完整评估记录，当前仅有 ${completedAssessments.length} 次。`}
            actions={
              <>
                <button className="btn-primary" onClick={onBack}>去完成首次评估</button>
                <button className="btn-secondary" onClick={onBack}>查看历史记录</button>
              </>
            }
          />
        ) : (
          <section className="bento-card p-6">
            <h3 className={sectionTitleClass}>选择对比记录</h3>
            <p className={cn(bodyTextClass, 'mt-1')}>基线建议选择更早记录，当前建议选择最新记录。</p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelTextClass}>基线记录</label>
                <select
                  value={selectedBaseline}
                  onChange={(e) => setSelectedBaseline(e.target.value)}
                  className={selectInputClass}
                >
                  <option value="">请选择基线评估</option>
                  {completedAssessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.createdAt).toLocaleDateString('zh-CN')} · {a.mode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelTextClass}>当前记录</label>
                <select
                  value={selectedCurrent}
                  onChange={(e) => setSelectedCurrent(e.target.value)}
                  className={selectInputClass}
                >
                  <option value="">请选择当前评估</option>
                  {completedAssessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.createdAt).toLocaleDateString('zh-CN')} · {a.mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isSameSelection ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                基线记录和当前记录不能相同，请重新选择。
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={handleCompare}
                disabled={!canCompare || isLoading}
                className={cn('btn-primary', (!canCompare || isLoading) && 'opacity-50 cursor-not-allowed')}
              >
                {isLoading ? <Loader size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                生成对比结果
              </button>
              <button onClick={applyRecommendations} disabled={isRecommending} className="btn-secondary">
                {isRecommending ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                应用智能推荐
              </button>
            </div>
          </section>
        )}

        {isLoading ? (
          <section className="bento-card p-6">
            <div className={loadingTextClass}>
              <Loader size={16} className="animate-spin" />
              <span className="text-sm">正在生成对比结果，请稍候...</span>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="bento-card p-6 bg-red-50 border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900">对比生成失败</h4>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <button className="btn-secondary mt-3" onClick={handleCompare}>重试</button>
              </div>
            </div>
          </section>
        ) : null}

        {comparison && !isLoading ? (
          <>
            <section className="bento-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className={scoreLabelClass}>综合改善率</div>
                <div className={scoreValueClass(comparison.overallScore)}>
                  {comparison.overallScore > 0 ? '+' : ''}
                  {comparison.overallScore}%
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleExportJson} className="btn-secondary"><Download size={14} /> JSON</button>
                <button onClick={handleExportCsv} className="btn-secondary"><Download size={14} /> CSV</button>
                <button onClick={handleExportMarkdown} className="btn-primary"><FileText size={14} /> 导出报告</button>
              </div>
            </section>

            <section className="bento-card p-0 overflow-hidden">
              <div className={tableHeaderClass}>
                <span>指标</span>
                <span>基线</span>
                <span>当前</span>
                <span>变化</span>
                <span>改善率</span>
                <span>状态</span>
              </div>

              <div className="divide-y divide-slate-200">
                {comparison.metrics.map((metric) => (
                  <div key={metric.key} className={tableRowClass}>
                    <div>
                      <p className={metricNameClass}>{metric.label}</p>
                      <p className={cn(metaTextClass, 'mt-1')}>单位：{metric.unit}</p>
                    </div>
                    <span className={numberTextClass}>{metric.baseline}{metric.unit}</span>
                    <span className={numberTextClass}>{metric.current}{metric.unit}</span>
                    <span className={deltaTextClass(metric.change)}>
                      {metric.change > 0 ? '+' : ''}{metric.change}
                    </span>
                    <span className={deltaTextClass(metric.improvement)}>
                      {metric.improvement > 0 ? '+' : ''}{metric.improvement}%
                    </span>
                    <UnifiedStatusBadge status={metricStatusTone[metric.status]} text={metricStatusText[metric.status]} />
                  </div>
                ))}
              </div>
            </section>

            {trendData.length > 0 ? (
              <section>
                <h3 className={cn(sectionTitleClass, 'mb-3')}>历史趋势</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comparison.metrics.slice(0, 4).map((metric) => (
                    <TrendChart
                      key={metric.key}
                      data={trendData}
                      metricKey={metric.key}
                      metricLabel={metric.label}
                      unit={metric.unit}
                      color={metric.status === 'improved' ? '#16a34a' : metric.status === 'worsened' ? '#dc2626' : '#64748b'}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};
