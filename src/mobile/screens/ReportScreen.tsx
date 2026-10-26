import React from 'react';

interface ReportScreenProps {
  total: number;
  previousTotal?: number;
  voicePoints?: string[];
  onContinue: () => void;
  onBack: () => void;
}

/** 屏 6：接诊报告（量表 + 语音要点一页摘要，本地已保存） */
export const ReportScreen: React.FC<ReportScreenProps> = ({ total, previousTotal, voicePoints, onContinue, onBack }) => {
  const delta = previousTotal !== undefined ? total - previousTotal : null;
  const improved = delta !== null && delta < 0;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-slate-900">本次接诊 · 已保存</span>
          <span className="rounded-full bg-[#0f9b8e]/10 px-2 py-1 text-[10.5px] font-semibold text-[#0f9b8e]">可出报告</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">量表与语音问诊已写入本地数据库，等待回传</div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="text-[10.5px] tracking-wider text-slate-400">ODI 总分</div>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-[30px] font-bold text-slate-900">{total}</span>
          <span className="pb-1 text-[12px] text-slate-400">/ 100</span>
          {delta !== null ? (
            <span className={`mb-1 text-[11.5px] font-semibold ${improved ? 'text-[#0f9b8e]' : 'text-amber-600'}`}>
              {improved ? `改善 ${Math.abs(delta)} 分` : `增加 ${delta} 分`}
            </span>
          ) : null}
        </div>
      </section>

      {voicePoints && voicePoints.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 p-3">
          <div className="mb-2 text-[10.5px] tracking-wider text-slate-400">语音问诊要点</div>
          <div className="flex flex-wrap gap-2">
            {voicePoints.map((point) => (
              <span key={point} className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600">{point}</span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11.5px] leading-relaxed text-slate-600">
        <div className="mb-1 text-[11px] font-bold text-slate-800">功能改善摘要</div>
        ODI 总分 {total}/100{delta !== null ? `，较上次${improved ? '改善' : '变化'} ${Math.abs(delta)} 分` : ''}。
        {voicePoints && voicePoints.length > 0 ? `本次语音要点：${voicePoints.join('、')}。` : ''}
        建议结合本次评估结果调整训练强度，按期复评。
      </section>

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="flex items-center justify-between text-[11.5px]">
          <span className="text-slate-500">数据同步</span>
          <span className="font-semibold text-amber-600">待同步</span>
        </div>
        <div className="mt-1 text-[10.5px] text-slate-400">网络恢复后自动回传；失败可在「待同步」重试</div>
      </section>

      <div className="mt-auto space-y-2 pt-2">
        <button onClick={onContinue} className="h-12 w-full rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white">
          继续下一位 →
        </button>
        <button onClick={onBack} className="h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
          返回今日接诊
        </button>
      </div>
    </div>
  );
};
