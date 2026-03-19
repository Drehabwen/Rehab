import React, { useMemo, useState } from 'react';
import {
  Baby,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  FileText,
  History,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTreatmentPlanStore } from '@/store/useTreatmentPlanStore';
import { useSessionReportStore } from '@/store/useSessionReportStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import { PageTitleSection, UnifiedStatusBadge } from '@/components/layout';

type PlanMode = 'adult' | 'adolescent';

export const TrainingPlanPlugin: React.FC = () => {
  const [mode, setMode] = useState<PlanMode>('adolescent');
  const {
    currentContent,
    isGenerating,
    generatePlanFromSessionReport,
    clearContent,
    versions,
    switchVersion,
  } = useTreatmentPlanStore();

  const { reports } = useSessionReportStore();
  const currentPatient = usePatientStore((state) => state.currentPatient);
  const currentSession = useSessionStore((state) => state.currentSession);

  const latestReport = useMemo(() => {
    const scopedReports = reports.filter((report) => {
      if (currentSession) return report.sessionId === currentSession.id;
      if (currentPatient) return report.patientId === currentPatient.id;
      return false;
    });
    return scopedReports.sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;
  }, [reports, currentSession, currentPatient]);

  const handleGenerate = async () => {
    if (!currentPatient || !latestReport) return;

    await generatePlanFromSessionReport({
      patientId: currentPatient.id,
      sessionId: latestReport.sessionId,
      sessionReportId: latestReport.id,
      sessionReportMarkdown: latestReport.markdown,
      insights: mode === 'adolescent'
        ? ['重点关注生长发育保护', '优先纠正代偿动作', '控制训练负荷增长速度']
        : [],
    });
  };

  return (
    <div className="rehab-page">
      <div className="rehab-page-inner flex flex-col gap-6">
        <PageTitleSection
          title="干预建议"
          description="基于当前筛查报告生成个体化干预建议，用于复测跟踪、训练调整和后续随访。"
          right={(
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/50 p-1.5 shadow-sm">
              <button
                onClick={() => setMode('adolescent')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all',
                  mode === 'adolescent'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                    : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                <Baby size={14} />
                青少年模式
              </button>
              <button
                onClick={() => setMode('adult')}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all',
                  mode === 'adult'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                <Zap size={14} />
                通用模式
              </button>
            </div>
          )}
        />

        <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="custom-scrollbar flex flex-col gap-6 overflow-y-auto pr-1 lg:col-span-4">
            <div className="bento-card border-slate-200/60 bg-white/80 p-6 backdrop-blur-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-inner">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">AI 生成</h3>
                  <p className="text-[10px] font-medium text-slate-400">基于报告中心中的正式筛查报告</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">数据源状态</span>
                    <UnifiedStatusBadge
                      status={latestReport ? 'success' : 'warning'}
                      text={latestReport ? '正式报告已就绪' : '缺少正式报告'}
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {latestReport
                      ? '当前会话已经存在正式筛查报告，可以直接基于该报告生成干预建议。'
                      : '请先完成筛查，并在报告中心生成正式报告后，再来生成干预建议。'}
                  </p>
                </div>

                {mode === 'adolescent' ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-amber-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">青少年保护策略</span>
                    </div>
                    <ul className="space-y-1 text-[10px] font-medium text-amber-600/80">
                      <li>降低高冲击负荷，优先纠正代偿动作</li>
                      <li>增加灵活性与神经肌肉控制训练</li>
                      <li>建议采用更易执行的家庭/校园随访动作</li>
                    </ul>
                  </div>
                ) : null}

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !latestReport}
                  className={cn(
                    'flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all',
                    isGenerating || !latestReport
                      ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-200 hover:scale-[1.02] active:scale-[0.98]',
                  )}
                >
                  {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Dumbbell size={18} />}
                  {isGenerating ? '生成中...' : '立即生成干预建议'}
                </button>
              </div>
            </div>

            <div className="bento-card flex min-h-[300px] flex-1 flex-col p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <History size={16} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">版本记录</h3>
                </div>
                <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-400">
                  {versions.length} 个版本
                </span>
              </div>

              <div className="custom-scrollbar -mr-2 flex-1 space-y-3 overflow-y-auto pr-2">
                {versions.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-100 text-slate-400">
                    <PlusCircle size={24} className="opacity-20" />
                    <span className="text-[10px] font-medium">暂无历史建议</span>
                  </div>
                ) : (
                  versions.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => switchVersion(version.id)}
                      className={cn(
                        'group w-full rounded-2xl border p-4 text-left transition-all',
                        version.isCurrent
                          ? 'border-amber-200 bg-white shadow-md ring-1 ring-amber-100'
                          : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10px] font-black',
                            version.isCurrent ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500',
                          )}
                        >
                          V{version.version}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mb-3 line-clamp-2 text-xs font-medium leading-relaxed text-slate-600">
                        {version.content.replace(/[#*`]/g, '').slice(0, 60)}...
                      </p>
                      <div className="flex translate-x-[-4px] items-center justify-between text-[10px] font-black text-amber-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                        <span>查看详情</span>
                        <ChevronRight size={12} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bento-card flex flex-col overflow-hidden bg-white lg:col-span-8">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-400" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">建议预览</span>
              </div>
              <div className="flex items-center gap-4">
                {currentContent ? (
                  <button
                    onClick={clearContent}
                    className="text-[10px] font-black text-slate-400 transition-colors hover:text-slate-600"
                  >
                    重置
                  </button>
                ) : null}
                <div className="h-4 w-px bg-slate-200" />
                <UnifiedStatusBadge
                  status={isGenerating ? 'processing' : currentContent ? 'success' : 'disabled'}
                  text={isGenerating ? '生成中...' : currentContent ? '已生成' : '等待数据'}
                />
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto">
              {currentContent ? (
                <MarkdownReport
                  content={currentContent}
                  loading={false}
                  animate
                  tone={mode === 'adolescent' ? 'amber' : 'blue'}
                  title={`${mode === 'adolescent' ? '青少年' : '通用'}干预建议`}
                  subtitle={currentPatient ? `${currentPatient.name || '学生'} · ${new Date().toLocaleDateString()}` : undefined}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-12 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-slate-50 text-slate-200 shadow-inner">
                    <Dumbbell size={40} />
                  </div>
                  <h3 className="mb-2 text-lg font-black text-slate-900">准备生成建议</h3>
                  <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-400">
                    {latestReport
                      ? '点击左侧“立即生成干预建议”，系统会基于当前正式筛查报告输出可执行的建议内容。'
                      : '当前会话暂无正式报告，请先到报告中心生成正式报告。'}
                  </p>

                  {!latestReport ? (
                    <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-left">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-900">1. 完成筛查</div>
                          <div className="text-[9px] font-medium text-slate-400">先采集体态与辅助模块数据</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-left">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-900">2. 生成正式报告</div>
                          <div className="text-[9px] font-medium text-slate-400">在报告中心汇总并归档本次结果</div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
