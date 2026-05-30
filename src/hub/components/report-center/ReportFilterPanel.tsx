import React from 'react';
import { ProgressBar } from '@/components/workflow';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types/patient';
import type { SessionReportInput } from '@/types/report-center';

interface ReportFilterPanelProps {
  availablePatients: Patient[];
  selectedPatientId: string | null;
  onPatientChange: (id: string | null) => void;
  sessionInputs: SessionReportInput[];
  selectedSessionId: string | null;
  onSessionChange: (id: string | null) => void;
  activeSessionInput: SessionReportInput | null;
}

export const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
  availablePatients,
  selectedPatientId,
  onPatientChange,
  sessionInputs,
  selectedSessionId,
  onSessionChange,
  activeSessionInput,
}) => {
  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-900">患者范围</div>
        <div className="text-xs text-slate-500">限定当前要汇总的患者。</div>
        <select
          value={selectedPatientId ?? 'all'}
          onChange={(event) => onPatientChange(event.target.value === 'all' ? null : event.target.value)}
          className="field-select mt-3"
        >
          <option value="all">全部患者</option>
          {availablePatients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {(patient.name || `患者 ${patient.id}`) + ` · ${patient.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-900">接诊范围</div>
        <div className="text-xs text-slate-500">选择本次需要生成综合报告的接诊。</div>
        <select
          value={selectedSessionId ?? 'all'}
          onChange={(event) => onSessionChange(event.target.value === 'all' ? null : event.target.value)}
          className="field-select mt-3"
        >
          <option value="all">当前患者的最近接诊</option>
          {sessionInputs.map((input) => (
            <option key={input.sessionId} value={input.sessionId}>
              {(input.patientName || input.patientId) + ` · ${input.sessionId}`}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">报告准备度</div>
            <p className="mt-1 text-sm text-slate-500">根据已收集模块数量及实际质量判断是否适合生成综合报告。</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {activeSessionInput?.readiness.readyCount ?? 0} / 5
          </div>
        </div>
        <ProgressBar value={activeSessionInput?.readiness.readyCount ?? 0} total={5} className="mt-4" />
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {([
            { type: 'posture', label: '体态' },
            { type: 'adams', label: '脊柱' },
            { type: 'rom', label: 'ROM' },
            { type: 'medvoice', label: '语音' },
            { type: 'scale', label: '量表' },
          ] as const).map(({ type, label }) => {
            const status = activeSessionInput?.outputs[type]?.status;
            const isReady = status === 'ready';
            const isPartial = status === 'partial';
            return (
              <div
                key={label}
                className={cn(
                  'rounded-xl border px-1 py-2 text-center text-[10px] font-bold transition-all duration-200 truncate',
                  isReady
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_2px_8px_rgba(16,185,129,0.08)]'
                    : isPartial
                    ? 'border-amber-200 bg-amber-50 text-amber-700 shadow-[0_2px_8px_rgba(245,158,11,0.08)]'
                    : 'border-slate-100 bg-slate-50 text-slate-400',
                )}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
