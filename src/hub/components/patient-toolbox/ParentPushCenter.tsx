import React, { useEffect, useState, useCallback } from 'react';
import {
  Send, FileText, ClipboardList, Dumbbell,
  Check, AlertCircle, RotateCw, ChevronDown, ChevronUp,
  Clock, TrendingUp, Activity, AlertTriangle, Bell,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import {
  IntegrationService,
  type ParentReportResult,
  type PatientReminders,
  type ReminderItem,
  SCALE_INTERVALS,
} from '@/services/integrationService';
import { cn } from '@/lib/utils';
import {
  SCALE_OPTIONS, PLAN_TEMPLATE,
  type AssessmentInfo, type PlanInfo, type ScaleInfo,
  type TrackingRecord, type ParentPushCenterProps,
} from './ParentPushCenter.data';

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
  const [parentReports, setParentReports] = useState<ParentReportResult[]>([]);
  const [reminders, setReminders] = useState<PatientReminders | null>(null);

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
      const [ast, plans, scaleResults, trackingData, parentReportData, reminderData] = await Promise.all([
        IntegrationService.getAssessmentSummary(patient.id),
        IntegrationService.getTreatmentPlans(patient.id),
        IntegrationService.getScaleResultsByPatient(patient.id),
        IntegrationService.getTrackingHistory(patient.id),
        IntegrationService.getParentReports(patient.id),
        IntegrationService.getReminders(patient.id).catch(() => null),
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

      setScales(scaleResults.map(s => ({
        taskId: s.task_id,
        scaleId: s.scale_id,
        sessionId: s.session_id,
        status: s.status,
        createdAt: s.created_at,
        submittedAt: s.submitted_at,
        scaleData: s.scale_data,
      })));

      setTracking(trackingData.slice(0, 7)); // 最近7天
      setParentReports(parentReportData);
      setReminders(reminderData);
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

  // ── Reminder helpers ──

  const getReminderFor = (itemType: string, itemId: string): ReminderItem | undefined => {
    return reminders?.items.find(it => it.item_type === itemType && it.item_id === itemId);
  };

  const getScaleReminder = (scaleId: string): ReminderItem | undefined => {
    return getReminderFor('scale', scaleId);
  };

  const planReminder = getReminderFor('plan', 'treatment_plan');
  const assessmentReminder = getReminderFor('assessment', 'assessment_summary');

  // ── Derived ──

  const trackingSummary = tracking.length > 0 ? (() => {
    const completedDays = tracking.filter(t => t.total_duration_min > 0).length;
    const avgPain = tracking.reduce((sum, t) => sum + (t.symptoms?.pain_level || 0), 0) / tracking.length;
    return { completedDays, total: tracking.length, avgPain: avgPain.toFixed(1) };
  })() : null;
  const pendingScaleCount = scales.filter(s => s.status === 'pending').length;
  const completedScaleCount = scales.filter(s => s.status === 'completed').length;
  const latestParentReport = parentReports[0];
  const totalOverdue = reminders?.overdue_count ?? 0;
  const totalDueSoon = reminders?.due_soon_count ?? 0;

  // ── Render ──

  return (
    <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Send size={18} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-900">推送至家长端</h3>
          <p className="text-xs text-slate-500">评估摘要、训练处方、量表处方一键推送到小柱家长端</p>
        </div>
        {reminders && (totalOverdue > 0 || totalDueSoon > 0) && (
          <div className="flex items-center gap-1.5">
            {totalOverdue > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                <AlertCircle size={12} />
                {totalOverdue} 项逾期
              </span>
            )}
            {totalDueSoon > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <AlertTriangle size={12} />
                {totalDueSoon} 项临近
              </span>
            )}
          </div>
        )}
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
            reminder={assessmentReminder}
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
                  <ReminderBadge reminder={planReminder} />
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
                  {pendingScaleCount > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {pendingScaleCount} 份待填写
                    </span>
                  )}
                  {completedScaleCount > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {completedScaleCount} 份已回传
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
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.adminLevel === 'parent' ? '🟢 家长自评' : '🟡 适配版'}
                    </option>
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

              {/* Classification note */}
              <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <AlertCircle size={12} />
                仅展示可下发给家长的<b className="text-emerald-600">患者自评量表（PROM）</b>类量表。
                Berg/MMT/MAS 等<b className="text-red-500">专业评定</b>类量表需在诊所内由康复师完成。
              </p>
            </div>

            {/* Scale status list */}
            {scales.length > 0 && (
              <div className="mt-2 space-y-1">
                {scales.map(s => {
                  const scaleReminder = getScaleReminder(s.scaleId);
                  return (
                    <div key={s.taskId} className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        s.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'
                      )} />
                      {s.scaleId} — {s.status === 'completed' ? '已完成' : '待填写'}
                      {s.status === 'completed' && s.scaleData?.totalScore !== undefined && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          {s.scaleData.totalScore}/{s.scaleData.maxScore ?? '-'} 分
                        </span>
                      )}
                      <span className="text-slate-400">· {new Date(s.createdAt).toLocaleDateString()}</span>
                      {s.submittedAt && (
                        <span className="text-emerald-600">回传于 {new Date(s.submittedAt).toLocaleString()}</span>
                      )}
                      {/* 提醒标签 */}
                      {scaleReminder && (scaleReminder.status === 'overdue' || scaleReminder.status === 'due_soon') && (
                        <ReminderBadge reminder={scaleReminder} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 未推送过的量表提醒（从 reminders 中找 missing 或 overdue 的） */}
            {reminders && (
              <div className="mt-2 space-y-1">
                {reminders.items
                  .filter(it => it.item_type === 'scale' && (it.status === 'overdue' || it.status === 'missing'))
                  .filter(it => !scales.some(s => s.scaleId === it.item_id))
                  .map(it => (
                    <div key={it.item_id} className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span className="text-slate-500">{it.item_label}</span>
                      <ReminderBadge reminder={it} />
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
                {latestParentReport && (
                  <div className="space-y-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-sky-800">
                        <FileText size={13} />
                        家长自筛报告
                      </div>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-sky-700">
                        {parentReports.length} 份已回传
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {latestParentReport.risk_label || latestParentReport.risk_level || '已提交'}
                      </span>
                      {latestParentReport.payload?.total !== undefined && (
                        <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-sky-700">
                          {latestParentReport.payload.total}/160 分
                        </span>
                      )}
                      <span className="text-slate-400">
                        {new Date(latestParentReport.submitted_at).toLocaleString()}
                      </span>
                    </div>
                    {(latestParentReport.summary_text || latestParentReport.recommendation) && (
                      <p className="text-xs leading-5 text-slate-600">
                        {latestParentReport.summary_text || latestParentReport.recommendation}
                      </p>
                    )}
                  </div>
                )}

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
                      <div className="text-lg font-bold text-violet-700">{completedScaleCount}</div>
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
                {completedScaleCount > 0 && (
                  <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                      <TrendingUp size={13} />
                      家长已回传量表
                    </div>
                    {scales.filter(s => s.status === 'completed').map(s => (
                      <div key={s.taskId} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{s.scaleId}</span>
                        {s.scaleData?.scaleName && <span>{s.scaleData.scaleName}</span>}
                        {s.scaleData?.totalScore !== undefined && (
                          <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-emerald-700">
                            {s.scaleData.totalScore}/{s.scaleData.maxScore ?? '-'} 分
                          </span>
                        )}
                        {s.submittedAt && <span className="text-slate-400">{new Date(s.submittedAt).toLocaleString()}</span>}
                      </div>
                    ))}
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

// ── Helper: ReminderBadge ──

const ReminderBadge: React.FC<{ reminder?: ReminderItem }> = ({ reminder }) => {
  if (!reminder) return null;

  if (reminder.status === 'overdue') {
    return (
      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
        <AlertCircle size={10} />
        {reminder.days_since_last != null
          ? `逾期 ${reminder.days_since_last} 天`
          : '逾期'}
      </span>
    );
  }

  if (reminder.status === 'due_soon') {
    const remaining = reminder.recommended_interval - (reminder.days_since_last ?? 0);
    return (
      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
        <AlertTriangle size={10} />
        {remaining > 0 ? `还剩 ${remaining} 天` : '即将到期'}
      </span>
    );
  }

  if (reminder.status === 'missing') {
    return (
      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
        <Bell size={10} />
        尚未推送
      </span>
    );
  }

  // "ok" — show subtle time since push
  if (reminder.days_since_last != null && reminder.days_since_last > 0) {
    return (
      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-slate-400">
        <Clock size={10} />
        {reminder.days_since_last} 天前
      </span>
    );
  }

  return null;
};

// ── Helper: PushRow ──

const PushRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  done: boolean;
  doneText: string;
  doneSub: string;
  pendingText: string;
  reminder?: ReminderItem;
}> = ({ icon, label, done, doneText, doneSub, pendingText, reminder }) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
    <div className="flex items-center gap-2.5">
      <span className="text-slate-500">{icon}</span>
      <div>
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        {done ? (
          <>
            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Check size={11} className="mr-1" />{doneText}
            </span>
            <ReminderBadge reminder={reminder} />
          </>
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
