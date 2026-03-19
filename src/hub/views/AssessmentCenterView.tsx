import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, ClipboardList, FileText, Layers, Mic, ShieldAlert } from 'lucide-react';
import type { Patient } from '@/types/patient';
import type { VisitTaskSummary } from '../workflow';
import { PageHeader, VisitCard } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { StatePanel } from '@/components/layout';

type ScreeningFilter = 'all' | 'pending' | 'inProgress' | 'ready';

interface AssessmentCenterViewProps {
  visitTasks: VisitTaskSummary[];
  onSelectPatient: (patient: Patient) => void;
  onOpenHistory: (patient: Patient) => void;
  onStartEvaluation: (patient: Patient) => void;
  canOpenHistory: boolean;
}

const filterLabels: Record<ScreeningFilter, string> = {
  all: '全部对象',
  pending: '待筛查',
  inProgress: '进行中',
  ready: '待报告',
};

const summaryDefinitions = [
  { key: 'pending', label: '待筛查', icon: ClipboardList, accent: 'bg-amber-50 text-amber-700' },
  { key: 'inProgress', label: '筛查进行中', icon: Activity, accent: 'bg-blue-50 text-blue-700' },
  { key: 'ready', label: '待归档报告', icon: FileText, accent: 'bg-emerald-50 text-emerald-700' },
] as const;

const topicHighlights = [
  '肩高差与躯干偏移优先复核',
  '疑似侧弯对象优先进入标准筛查',
  '已采集未闭环对象优先进入复测',
];

export const AssessmentCenterView: React.FC<AssessmentCenterViewProps> = ({
  visitTasks,
  onSelectPatient,
  onOpenHistory,
  onStartEvaluation,
  canOpenHistory,
}) => {
  const [filter, setFilter] = useState<ScreeningFilter>('inProgress');

  const taskBuckets = useMemo(() => ({
    pending: visitTasks.filter((task) => task.completedModules === 0),
    inProgress: visitTasks.filter((task) => task.completedModules > 0 && task.completedModules < task.totalModules),
    ready: visitTasks.filter((task) => task.reportReady),
  }), [visitTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') {
      return visitTasks;
    }
    return taskBuckets[filter];
  }, [filter, taskBuckets, visitTasks]);

  const priorityReviewCount = useMemo(
    () => visitTasks.filter((task) => task.completedModules >= 2 && !task.reportReady).length,
    [visitTasks],
  );

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="专题工作台 -> 脊柱侧弯 -> 快速筛查 / 标准筛查 -> 结果汇总"
          title="筛查工作台"
          description="当前工作台默认进入脊柱侧弯专题。执行顺序是先选学生，再决定使用快速筛查还是标准筛查，最后进入报告和复测闭环。"
          summary={(
            <>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                当前任务 {visitTasks.length}
              </span>
              <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                专题模式：脊柱侧弯筛查
              </span>
            </>
          )}
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card
            variant="default"
            padding="lg"
            className="border-teal-200 bg-[linear-gradient(135deg,rgba(15,118,110,0.12),rgba(255,255,255,0.98))] shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-teal-700">
                  第一专题模式
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                  脊柱侧弯筛查优先进入标准流程
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  当前阶段，工作台会优先引导执行脊柱侧弯专题。快速筛查适合现场首轮识别，标准筛查用于完成多模块采集、风险复核和后续复测依据沉淀。
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {topicHighlights.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-medium text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid min-w-[250px] gap-3">
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                  <div className="text-xs font-medium text-slate-500">专题待复核</div>
                  <div className="mt-2 text-3xl font-semibold text-rose-600 tabular-nums">{priorityReviewCount}</div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                  <div className="text-xs font-medium text-slate-500">建议流程</div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-800">
                    快速筛查
                    <ArrowRight size={14} className="text-slate-400" />
                    标准筛查
                    <ArrowRight size={14} className="text-slate-400" />
                    报告归档
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card
            variant="default"
            padding="lg"
            className="border-slate-200 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
          >
            <div className="text-sm font-semibold text-slate-900">专题工具协同</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              脊柱侧弯专题并不是单模块页面，而是以体态筛查为主、辅以 ROM 和问询补充的组合工作流。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: '体态筛查', icon: Activity, accent: 'text-blue-600' },
                { label: 'ROM 辅助', icon: Layers, accent: 'text-emerald-600' },
                { label: '问询补充', icon: Mic, accent: 'text-violet-600' },
              ].map((module) => (
                <div key={module.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
                  <module.icon size={16} className={`mx-auto ${module.accent}`} />
                  <div className="mt-2 text-xs font-medium text-slate-600">{module.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              高风险对象建议直接进入标准筛查，不建议只停留在快速模式。
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {summaryDefinitions.map((item) => {
              const Icon = item.icon;
              const value = taskBuckets[item.key].length;
              return (
                <Card
                  key={item.key}
                  variant="default"
                  padding="md"
                  className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[28px] font-semibold leading-none text-slate-900 tabular-nums">{value}</div>
                      <div className="mt-2 text-sm text-slate-500">{item.label}</div>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.accent}`}>
                      <Icon size={18} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card
            variant="default"
            padding="md"
            className="border-slate-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,255,255,1))] shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <ShieldAlert size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">复测优先提醒</div>
                <p className="mt-1 text-sm text-slate-600">
                  已完成部分采集但尚未形成闭环的学生，建议优先补齐标准筛查，并在报告中心完成归档。
                </p>
              </div>
            </div>
          </Card>
        </section>

        <Card
          variant="default"
          padding="md"
          className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">当前筛查对象</div>
              <p className="mt-1 text-sm text-slate-500">
                先选对象，再进入快速筛查或标准筛查。高风险和待复测对象建议优先进入标准流程。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'pending', 'inProgress', 'ready'] as ScreeningFilter[]).map((item) => (
                <Button
                  key={item}
                  variant={filter === item ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFilter(item)}
                >
                  {filterLabels[item]}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {filteredTasks.length === 0 ? (
          <StatePanel
            title="当前筛选范围内没有对象"
            description="可以切换筛选条件，或从首页和学生档案中创建新的筛查对象。"
          />
        ) : (
          <section className="space-y-3">
            {filteredTasks.map((task) => (
              <VisitCard
                key={`${task.patient.id}-${task.visitId}`}
                task={task}
                layout="row"
                onOpen={() => onSelectPatient(task.patient)}
                onViewHistory={() => onOpenHistory(task.patient)}
                onStartEvaluation={() => onStartEvaluation(task.patient)}
                canViewHistory={canOpenHistory}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};
