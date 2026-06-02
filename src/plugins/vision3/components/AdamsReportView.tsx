/** Saved Adams assessment report — displayed after successful save. */

import React from 'react';
import { CheckCircle2, VideoOff, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdamsAssessmentData } from '@/types/assessment';
import type { Patient } from '@/types/patient';

interface RiskInfo {
  level: string; color: string; dot: string; badge: string; desc: string;
}

interface Props {
  data: AdamsAssessmentData;
  risk: RiskInfo;
  patient: Patient | null | undefined;
  onBack: () => void;
}

export const AdamsReportView: React.FC<Props> = ({ data, risk, patient, onBack }) => (
  <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
    <div className="max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-[32px] shadow-xl p-6 md:p-8 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Success Header */}
      <div className="flex flex-col items-center text-center mt-2 mb-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">🎉 亚当斯前屈评估报告生成成功！</h2>
        <p className="mt-2 text-sm text-slate-500">数据已成功存盘入档至该患者的本地早筛健康档案中。</p>
        {patient && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600 font-semibold border border-slate-200">
            <span>👤 受试者: {patient.name}</span><span>•</span><span>🔢 统一 SUC: {patient.id}</span>
          </div>
        )}
      </div>

      <hr className="border-slate-100 mb-6" />

      {/* Report body */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-5 flex flex-col gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">📷 融合铅垂对齐快照</span>
          {data.snapshotImage ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 aspect-4/3 flex items-center justify-center">
              <img src={data.snapshotImage} alt="Adams Snapshot" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 aspect-4/3 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
              <VideoOff size={32} className="mb-2 opacity-50" /><span className="text-xs">未拍摄图像数据</span>
            </div>
          )}
        </div>

        <div className="md:col-span-7 flex flex-col gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">📐 临床筛查测量指标</span>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['ATR 躯干旋转角', `${data.atrDegrees}°`, data.atrDirection === 'left' ? '左侧偏高' : data.atrDirection === 'right' ? '右侧偏高' : '无明显偏斜'],
              ['估计 Cobb 角', data.cobbAngleEstimate !== undefined ? `${data.cobbAngleEstimate}°` : '--', 'X光诊断参考'],
              ['双肩高低对称性', data.shoulderAsymmetry === 'symmetrical' ? '✅ 水平对称' : data.shoulderAsymmetry === 'left-higher' ? '⚠️ 左肩偏高' : '⚠️ 右肩偏高', ''],
              ['肩胛骨对称性', data.scapulaAsymmetry === 'symmetrical' ? '✅ 水平对称' : data.scapulaAsymmetry === 'left-prominent' ? '⚠️ 左侧隆起' : '⚠️ 右侧隆起', ''],
              ['腰折痕对称性', data.waistCreaseAsymmetry === 'symmetrical' ? '✅ 对称' : data.waistCreaseAsymmetry === 'left-deeper' ? '⚠️ 左侧折痕深' : '⚠️ 右侧折痕深', ''],
              ['脊柱大致形态', data.spineCurveEstimate === 'straight' ? '✅ 直线对称' : data.spineCurveEstimate === 'c-shape-left' ? '⚠️ 左C形侧弯' : data.spineCurveEstimate === 'c-shape-right' ? '⚠️ 右C形侧弯' : '⚠️ S形侧弯', ''],
            ].map(([label, value, sub]) => (
              <div key={label} className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
                <div className="text-[11px] font-semibold text-slate-400">{label}</div>
                <div className="mt-1">
                  <span className="text-2xl font-bold text-slate-800">{value}</span>
                  {sub ? <span className="text-[10px] text-slate-400 block mt-0.5">{sub}</span> : null}
                </div>
              </div>
            ))}
          </div>

          {/* Risk level */}
          <div className={cn("p-4 border rounded-2xl flex flex-col gap-2 transition-all mt-1", risk.color)}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">临床风险评级</span>
              <span className="flex items-center gap-1.5 text-xs font-bold">
                <span className={cn("h-2.5 w-2.5 rounded-full inline-block", risk.dot)} />{risk.badge}
              </span>
            </div>
            <p className="text-xs font-medium leading-relaxed">{risk.desc}</p>
          </div>
        </div>
      </div>

      {data.remarks && (
        <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <span className="text-xs font-bold text-slate-400 block mb-1">康复师临床备注</span>
          <p className="text-xs text-slate-600 whitespace-pre-line">{data.remarks}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-slate-400 flex items-center gap-1">
          💡 提示：此报告已通过 22 位正式 SUC Luhn 安全检验，并可由家长端 Chatbot RAG 绑定进行调阅。
        </span>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button type="button" onClick={() => window.print()}
            className="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Printer size={14} /> 打印 / 导出 PDF
          </button>
          <button type="button" onClick={onBack}
            className="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 text-xs font-semibold text-white transition-all shadow-md shadow-slate-900/10">
            返回体态主页 ➔
          </button>
        </div>
      </div>
    </div>
  </div>
);
