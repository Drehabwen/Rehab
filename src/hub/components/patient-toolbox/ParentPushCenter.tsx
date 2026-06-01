import React, { useEffect, useState, useCallback } from 'react';
import {
  Send, FileText, ClipboardList, Dumbbell,
  Check, AlertCircle, RotateCw, ChevronDown, ChevronUp,
  Clock, TrendingUp, Activity,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { Patient } from '@/types/patient';
import { IntegrationService } from '@/services/integrationService';
import { cn } from '@/lib/utils';

// ── 量表模板 ──

const SCALE_OPTIONS = [
  { id: 'SRS-22' as const, name: 'SRS-22 脊柱侧弯问卷', desc: '功能/疼痛/自我形象/精神健康/满意度' },
  { id: 'ODI' as const, name: 'ODI 功能障碍指数', desc: '下背痛日常活动障碍评估' },
  { id: 'VAS' as const, name: 'VAS 视觉模拟疼痛评分', desc: '疼痛强度快速评估' },
];

// ── 处方模板 ──

const PLAN_TEMPLATE = `# 个人化脊柱侧弯康复训练方案

## 训练原则
- Schroth 三维脊柱侧弯矫正体操
- 重点矫正（待填写）侧凸
- 配合旋转呼吸训练
- 每天坚持，循序渐进

## 热身（5分钟）
- 猫牛式：缓慢进行，配合呼吸，10次
- 骨盆前后倾：激活核心肌群，10次
- 肩胛骨回缩：改善驼背姿势，10次

## 核心训练（15分钟）
- 侧平板支撑：增强核心力量，3组×30秒
- 死虫式：核心稳定训练，3组×10次
- Schroth旋转呼吸：在矫正位进行深呼吸，5分钟

## 拉伸放松（10分钟）
- 胸椎凹侧拉伸：针对性拉伸，3组×30秒
- 胸肌拉伸：改善前侧紧张，2组×30秒
- 儿童式放松：结束放松，2分钟

## 注意事项
1. 训练时穿着舒适运动服
2. 训练前确保支具已取下
3. 如出现疼痛立即停止，联系康复师
4. 每天记录训练完成情况`;

// ── Types ──

interface AssessmentInfo {
  exists: boolean;
  riskLabel?: string;
  summaryText?: string;
  createdAt?: string;
}

interface PlanInfo {
  exists: boolean;
  planId?: string;
  content?: string;
  status?: string;
  createdAt?: string;
}

interface ScaleInfo {
  taskId: string;
  scaleId: string;
  status: string;
  createdAt: string;
}

interface TrackingRecord {
  tracking_date: string;
  total_duration_min: number;
  exercises_completed: Array<{ name: string; duration: number; completed: boolean }>;
  symptoms: Record<string, any>;
  notes: string;
}

interface ParentPushCenterProps {
  patient: Patient;
  sessionId?: string | null;
  therapistName?: string;
}

export const ParentPushCenter: React.FC<ParentPushCenterProps> = ({
  patient,
  sessionId,
  therapistName = '康复师',
}) => {
  // ── State ──
  const [assessment, setAssessment] = useState<AssessmentInfo>({ exists: false });
  const [plan, setPlan] = useState<PlanInfo>({ exists: false });
  const [scales, setScales] = useState<ScaleInfo[]>([]);
  const [tracking, setTracking] = useState<TrackingRecord[]>([]);

  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [planContent, setPlanContent] = useState(PLAN_TEMPLATE);
  const [selectedScale, setSelectedScale] = useState<string>('SRS-22');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Load all data ──

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ast, plans, pendingScales, trackingData] = await Promise.all([
        IntegrationService.getAssessmentSummary(patient.id),
        IntegrationService.getTreatmentPlans(patient.id),
        IntegrationService.getPendingScales(patient.id),
        IntegrationService.getTrackingHistory(patient.id),
      ]);

      setAssessment(ast ? {
        exists: true,
        riskLabel: ast.risk_label,
        summaryText: ast.summary_text,
        createdAt: ast.created_at,
      } : { exists: false });

      const latestPlan = plans[0];
      setPlan(latestPlan ? {
        exists: true,
        planId: latestPlan.plan_id,
        content: latestPlan.plan_content,
        status: latestPlan.status,
        createdAt: latestPlan.created_at,
      } : { exists: false });

      setScales(pendingScales.map(s => ({
        taskId: s.task_id,
        scaleId: s.scale_id,
        status: s.status,
        createdAt: s.created_at,
      })));

      setTracking(trackingData.slice(0, 7)); // 最近7天
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [patient.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Push actions ──

  const handlePushPlan = async () => {
    setActionLoading('plan');
    setError(null);
    setSuccessMsg(null);
    try {
      await IntegrationService.pushTreatmentPlan({
        patient_id: patient.id,
        patient_name: patient.name || patient.id,
        session_id: sessionId || `manual_${Date.now()}`,
        therapist_name: therapistName,
        plan_content: planContent,
      });
      setSuccessMsg('训练处方已推送至家长端');
      setPlanEditorOpen(false);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '推送失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePushScale = async () => {
    setActionLoading('scale');
    setError(null);
    setSuccessMsg(null);
    try {
      await IntegrationService.pushScaleTask({
        patient_id: patient.id,
        patient_name: patient.name || patient.id,
        session_id: sessionId || `manual_${Date.now()}`,
        scale_id: selectedScale as 'SRS-22' | 'ODI' | 'VAS',
        therapist_name: therapistName,
      });
      setSuccessMsg(`${selectedScale} 量表已推送至家长端`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '推送失败');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Derived ──

  const trackingSummary = tracking.length > 0 ? (() => {
    const completedDays = tracking.filter(t => t.total_duration_min > 0).length;
    const avgPain = tracking.reduce((sum, t) => sum + (t.symptoms?.pain_level || 0), 0) / tracking.length;
    return { completedDays, total: tracking.length, avgPain: avgPain.toFixed(1) };
  })() : null;

  // ── Render ──

  return (
    <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Send size={18} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">推送至家长端</h3>
          <p className="text-xs text-slate-500">评估摘要、训练处方、量表处方一键推送到小柱家长端</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
          <RotateCw className="animate-spin" size={15} />
          正在加载推送状态...
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── 评估摘要 ── */}
          <PushRow
            icon={<FileText size={16} />}
            label="评估摘要"
            done={assessment.exists}
            doneText={assessment.riskLabel || '已推送'}
            doneSub={assessment.createdAt ? `推送于 ${new Date(assessment.createdAt).toLocaleDateString()}` : ''}
            pendingText="完成接诊评估后将自动推送"
          />

          {/* ── 训练处方 ── */}
          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Dumbbell size={16} className="text-slate-500" />
                <div>
                  <span className="text-sm font-semibold text-slate-800">训练处方</span>
                  {plan.exists && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <Check size={11} className="mr-1" />已推送
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant={plan.exists ? 'secondary' : 'primary'}
                size="sm"
                icon={plan.exists ? <FileText size={14} /> : <Send size={14} />}
                onClick={() => {
                  setPlanContent(plan.content || PLAN_TEMPLATE);
                  setPlanEditorOpen(!planEditorOpen);
                }}
              >
                {plan.exists ? '查看/更新' : '编辑处方'}
              </Button>
            </div>

            {/* Plan editor (expandable) */}
            {planEditorOpen && (
              <div className="mt-3 space-y-3">
                <textarea
                  value={planContent}
                  onChange={(e) => setPlanContent(e.target.value)}
                  rows={12}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-mono text-slate-700 outline-none focus:border-violet-400 resize-y"
                  placeholder="输入 Markdown 格式的训练处方..."
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPlanEditorOpen(false)}>
                    取消
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Send size={14} />}
                    loading={actionLoading === 'plan'}
                    onClick={handlePushPlan}
                  >
                    推送至家长端
                  </Button>
                </div>
              </div>
            )}

            {plan.exists && !planEditorOpen && plan.content && (
              <div className="mt-2 text-xs text-slate-500 line-clamp-2">
                {plan.content.slice(0, 120).replace(/#/g, '')}...
              </div>
            )}
          </div>

          {/* ── 量表处方 ── */}
          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ClipboardList size={16} className="text-slate-500" />
                <div>
                  <span className="text-sm font-semibold text-slate-800">量表处方</span>
                  {scales.filter(s => s.status === 'pending').length > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {scales.filter(s => s.status === 'pending').length} 份待填写
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedScale}
                  onChange={(e) => setSelectedScale(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none"
                >
                  {SCALE_OPTIONS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send size={14} />}
                  loading={actionLoading === 'scale'}
                  onClick={handlePushScale}
                >
                  推送
                </Button>
              </div>
            </div>

            {/* Scale status list */}
            {scales.length > 0 && (
              <div className="mt-2 space-y-1">
                {scales.map(s => (
                  <div key={s.taskId} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      s.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'
                    )} />
                    {s.scaleId} — {s.status === 'completed' ? '已完成' : '待填写'}
                    <span className="text-slate-400">· {new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Messages ── */}
          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 flex items-center gap-2">
              <Check size={14} />
              {successMsg}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* ── 家长反馈（可折叠） ── */}
          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={() => setFeedbackOpen(!feedbackOpen)}
              className="flex w-full items-center justify-between text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Activity size={15} />
                家长端反馈数据
                {trackingSummary && (
                  <span className="text-xs text-slate-400 font-normal">
                    ({trackingSummary.completedDays}/{trackingSummary.total}天打卡)
                  </span>
                )}
              </span>
              {feedbackOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {feedbackOpen && (
              <div className="mt-3 space-y-3">
                {/* Tracking summary */}
                {trackingSummary ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3 text-center">
                      <div className="text-lg font-bold text-emerald-700">{trackingSummary.completedDays}</div>
                      <div className="text-xs text-emerald-600">训练天数</div>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3 text-center">
                      <div className="text-lg font-bold text-blue-700">{trackingSummary.avgPain}</div>
                      <div className="text-xs text-blue-600">平均疼痛 /10</div>
                    </div>
                    <div className="rounded-xl bg-violet-50 p-3 text-center">
                      <div className="text-lg font-bold text-violet-700">{scales.filter(s => s.status === 'completed').length}</div>
                      <div className="text-xs text-violet-600">已填量表</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">暂无打卡数据，等待家长开始训练</p>
                )}

                {/* Recent tracking entries */}
                {tracking.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-[1fr_80px_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                      <span>日期</span>
                      <span className="text-center">时长</span>
                      <span>备注</span>
                    </div>
                    {tracking.slice(0, 5).map((t, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_1fr] items-center border-t border-slate-100 px-3 py-2 text-xs">
                        <span className="flex items-center gap-1 text-slate-700">
                          <Clock size={11} className="text-slate-400" />
                          {t.tracking_date}
                        </span>
                        <span className="text-center font-medium text-slate-700">{t.total_duration_min} 分钟</span>
                        <span className="truncate text-slate-500">{t.notes || '-'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scale results */}
                {scales.filter(s => s.status === 'completed').length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <TrendingUp size={13} />
                    {scales.filter(s => s.status === 'completed').map(s => s.scaleId).join('、')} 已完成
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

// ── Helper: PushRow ──

const PushRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  done: boolean;
  doneText: string;
  doneSub: string;
  pendingText: string;
}> = ({ icon, label, done, doneText, doneSub, pendingText }) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
    <div className="flex items-center gap-2.5">
      <span className="text-slate-500">{icon}</span>
      <div>
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {done ? (
          <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <Check size={11} className="mr-1" />{doneText}
          </span>
        ) : (
          <span className="ml-2 text-xs text-slate-400">{pendingText}</span>
        )}
      </div>
    </div>
    {done && doneSub && (
      <span className="text-xs text-slate-400">{doneSub}</span>
    )}
  </div>
);
