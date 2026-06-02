import React, { useMemo } from 'react';
import { Activity, BarChart3, ClipboardList, Database, FileText, Layers, Mic, Users } from 'lucide-react';
import type { Assessment } from '@/types/assessment';
import type { Session } from '@/types/session';
import type { VisitTaskSummary } from '../workflow';
import { PageHeader, ProgressBar, StatusTag } from '@/components/workflow';
import { Card } from '@/components/ui';
import { formatDate } from '@/lib/session-utils';

interface DataCenterViewProps {
  sessions: Session[];
  assessments: Assessment[];
  visitTasks: VisitTaskSummary[];
}

const moduleLabels = {
  posture: '体态评估',
  rom: 'ROM 评估',
  medvoice: '语音问诊',
} as const;

const moduleIcons = {
  posture: Activity,
  rom: Layers,
  medvoice: Mic,
} as const;

export const DataCenterView: React.FC<DataCenterViewProps> = ({
  sessions,
  assessments,
  visitTasks,
}) => {
  const metrics = useMemo(() => {
    const completedReports = visitTasks.filter((task) => task.reportReady).length;
    const posture = assessments.filter((assessment) => assessment.type === 'posture').length;
    const rom = assessments.filter((assessment) => assessment.type === 'rom').length;
    const medvoice = assessments.filter((assessment) => assessment.type === 'medvoice').length;

    return {
      patientCount: visitTasks.length,
      sessionCount: sessions.length,
      assessmentCount: assessments.length,
      completedReports,
      modules: {
        posture,
        rom,
        medvoice,
      },
    };
  }, [assessments, sessions.length, visitTasks]);

  const recentTasks = useMemo(() => visitTasks.slice(0, 8), [visitTasks]);

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="患者 -> 接诊 -> 评估 -> 报告 -> 历史"
          title="数据中心"
          description="这里统一查看患者历史、接诊记录和评估统计。页面以数据浏览为主，不承担评估或报告生成任务。"
          summary={(
            <>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                患者 {metrics.patientCount}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                接诊 {metrics.sessionCount}
              </span>
            </>
          )}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: '患者人数', value: metrics.patientCount, icon: Users, accent: 'bg-slate-900 text-white' },
            { label: '接诊次数', value: metrics.sessionCount, icon: ClipboardList, accent: 'bg-blue-50 text-blue-700' },
            { label: '评估记录', value: metrics.assessmentCount, icon: Database, accent: 'bg-violet-50 text-violet-700' },
            { label: '已出报告', value: metrics.completedReports, icon: FileText, accent: 'bg-emerald-50 text-emerald-700' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} variant="default" padding="md" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[30px] font-semibold leading-none text-slate-900 tabular-nums">{card.value}</div>
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

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">历史接诊记录</div>
                <p className="mt-1 text-sm text-slate-500">按最近更新时间展示，便于快速回看患者历史。</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                <BarChart3 size={18} />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recentTasks.map((task) => (
                <div key={`${task.patient.id}-${task.visitId}`} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{task.patientName}</div>
                      <div className="mt-1 text-xs text-slate-500">接诊号 {task.visitId}</div>
                    </div>
                    <StatusTag status={task.reportReady ? 'completed' : 'pending'} />
                  </div>
                  <ProgressBar value={task.completedModules} total={task.totalModules} className="mt-4" />
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>最近更新 {formatDate(task.updatedAt)}</span>
                    <span>已完成 {task.completedModules}/{task.totalModules}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="text-sm font-semibold text-slate-900">模块覆盖情况</div>
              <p className="mt-1 text-sm text-slate-500">统计已沉淀的评估数据量，帮助判断当前数据厚度。</p>
              <div className="mt-4 space-y-3">
                {(['posture', 'rom', 'medvoice'] as const).map((key) => {
                  const Icon = moduleIcons[key];
                  const value = metrics.modules[key];
                  return (
                    <div key={key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                          <Icon size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{moduleLabels[key]}</div>
                          <div className="text-xs text-slate-500">累计记录</div>
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-slate-900 tabular-nums">{value}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card variant="default" padding="lg" className="border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="text-sm font-semibold text-slate-900">数据说明</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>数据中心只负责查看历史记录、评估数据和统计结果，不直接承担评估与报告生成。</p>
                <p>如果要继续处理当前患者，请回到评估中心；如果要生成与导出结果，请前往报告中心。</p>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};
