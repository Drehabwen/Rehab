/** Clinical assessment form sidebar for Adams Forward Bend Test. */

import React from 'react';
import { Sliders, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskInfo {
  level: string; color: string; dot: string; badge: string; desc: string;
}

interface FormState {
  atrDegrees: number;
  atrDirection: 'left' | 'right' | 'none';
  shoulderAsymmetry: 'symmetrical' | 'left-higher' | 'right-higher';
  scapulaAsymmetry: 'symmetrical' | 'left-prominent' | 'right-prominent';
  waistCreaseAsymmetry: 'symmetrical' | 'left-deeper' | 'right-deeper';
  spineCurveEstimate: 'straight' | 'c-shape-left' | 'c-shape-right' | 's-shape';
  cobbAngleEstimate: number | '';
  remarks: string;
}

interface Props {
  form: FormState;
  risk: RiskInfo;
  snapshot: string | null;
  isSaving: boolean;
  onAtrChange: (v: number) => void;
  onAtrDirection: (d: 'left' | 'right') => void;
  onShoulderChange: (v: FormState['shoulderAsymmetry']) => void;
  onScapulaChange: (v: FormState['scapulaAsymmetry']) => void;
  onWaistChange: (v: FormState['waistCreaseAsymmetry']) => void;
  onSpineCurveChange: (v: FormState['spineCurveEstimate']) => void;
  onCobbChange: (v: number | '') => void;
  onRemarksChange: (v: string) => void;
  onSave: () => void;
}

export const AdamsFormSidebar: React.FC<Props> = ({
  form, risk, snapshot, isSaving, onAtrChange, onAtrDirection,
  onShoulderChange, onScapulaChange, onWaistChange, onSpineCurveChange,
  onCobbChange, onRemarksChange, onSave,
}) => (
  <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
    <div className="bg-white border border-slate-200/80 rounded-[32px] shadow-sm p-5 md:p-6 flex flex-col gap-5">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
        <Sliders size={16} className="text-purple-600" /> 标准化脊柱侧弯筛查量表
      </h3>

      <div className="flex flex-col gap-4">
        {/* ATR Slider */}
        <ATRSlider value={form.atrDegrees} onChange={onAtrChange} risk={risk} />

        {/* ATR Direction */}
        {form.atrDegrees > 0 && (
          <OptionGroup label="1.2 隆起方向 (ATR 侧向)">
            {[
              { value: 'right' as const, label: '👉 右侧隆起 (剃刀背)' },
              { value: 'left' as const, label: '👈 左侧隆起 (剃刀背)' },
            ].map(opt => (
              <button key={opt.value} type="button" onClick={() => onAtrDirection(opt.value)}
                className={cn("h-10 rounded-xl border text-xs font-semibold transition-all",
                  form.atrDirection === opt.value ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
                {opt.label}
              </button>
            ))}
          </OptionGroup>
        )}

        {/* Spine curve */}
        <OptionGroup label="2. 脊柱大致弯曲形态" columns={2}>
          {[
            { value: 'straight' as const, label: '直线 (正常)' },
            { value: 'c-shape-left' as const, label: '左 C 形侧弯' },
            { value: 'c-shape-right' as const, label: '右 C 形侧弯' },
            { value: 's-shape' as const, label: 'S 形侧弯' },
          ].map(s => (
            <button key={s.value} type="button" onClick={() => onSpineCurveChange(s.value)}
              className={cn("h-10 rounded-xl border text-xs font-semibold transition-all text-left px-3",
                form.spineCurveEstimate === s.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
              {s.label}
            </button>
          ))}
        </OptionGroup>

        {/* Asymmetry triads */}
        <TriadSelect label="3. 双肩高低不对称" value={form.shoulderAsymmetry} onChange={onShoulderChange}
          options={[
            { value: 'symmetrical' as const, label: '对称' },
            { value: 'left-higher' as const, label: '左肩高' },
            { value: 'right-higher' as const, label: '右肩高' },
          ]} />
        <TriadSelect label="4. 肩胛骨不对称/偏隆起" value={form.scapulaAsymmetry} onChange={onScapulaChange}
          options={[
            { value: 'symmetrical' as const, label: '对称' },
            { value: 'left-prominent' as const, label: '左侧隆起' },
            { value: 'right-prominent' as const, label: '右侧隆起' },
          ]} />
        <TriadSelect label="5. 腰部折痕对称性" value={form.waistCreaseAsymmetry} onChange={onWaistChange}
          options={[
            { value: 'symmetrical' as const, label: '对称' },
            { value: 'left-deeper' as const, label: '左侧折痕深' },
            { value: 'right-deeper' as const, label: '右侧折痕深' },
          ]} />

        {/* Cobb angle */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <label htmlFor="cobb-input">6. 估计 Cobb 角 (X光片测量, 选填)</label>
            {form.cobbAngleEstimate !== '' && (
              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{form.cobbAngleEstimate}°</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input id="cobb-input" type="number" min="0" max="90" placeholder="例如: 12"
              value={form.cobbAngleEstimate}
              onChange={(e) => onCobbChange(e.target.value === '' ? '' : Math.min(90, Math.max(0, Number(e.target.value))))}
              className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50/50 hover:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <span className="text-xs text-slate-400">度 (deg)</span>
          </div>
        </div>

        {/* Remarks */}
        <div className="flex flex-col gap-2">
          <label htmlFor="remarks-textarea" className="text-xs font-bold text-slate-600">7. 康复师临床备注</label>
          <textarea id="remarks-textarea" rows={2} maxLength={250} value={form.remarks} onChange={(e) => onRemarksChange(e.target.value)}
            placeholder="可在此记录患者棘突偏斜特征、侧弯节段、柔韧度或进一步诊治建议..."
            className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50/50 hover:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Save */}
      <div className="mt-2 pt-3 border-t border-slate-100 flex flex-col gap-3">
        <button type="button" onClick={onSave} disabled={isSaving || !snapshot}
          className={cn("w-full h-12 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
            !snapshot ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/10 active:scale-[0.98]")}>
          <Save size={14} className={isSaving ? "animate-spin" : ""} />
          {isSaving ? '正在生成报告及存盘...' : !snapshot ? '⚠️ 请先拍摄快照再保存' : '生成并保存亚当斯报告'}
        </button>
        {!snapshot && <p className="text-[10px] text-slate-400 text-center">* 必须拍摄融合对齐线的快照方可保存</p>}
      </div>
    </div>
  </div>
);

// ── Reusable sub-components ──

const ATRSlider: React.FC<{ value: number; onChange: (v: number) => void; risk: RiskInfo }> = ({ value, onChange, risk }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
      <label htmlFor="atr-slider">1. 躯干旋转角 ATR (度)<span className="text-rose-500">*</span></label>
      <span className="text-sm font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{value}°</span>
    </div>
    <div className="flex items-center gap-3">
      <input id="atr-slider" type="range" min="0" max="25" step="1" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-purple-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none" />
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold">-</button>
      <button type="button" onClick={() => onChange(Math.min(25, value + 1))}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold">+</button>
    </div>
    <div className={cn("p-3.5 border rounded-2xl flex items-start gap-2.5 transition-all mt-1", risk.color)}>
      <AlertCircle size={15} className="mt-0.5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase">{risk.badge}</span>
        <p className="text-[10px] leading-relaxed font-semibold">{risk.desc}</p>
      </div>
    </div>
  </div>
);

const OptionGroup: React.FC<{
  label: string; columns?: number; children: React.ReactNode;
}> = ({ label, columns = 2, children }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-slate-600">{label}</label>
    <div className={`grid grid-cols-${columns} gap-2`}>{children}</div>
  </div>
);

const TriadSelect: React.FC<{
  label: string; value: string; onChange: (v: any) => void;
  options: Array<{ value: any; label: string }>;
}> = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-slate-600">{label}</label>
    <div className="grid grid-cols-3 gap-2">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={cn("h-9 rounded-xl border text-[11px] font-semibold transition-all",
            value === opt.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}>
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);
