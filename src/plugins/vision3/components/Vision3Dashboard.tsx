import React from 'react';
import { 
  Activity, 
  Settings2, 
  AlertTriangle, 
  History, 
  TrendingUp, 
  Maximize2 
} from 'lucide-react';
import { PostureMetrics } from '@/hooks/usePostureWS';
import { cn } from '@/lib/utils';
import JointSelector from '@/components/JointSelector';
import MeasurementChart from '@/components/MeasurementChart';
import { COLORS, SIZES, ANIMATIONS, TRANSITIONS, SHADOWS } from '@/constants/uiStyles';

const MetricValue: React.FC<{ value: number; unit?: string; className?: string }> = ({ value, unit, className }) => {
  return (
    <div className="flex flex-col items-end">
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-black tabular-nums transition-all duration-300", className)}>
          {value.toFixed(1)}
        </span>
        {unit && <span className={`text-[10px] font-bold ${COLORS.neutral.light.textLight} uppercase`}>{unit}</span>}
      </div>
    </div>
  );
};

interface Vision3DashboardProps {
  activeTab: 'posture' | 'rom';
  result: {
    metrics: PostureMetrics;
    issues: Array<{
      type: string;
      title: string;
      severity: 'mild' | 'moderate' | 'severe';
      description: string;
      recommendation: string;
    }>;
  } | null;
  showHeadAxes: boolean;
  setShowHeadAxes: React.Dispatch<React.SetStateAction<boolean>>;
  axesScale: number;
  setAxesScale: React.Dispatch<React.SetStateAction<number>>;
  getShoulderStatus: (angle: number) => { text: string; color: string };
  getHeadStatus: (angle: number) => { text: string; color: string; bgColor: string };
  getHipStatus: (angle: number) => { text: string; color: string; bgColor: string };
  getSeverityLabel: (severity: string) => string;
}

export const Vision3Dashboard: React.FC<Vision3DashboardProps> = ({
  activeTab,
  result,
  showHeadAxes,
  setShowHeadAxes,
  axesScale,
  setAxesScale,
  getShoulderStatus,
  getHeadStatus,
  getHipStatus,
  getSeverityLabel,
}) => {
  return (
    <div className="col-span-12 lg:col-span-4 row-span-2 lg:row-span-6 flex flex-col gap-4 overflow-hidden pr-2">
      {activeTab === 'rom' && (
        <div className={`bento-card p-4 ${COLORS.neutral.light.bgSoft}/60 backdrop-blur-md ${COLORS.neutral.light.borderSoft} shadow-lg animate-in slide-in-from-right-4 duration-500`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-[9px] font-black ${COLORS.neutral.light.textLight} uppercase tracking-[0.2em] flex items-center gap-2`}>
              <Settings2 size={12} />
              关节配置
            </h3>
            <div className="px-2 py-0.5 bg-antey-accent/10 rounded-lg">
              <span className="text-[8px] font-black text-antey-accent uppercase tracking-widest">ROM</span>
            </div>
          </div>
          <div className="scale-95 origin-top">
            <JointSelector />
          </div>
        </div>
      )}

      {/* Posture Dashboard / ROM Chart Card */}
      <div className={`bento-card p-8 flex-1 flex flex-col overflow-hidden ${COLORS.neutral.light.bgSoft}/80 backdrop-blur-xl ${COLORS.neutral.light.borderSoft} shadow-2xl shadow-slate-200/50`}>
        <div className="flex items-center justify-between mb-8">
          <h3 className={`text-sm font-black ${COLORS.neutral.light.text} uppercase tracking-[0.2em] flex items-center gap-3`}>
            <div className="p-2 bg-antey-primary/10 rounded-lg">
              <Activity size={18} className="text-antey-primary" />
            </div>
            {activeTab === 'posture' ? '体态评估深度分析' : '关节活动度报告'}
          </h3>
          {activeTab === 'posture' && result && (
            <div className="flex flex-col items-end">
              <span className={`text-[9px] font-black ${COLORS.neutral.light.textLight} uppercase tracking-widest mb-1`}>健康指数</span>
              <div className={cn(
                "text-2xl font-black",
                (100 - result.issues.length * 15) > 80 ? "text-emerald-500" : 
                (100 - result.issues.length * 15) > 60 ? "text-amber-500" : "text-rose-500"
              )}>
                {Math.max(0, 100 - result.issues.length * 15)}
              </div>
            </div>
          )}
        </div>
        
        {activeTab === 'posture' ? (
          <div className="flex-1 flex flex-col min-h-0">
            {!result ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className={`w-48 h-48 rounded-full ${COLORS.neutral.light.bgSoft}/50 flex items-center justify-center mb-10 relative`}>
                  <div className={`absolute inset-8 ${COLORS.neutral.light.bg} rounded-full shadow-inner flex items-center justify-center`}>
                    <Activity size={48} className="text-antey-primary" />
                  </div>
                </div>
                <h4 className={`text-lg font-black ${COLORS.neutral.light.text} uppercase tracking-[0.3em] mb-4`}>AI 核心诊断引擎</h4>
                <div className="flex items-center gap-3 justify-center mb-6">
                  <div className="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-emerald-500" />
                      视觉算法就绪
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-500" />
                      深度学习加载中
                    </span>
                  </div>
                </div>
                <p className={`text-[11px] ${COLORS.neutral.light.textLight} font-bold max-w-[280px] leading-relaxed`}>
                  请确保受测者全身处于镜头范围内，系统将自动识别 <span className="text-antey-primary">33 个</span> 关键骨骼位点并进行实时体态建模
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-8 overflow-hidden">
                {/* Primary Metrics: Visual Gauges */}
                <div className="space-y-6">
                  {/* Shoulder Balance Bar */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black ${COLORS.neutral.light.textLight} uppercase tracking-widest mb-1`}>肩膀平衡度</span>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", getShoulderStatus(result.metrics.shoulderAngle || 0).color.replace('text', 'bg'))} />
                          <span className={cn("text-[11px] font-black uppercase tracking-widest", getShoulderStatus(result.metrics.shoulderAngle || 0).color)}>
                            {getShoulderStatus(result.metrics.shoulderAngle || 0).text}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <MetricValue 
                          value={result.metrics.shoulderAngle || 0} 
                          unit="deg" 
                          className={COLORS.neutral.light.text}
                        />
                        <span className={`text-[8px] font-bold ${COLORS.neutral.light.textLight} uppercase tracking-tighter`}>Deviated Angle</span>
                      </div>
                    </div>
                    <div className={`h-4 ${COLORS.neutral.light.bgSoft} rounded-full relative overflow-hidden ring-4 ring-slate-50`}>
                      <div 
                        className={cn(
                          "absolute top-0 bottom-0 transition-all duration-1000 rounded-full",
                          Math.abs(result.metrics.shoulderAngle || 0) < 1.5 ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" : 
                          Math.abs(result.metrics.shoulderAngle || 0) < 3.5 ? "bg-amber-400" : "bg-rose-400"
                        )}
                        style={{ 
                          left: '50%', 
                          width: `${Math.min(50, Math.abs(result.metrics.shoulderAngle || 0) * 8)}%`,
                          transform: (result.metrics.shoulderAngle || 0) > 0 ? 'none' : 'scaleX(-1)',
                          transformOrigin: 'left'
                        }}
                      />
                      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-300 z-10" />
                    </div>
                  </div>

                  {/* Head Pose Metrics (New) */}
                  {result.metrics.headYaw !== undefined && (
                    <div className={`p-6 ${COLORS.neutral.light.bg} rounded-[2.5rem] ${COLORS.neutral.light.border} shadow-xl animate-in slide-in-from-bottom-4 duration-700`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[9px] font-black ${COLORS.neutral.light.textMuted} uppercase tracking-widest`}>3D 头部位姿 (实验性)</span>
                        <div className="px-2 py-0.5 bg-emerald-500/10 rounded-lg">
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Backend Core</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={() => setShowHeadAxes(prev => !prev)}
                          className={cn(
                            "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            showHeadAxes
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                              : "bg-slate-100 border-slate-200 text-slate-500"
                          )}
                        >
                          {showHeadAxes ? '3D 轴开启' : '3D 轴关闭'}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black ${COLORS.neutral.light.textMuted} uppercase tracking-widest`}>轴长度</span>
                          <input
                            type="range"
                            min={0.6}
                            max={1.6}
                            step={0.1}
                            value={axesScale}
                            onChange={(event) => setAxesScale(Number(event.target.value))}
                            className="h-1 w-20 accent-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col">
                          <span className={`text-[8px] font-black ${COLORS.neutral.light.textMuted} uppercase mb-1`}>Yaw (偏航)</span>
                          <MetricValue value={result.metrics.headYaw} className={`${COLORS.neutral.light.text} text-lg`} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[8px] font-black ${COLORS.neutral.light.textMuted} uppercase mb-1`}>Pitch (俯仰)</span>
                          <MetricValue value={result.metrics.headPitch || 0} className={`${COLORS.neutral.light.text} text-lg`} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[8px] font-black ${COLORS.neutral.light.textMuted} uppercase mb-1`}>Roll (翻滚)</span>
                          <MetricValue value={result.metrics.headRoll || 0} className={`${COLORS.neutral.light.text} text-lg`} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Head Forwardness Gauge */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-6 ${COLORS.neutral.light.bgSoft}/80 rounded-[2.5rem] ${COLORS.neutral.light.borderSoft} group ${COLORS.neutral.light.hover} hover:bg-white hover:shadow-xl transition-all duration-500`}>
                      <div className={`text-[9px] font-black ${COLORS.neutral.light.textLight} uppercase tracking-widest mb-2`}>头颈前倾</div>
                      <MetricValue 
                        value={result.metrics.headForward || 0} 
                        unit="deg" 
                        className={`${COLORS.neutral.light.textSoft} text-3xl`}
                      />
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500",
                        getHeadStatus(result.metrics.headForward || 0).bgColor,
                        getHeadStatus(result.metrics.headForward || 0).color.replace('text', 'border').replace('500', '200')
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", getHeadStatus(result.metrics.headForward || 0).color.replace('text', 'bg'))} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", getHeadStatus(result.metrics.headForward || 0).color)}>
                          {getHeadStatus(result.metrics.headForward || 0).text}
                        </span>
                      </div>
                    </div>
                    <div className={`p-6 ${COLORS.neutral.light.bgSoft}/80 rounded-[2.5rem] ${COLORS.neutral.light.borderSoft} group ${COLORS.neutral.light.hover} hover:bg-white hover:shadow-xl transition-all duration-500`}>
                      <div className={`text-[9px] font-black ${COLORS.neutral.light.textLight} uppercase tracking-widest mb-2`}>骨盆倾斜</div>
                      <MetricValue 
                        value={result.metrics.hipAngle || 0} 
                        unit="deg" 
                        className={`${COLORS.neutral.light.textSoft} text-3xl`}
                      />
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500",
                        getHipStatus(result.metrics.hipAngle || 0).bgColor,
                        getHipStatus(result.metrics.hipAngle || 0).color.replace('text', 'border').replace('500', '200')
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", getHipStatus(result.metrics.hipAngle || 0).color.replace('text', 'bg'))} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", getHipStatus(result.metrics.hipAngle || 0).color)}>
                          {getHipStatus(result.metrics.hipAngle || 0).text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Issues List */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  <div className={`text-[10px] font-black ${COLORS.neutral.light.textLight} uppercase tracking-widest mb-2 flex items-center gap-2 sticky top-0 ${COLORS.neutral.light.bgSoft}/80 backdrop-blur-md py-2 z-10`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-antey-primary animate-pulse" />
                    异常风险预警 ({result.issues.length})
                  </div>
                  {result.issues.map((issue, idx) => (
                    <div key={idx} className={`p-6 ${COLORS.neutral.light.bg} rounded-[2.5rem] ${COLORS.neutral.light.borderSoft} shadow-sm hover:shadow-2xl hover:border-antey-primary/30 transition-all group animate-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className="flex items-start gap-5">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 transition-transform group-hover:scale-110 duration-500",
                          issue.severity === 'severe' ? "bg-rose-50 text-rose-500" : 
                          issue.severity === 'moderate' ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"
                        )}>
                          <AlertTriangle size={28} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-black ${COLORS.neutral.light.text} uppercase tracking-widest`}>{issue.title || issue.type}</span>
                            <span className={cn(
                              "text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em]",
                              issue.severity === 'severe' ? "bg-rose-100 text-rose-600" : 
                              issue.severity === 'moderate' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                            )}>
                              {getSeverityLabel(issue.severity)}
                            </span>
                          </div>
                          <p className={`text-[11px] font-medium ${COLORS.neutral.light.textMuted} leading-relaxed mb-4`}>
                            {issue.description}
                          </p>
                          <div className={`p-4 ${COLORS.neutral.light.bgSoft}/50 rounded-2xl ${COLORS.neutral.light.borderSoft} group-hover:bg-white transition-colors`}>
                            <div className={`text-[8px] font-black ${COLORS.neutral.light.textLight} uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2`}>
                              <Activity size={10} className="text-antey-primary" />
                              康复建议
                            </div>
                            <p className={`text-[10px] font-bold ${COLORS.neutral.light.textMuted} leading-relaxed`}>{issue.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button className={`py-4 rounded-2xl ${COLORS.neutral.light.bg} ${COLORS.neutral.light.border} ${COLORS.neutral.light.text} ${COLORS.neutral.light.hover} transition-all flex items-center justify-center gap-2`}>
                    <History size={14} />
                    对比历史
                  </button>
                  <button className="py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-antey-primary hover:shadow-antey-primary/30 transition-all group flex items-center justify-center gap-2">
                    <span>生成 PDF 报告</span>
                    <TrendingUp size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`flex-1 min-h-[420px] ${COLORS.neutral.light.bgSoft}/30 rounded-[2.5rem] ${COLORS.neutral.light.borderSoft} p-6 mb-8 relative group/chart`}>
              <div className="absolute top-6 right-6 z-10 opacity-0 group-hover/chart:opacity-100 transition-opacity">
                <button className={`p-2 ${COLORS.neutral.light.bgSoft}/80 backdrop-blur-md rounded-xl ${COLORS.neutral.light.border} shadow-sm ${COLORS.neutral.light.textLight} hover:text-antey-accent hover:border-antey-accent/30 transition-all`}>
                  <Maximize2 size={16} />
                </button>
              </div>
              <MeasurementChart />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
