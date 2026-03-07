import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, Download, FileText, TrendingUp, Lightbulb, Loader, AlertCircle, Calendar, CheckCircle } from 'lucide-react';
import { useComparisonStore } from '@/store/useComparisonStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { ComparisonCard } from './ComparisonCard';
import { TrendChart } from './TrendChart';
import { cn } from '@/lib/utils';
import { STATUS_LABELS } from '@/types/comparison';

interface ProgressComparisonProps {
  patientId: string;
  patientName?: string;
  onBack: () => void;
}

export const ProgressComparison: React.FC<ProgressComparisonProps> = ({
  patientId,
  patientName,
  onBack
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
    getRecommendedCurrent
  } = useComparisonStore();
  
  const { assessments } = useAssessmentStore();
  
  const [selectedBaseline, setSelectedBaseline] = useState<string>('');
  const [selectedCurrent, setSelectedCurrent] = useState<string>('');
  const [isRecommending, setIsRecommending] = useState(true);

  // 加载趋势数据和智能推荐
  useEffect(() => {
    loadTrendData(patientId);
    
    // 加载智能推荐
    const loadRecommendations = async () => {
      setIsRecommending(true);
      const [baselineId, currentId] = await Promise.all([
        getRecommendedBaseline(patientId),
        getRecommendedCurrent(patientId)
      ]);
      
      if (baselineId) setSelectedBaseline(baselineId);
      if (currentId) setSelectedCurrent(currentId);
      setIsRecommending(false);
    };
    
    loadRecommendations();
    
    return () => clearComparison();
  }, [patientId, loadTrendData, clearComparison, getRecommendedBaseline, getRecommendedCurrent]);

  // 过滤已完成评估
  const completedAssessments = useMemo(() => {
    return assessments
      .filter(a => a.patientId === patientId && a.status === 'completed')
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [assessments, patientId]);

  // 检查是否有足够的评估记录
  const hasEnoughAssessments = completedAssessments.length >= 2;

  const handleCompare = async () => {
    if (selectedBaseline && selectedCurrent) {
      await loadComparison(patientId, selectedBaseline, selectedCurrent);
    }
  };

  // 应用智能推荐
  const applyRecommendations = async () => {
    setIsRecommending(true);
    const [baselineId, currentId] = await Promise.all([
      getRecommendedBaseline(patientId),
      getRecommendedCurrent(patientId)
    ]);
    
    if (baselineId) setSelectedBaseline(baselineId);
    if (currentId) setSelectedCurrent(currentId);
    setIsRecommending(false);
  };

  // 导出功能
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
    comparison.metrics.forEach(m => {
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
    
    let markdown = `# 治疗效果对比报告\n\n`;
    markdown += `**患者 ID**: ${comparison.patientId}\n`;
    markdown += `**对比日期**: ${new Date(comparison.comparisonDate).toLocaleString('zh-CN')}\n`;
    markdown += `**基线评估**: ${new Date(comparison.baselineSnapshot.createdAt).toLocaleDateString('zh-CN')}\n`;
    markdown += `**当前评估**: ${new Date(comparison.currentSnapshot.createdAt).toLocaleDateString('zh-CN')}\n\n`;
    markdown += `## 综合评分\n\n`;
    markdown += `**总体改善率**: ${comparison.overallScore > 0 ? '+' : ''}${comparison.overallScore}%\n\n`;
    markdown += `## 指标对比\n\n`;
    markdown += `| 指标 | 单位 | 基线 | 当前 | 变化 | 改善率 | 状态 |\n`;
    markdown += `|------|------|------|------|------|--------|------|\n`;
    
    comparison.metrics.forEach(m => {
      const statusEmoji = m.status === 'improved' ? '✅' : m.status === 'worsened' ? '❌' : '➖';
      markdown += `| ${m.label} | ${m.unit} | ${m.baseline} | ${m.current} | ${m.change > 0 ? '+' : ''}${m.change} | ${m.improvement}% | ${statusEmoji} ${STATUS_LABELS[m.status]} |\n`;
    });
    
    markdown += `\n## 治疗建议\n\n`;
    comparison.recommendations.forEach(r => {
      markdown += `- ${r}\n`;
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

  // 评估预览组件
  const AssessmentPreview = ({ assessmentId, label }: { assessmentId: string; label: string }) => {
    const assessment = completedAssessments.find(a => a.id === assessmentId);
    if (!assessment) return null;

    return (
      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-600">{label}</span>
          </div>
          <span className="text-xs text-slate-400">
            {new Date(assessment.createdAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          模式: {assessment.mode} | 状态: {assessment.status}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 头部 */}
      <div className="flex items-center gap-6">
        <button 
          onClick={onBack}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-antey-primary/30 hover:shadow-lg transition-all group"
        >
          <ChevronLeft size={20} className="text-slate-400 group-hover:text-antey-primary" />
        </button>
        
        <div className="flex-1 bento-card p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              治疗效果对比
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {patientName || '匿名患者'}
            </p>
          </div>
          
          {comparison && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportJson}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-slate-700 uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <Download size={14} />
                JSON
              </button>
              <button
                onClick={handleExportCsv}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-slate-700 uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <Download size={14} />
                CSV
              </button>
              <button
                onClick={handleExportMarkdown}
                className="px-4 py-2 bg-antey-primary hover:bg-antey-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <FileText size={14} />
                报告
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 评估选择 */}
      <div className="bento-card p-6">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
          选择对比评估
        </h3>

        {/* 智能推荐提示 */}
        {hasEnoughAssessments && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Lightbulb className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-blue-900 mb-1">
                  智能推荐
                </h4>
                <p className="text-sm text-blue-700 mb-3">
                  建议选择最早的评估作为基线，最新的评估作为当前状态，以展示完整的治疗效果。
                </p>
                <button
                  onClick={applyRecommendations}
                  disabled={isRecommending}
                  className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 disabled:bg-blue-50 rounded-lg text-xs font-medium text-blue-800 transition-colors flex items-center gap-2"
                >
                  {isRecommending ? (
                    <>
                      <Loader size={12} className="animate-spin" />
                      加载中...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={12} />
                      应用推荐
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {!hasEnoughAssessments && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-amber-900 mb-1">
                  评估记录不足
                </h4>
                <p className="text-sm text-amber-700">
                  需要至少 2 次完成的评估记录才能进行对比。当前只有 {completedAssessments.length} 次。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 基线评估选择 */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">
              基线评估 <span className="text-slate-400 font-normal">（最早）</span>
            </label>
            <select
              value={selectedBaseline}
              onChange={(e) => setSelectedBaseline(e.target.value)}
              disabled={!hasEnoughAssessments}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">请选择基线评估</option>
              {completedAssessments.map(a => (
                <option key={a.id} value={a.id}>
                  {new Date(a.createdAt).toLocaleDateString('zh-CN')} - {a.mode} {a.isBaseline ? '(基线)' : ''}
                </option>
              ))}
            </select>
            {selectedBaseline && <AssessmentPreview assessmentId={selectedBaseline} label="基线评估" />}
          </div>

          {/* 当前评估选择 */}
          <div>
            <label className="text-xs font-bold text-slate-700 mb-2 block">
              当前评估 <span className="text-slate-400 font-normal">（最新）</span>
            </label>
            <select
              value={selectedCurrent}
              onChange={(e) => setSelectedCurrent(e.target.value)}
              disabled={!hasEnoughAssessments}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">请选择当前评估</option>
              {completedAssessments.map(a => (
                <option key={a.id} value={a.id}>
                  {new Date(a.createdAt).toLocaleDateString('zh-CN')} - {a.mode}
                </option>
              ))}
            </select>
            {selectedCurrent && <AssessmentPreview assessmentId={selectedCurrent} label="当前评估" />}
          </div>
        </div>

        {/* 生成对比按钮 */}
        <button
          onClick={handleCompare}
          disabled={!selectedBaseline || !selectedCurrent || isLoading}
          className={cn(
            'mt-6 w-full py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2',
            selectedBaseline && selectedCurrent && !isLoading
              ? 'bg-antey-primary hover:bg-antey-primary/90 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <Loader size={16} className="animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <TrendingUp size={16} />
              生成对比报告
            </>
          )}
        </button>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="bento-card p-12 flex flex-col items-center justify-center">
          <Loader className="animate-spin text-antey-primary mb-4" size={40} />
          <p className="text-slate-500 text-sm">正在生成对比报告...</p>
        </div>
      )}

      {/* 错误处理 */}
      {error && (
        <div className="bento-card p-6 bg-rose-50 border-rose-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-rose-500 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-rose-900 mb-1">加载失败</h4>
              <p className="text-sm text-rose-700 mb-3">{error}</p>
              <button
                onClick={handleCompare}
                className="px-4 py-2 bg-rose-100 hover:bg-rose-200 rounded-xl text-sm font-medium text-rose-800 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对比结果 */}
      {comparison && !isLoading && (
        <>
          {/* 综合评分 */}
          <div className="bento-card p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                  综合改善率
                </h3>
                <div className="flex items-baseline gap-3">
                  <span className={cn(
                    'text-5xl font-black',
                    comparison.overallScore > 0 ? 'text-emerald-600' : 
                    comparison.overallScore < 0 ? 'text-rose-600' : 'text-slate-600'
                  )}>
                    {comparison.overallScore > 0 ? '+' : ''}{comparison.overallScore}%
                  </span>
                  <TrendingUp className={cn(
                    comparison.overallScore > 0 ? 'text-emerald-500' : 
                    comparison.overallScore < 0 ? 'text-rose-500' : 'text-slate-400'
                  )} size={32} />
                </div>
              </div>
              <div className="text-right max-w-md">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  治疗建议
                </div>
                {comparison.recommendations.map((r, i) => (
                  <div key={i} className="text-sm font-medium text-slate-700 mb-1">
                    {r}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 指标对比 */}
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
              指标对比
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparison.metrics.map(metric => (
                <ComparisonCard key={metric.key} metric={metric} />
              ))}
            </div>
          </div>

          {/* 趋势图表 */}
          {trendData.length > 0 && (
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                历史趋势
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparison.metrics.slice(0, 4).map(metric => (
                  <TrendChart
                    key={metric.key}
                    data={trendData}
                    metricKey={metric.key}
                    metricLabel={metric.label}
                    unit={metric.unit}
                    color={metric.status === 'improved' ? '#10b981' : 
                           metric.status === 'worsened' ? '#f43f5e' : '#94a3b8'}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
