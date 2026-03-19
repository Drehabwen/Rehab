import React, { useMemo, useState } from 'react';
import { AlertTriangle, BellRing, ClipboardList, FileText, Plus, Search, ShieldAlert, Users } from 'lucide-react';
import type { Patient } from '@/types/patient';
import type { VisitTaskSummary } from '../workflow';
import { PageHeader, VisitCard } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { StatePanel } from '@/components/layout';

interface DashboardStats {
  totalPatients: number;
  pending: number;
  inProgress: number;
  readyForReport: number;
}

interface DashboardViewProps {
  patients: Patient[];
  visitTasks: VisitTaskSummary[];
  stats: DashboardStats;
  onSelectPatient: (patient: Patient) => void;
  onOpenHistory: (patient: Patient) => void;
  onStartEvaluation: (patient: Patient) => void;
  canOpenHistory: boolean;
  onNewPatient: () => void;
  onSearchPatient: () => void;
}

const summaryCards = [
  {
    key: 'totalPatients',
    label: '学生档案',
    icon: Users,
    accent: 'bg-slate-900 text-white',
  },
  {
    key: 'pending',
    label: '待筛查',
    icon: ClipboardList,
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'inProgress',
    label: '筛查进行中',
    icon: BellRing,
    accent: 'bg-blue-50 text-blue-700',
  },
  {
    key: 'readyForReport',
    label: '待归档报告',
    icon: FileText,
    accent: 'bg-emerald-50 text-emerald-700',
  },
] as const;

export const DashboardView: React.FC<DashboardViewProps> = ({
  patients,
  visitTasks,
  stats,
  onSelectPatient,
  onOpenHistory,
  onStartEvaluation,
  canOpenHistory,
  onNewPatient,
  onSearchPatient,
}) => {
  const [keyword, setKeyword] = useState('');

  const filteredTasks = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return visitTasks;
    }

    return visitTasks.filter((task) => (
      task.patient.id.toLowerCase().includes(q)
      || task.patientName.toLowerCase().includes(q)
      || task.visitId.toLowerCase().includes(q)
    ));
  }, [keyword, visitTasks]);

  const scoliosisPriorityCount = useMemo(
    () => visitTasks.filter((task) => task.completedModules >= 2 && !task.reportReady).length,
    [visitTasks],
  );

  const rescreenCount = useMemo(
    () => visitTasks.filter((task) => task.completedModules > 0 && !task.reportReady).length,
    [visitTasks],
  );

  const featuredTask = filteredTasks[0] ?? visitTasks[0] ?? null;

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="首页 -> 脊柱侧弯专题 -> 风险复核 -> 报告归档"
          title="筛查监控首页"
          description="首页优先展示脊柱侧弯专题的待筛查、待复核和待复测对象，帮助机构先处理高风险学生，再进入具体采集流程。"
          summary={(
            <>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                今日 {new Date().toLocaleDateString('zh-CN')}
              </span>
              <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                脊柱侧弯专题已启用
              </span>
            </>
          )}
          actions={(
            <>
              <Button variant="secondary" icon={<Search size={16} />} onClick={onSearchPatient}>搜索学生</Button>
              <Button variant="primary" icon={<Plus size={16} />} onClick={onNewPatient}>新增学生</Button>
            </>
          )}
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card
            variant="default"
            padding="lg"
            className="border-teal-200 bg-[linear-gradient(135deg,rgba(13,148,136,0.12),rgba(255,255,255,0.98))] shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-teal-700">
                  脊柱侧弯核心专题
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                  先处理脊柱侧弯风险，再推进常规体态筛查
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  当前首页优先聚焦疑似侧弯风险、待复测对象和已完成采集但未闭环的学生。平台主定位仍然保持为青少年体态筛查监控中心，
                  但执行优先级已收敛到脊柱侧弯专题。
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">肩高差</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">躯干偏移</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">骨盆倾斜</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">复测跟踪</span>
                </div>
              </div>

              <div className="grid min-w-[240px] grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                  <div className="text-xs font-medium text-slate-500">专题待处理</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">{stats.pending + stats.inProgress}</div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                  <div className="text-xs font-medium text-slate-500">待复测</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">{rescreenCount}</div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                  <div className="text-xs font-medium text-slate-500">高优先级复核</div>
                  <div className="mt-2 text-3xl font-semibold text-rose-600 tabular-nums">{scoliosisPriorityCount}</div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                  <div className="text-xs font-medium text-slate-500">已待归档</div>
                  <div className="mt-2 text-3xl font-semibold text-emerald-600 tabular-nums">{stats.readyForReport}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card
            variant="default"
            padding="lg"
            className="border-slate-200 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <ShieldAlert size={18} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900">专题处置建议</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  优先处理已完成多模块采集但尚未形成报告闭环的学生，并将明显异常对象转入复测或人工复核。
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">第一优先</div>
                <div className="mt-1 text-sm font-medium text-slate-800">处理疑似脊柱侧弯高风险对象</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">第二优先</div>
                <div className="mt-1 text-sm font-medium text-slate-800">推动待复测学生回到标准筛查流程</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">第三优先</div>
                <div className="mt-1 text-sm font-medium text-slate-800">完成专题报告归档并准备班级汇总</div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.key}
                variant="default"
                padding="md"
                className="border-slate-200 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[30px] font-semibold leading-none text-slate-900 tabular-nums">{stats[card.key]}</div>
                    <div className="mt-2 text-sm text-slate-500">{card.label}</div>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.accent}`}>
                    <Icon size={18} />
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card
            variant="default"
            padding="md"
            className="border-slate-200 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">今日待处理学生</div>
                <p className="mt-1 text-sm text-slate-500">按学生编号、姓名或会话编号快速定位对象，优先推进脊柱侧弯专题任务。</p>
              </div>
              <label className="relative w-full lg:max-w-[380px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索学生姓名、编号或会话编号"
                  className="field-input pl-10"
                />
              </label>
            </div>
          </Card>

          <Card
            variant="default"
            padding="md"
            className="border-slate-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.92),rgba(255,255,255,1))] shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">专题异常提醒</div>
                <p className="mt-1 text-sm text-slate-600">
                  当前已识别 {scoliosisPriorityCount} 个优先复核对象。建议先进入标准筛查，确认是否需要复测或转入后续随访。
                </p>
                <div className="mt-3 text-xs font-medium text-rose-700">
                  规则口径：完成多模块采集但未闭环的学生优先纳入专题复核
                </div>
              </div>
            </div>
          </Card>
        </section>

        {featuredTask ? (
          <Card
            variant="default"
            padding="md"
            className="border-slate-200 bg-[linear-gradient(135deg,rgba(15,118,110,0.05),rgba(255,255,255,0.98))] shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">专题快速开始</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">
                  从 {featuredTask.patientName} 开始脊柱侧弯筛查
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  如果今天要先启动一名学生的专题筛查，建议从当前排序最靠前的对象进入工作台。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => onStartEvaluation(featuredTask.patient)}>进入筛查工作台</Button>
                <Button variant="secondary" onClick={() => onSelectPatient(featuredTask.patient)}>查看学生卡片</Button>
                {canOpenHistory ? (
                  <Button variant="ghost" onClick={() => onOpenHistory(featuredTask.patient)}>查看历史记录</Button>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}

        {filteredTasks.length === 0 ? (
          <StatePanel
            title="当前没有匹配的筛查对象"
            description="可以先新增学生，或清空搜索条件后继续处理脊柱侧弯专题任务。"
            actions={(
              <>
                <button onClick={onNewPatient} className="btn-primary">新增学生</button>
                <button onClick={() => setKeyword('')} className="btn-secondary">清空搜索</button>
              </>
            )}
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

        {patients.length === 0 ? (
          <Card variant="default" padding="md" className="border-slate-200 bg-slate-50/80">
            <div className="text-sm text-slate-500">当前还没有学生档案。建议先创建学生，再进入脊柱侧弯专题筛查流程。</div>
          </Card>
        ) : null}
      </div>
    </div>
  );
};
