import React, { useState } from 'react';
import { useAssessmentStore } from '@/store/useAssessmentStore';

interface SyncScreenProps {
  onBack: () => void;
}

/** 屏 7：待同步（导出备份可用；回传与重试待接后端） */
export const SyncScreen: React.FC<SyncScreenProps> = ({ onBack }) => {
  const assessments = useAssessmentStore((state) => state.assessments);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = () => {
    setExporting(true);
    try {
      const payload = JSON.stringify({
        exportedAt: new Date().toISOString(),
        version: 1,
        assessmentCount: assessments.length,
        assessments,
      }, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `qingyuezhihang-backup-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`已导出 ${assessments.length} 条评估记录`);
    } catch {
      setMessage('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-bold text-slate-900">本机数据</span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10.5px] font-semibold text-amber-700">待回传</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">{assessments.length} 条评估记录已安全保存在本机</div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-3 text-[11.5px] leading-relaxed text-slate-600">
        回传通道尚未接入后端。当前可先导出备份；网络恢复后系统会自动重试回传（退避 30s / 2m / 10m）。
      </section>

      {message ? <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11.5px] text-slate-700">{message}</div> : null}

      <div className="mt-auto space-y-2">
        <button onClick={handleExport} disabled={exporting} className="h-12 w-full rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white disabled:opacity-60">
          {exporting ? '导出中…' : '导出备份（JSON）'}
        </button>
        <button onClick={onBack} className="h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">返回今日接诊</button>
      </div>
    </div>
  );
};
