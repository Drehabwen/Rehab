import React, { useMemo, useState } from 'react';
import { useMobileVisits } from '../useMobileVisits';
import { evaluateReportGate } from '@/hub/report-gate';
import type { VisitTaskSummary } from '@/hub/workflow';

interface VisitsScreenProps {
  onStartVisit: () => void;
  onOpenPatient: (patientId: string) => void;
}

const statusOf = (task: VisitTaskSummary) => {
  if (task.reportReady) return { label: '可报告', cls: 'bg-[#0f9b8e]/10 text-[#0f9b8e]' };
  const gate = evaluateReportGate(task);
  if (task.hasAnyAssessment) return { label: gate.missingRequired.length ? '待评估' : '可报告', cls: 'bg-slate-100 text-slate-500' };
  return { label: '待开始', cls: 'bg-slate-100 text-slate-500' };
};

export const VisitsScreen: React.FC<VisitsScreenProps> = ({ onStartVisit, onOpenPatient }) => {
  const { tasks, stats, loading } = useMobileVisits();
  const [keyword, setKeyword] = useState('');

  const visibleTasks = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) =>
      task.patientName.toLowerCase().includes(q) || task.visitId.toLowerCase().includes(q),
    );
  }, [tasks, keyword]);

  return (
    <div className="flex h-full flex-col gap-3">
      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11.5px] text-slate-500">今天</div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.total} <span className="text-[11.5px] font-normal text-slate-500">位待处理</span>
            </div>
          </div>
          <div className="flex gap-4 text-right">
            <div><div className="text-[11px] text-slate-500">进行中</div><div className="font-bold">{stats.inProgress}</div></div>
            <div><div className="text-[11px] text-slate-500">可报告</div><div className="font-bold text-[#0f9b8e]">{stats.ready}</div></div>
            <div><div className="text-[11px] text-slate-500">待开始</div><div className="font-bold">{stats.pending}</div></div>
          </div>
        </div>
      </section>

      <input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="搜索姓名 / 接诊号"
        aria-label="搜索接诊"
        className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#0f9b8e]"
      />

      <div className="flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400">正在加载接诊数据…</div>
        ) : visibleTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="text-3xl text-[#0f9b8e]">＋</div>
            <div className="text-sm font-bold text-slate-900">今天还没有接诊</div>
            <div className="max-w-[240px] text-xs text-slate-500">3 分钟走完第一位患者：建档 → 量表 → 报告</div>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const status = statusOf(task);
            return (
              <button
                key={`${task.patient.id}-${task.visitId}`}
                onClick={() => onOpenPatient(task.patient.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[13px] font-bold text-white">
                  {task.patientName.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-slate-900">{task.patientName}</span>
                  <span className="block truncate text-[11.5px] text-slate-500">下一步：{task.nextStep}</span>
                </span>
                <span className={`rounded-full px-2 py-1 text-[10.5px] font-semibold ${status.cls}`}>{status.label}</span>
              </button>
            );
          })
        )}
      </div>

      <button onClick={onStartVisit} className="h-12 rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white">
        ＋ 开始接诊
      </button>
    </div>
  );
};
