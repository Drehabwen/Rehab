/**
 * 研究数据面板：RehabID 覆盖、数据质量、一键传输到 Galen、历史批次。
 *
 * 面向康复师只需要一个动作：确认质量 → 点「导出并传输」。
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Database, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatDate } from '@/lib/session-utils';
import {
  exportResearchToGalen,
  getResearchOverview,
  type ResearchOverview,
} from '@/services/research/service';

const metricText = (value: number | undefined): string => (value === undefined ? '—' : String(value));

export const ResearchDataPanel: React.FC = () => {
  const [overview, setOverview] = useState<ResearchOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await getResearchOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await exportResearchToGalen();
      const kb = (result.bytes / 1024).toFixed(1);
      setMessage(`已写入批次 ${result.batchId}：${result.files.length} 个文件 · ${kb} KB · 评估 ${metricText(result.counts.assessment)} 条`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const quality = overview?.quality;
  const batches = overview?.batches ?? [];

  return (
    <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-token-sm bg-brand-soft text-brand-strong">
              <Database size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">研究数据 · 传输到 Galen</div>
              <div className="mt-0.5 text-xs text-slate-500">
                以 RehabID 为唯一标识导出结构化事件与文书；Galen 在批量数据上做队列、统计与选题。
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => void load()}>
            刷新
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Upload size={14} />}
            loading={busy}
            disabled={!overview?.available}
            onClick={() => void handleExport()}
          >
            导出并传输
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'RehabID 患者', value: metricText(quality?.patients) },
          { label: '评估事件', value: metricText(quality?.assessments) },
          { label: '文书', value: metricText(quality?.documents) },
          { label: '待补全事件', value: metricText(quality?.incompleteEvents) },
        ].map((item) => (
          <div key={item.label} className="rounded-token-sm border border-line-subtle bg-surface-page px-3 py-2">
            <div className="text-lg font-semibold tabular-nums text-slate-900">{item.value}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck size={12} className="text-emerald-600" />
          导出前按字段白名单校验，姓名/备注等私密字段直接拒绝
        </span>
        <span>
          上次传输：{overview?.cursor ? formatDate(overview.cursor) : '尚未传输'}
        </span>
        {quality?.moduleCoverage && (
          <span>
            模块覆盖：体态 {quality.moduleCoverage.posture ?? 0} · ROM {quality.moduleCoverage.rom ?? 0} · 语音{' '}
            {quality.moduleCoverage.medvoice ?? 0} · 量表 {quality.moduleCoverage.scale ?? 0}
          </span>
        )}
      </div>

      {overview && !overview.available && (
        <div className="mt-3 rounded-token-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {overview.reason}
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-token-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-token-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {batches.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">已传输批次</div>
          <div className="mt-2 space-y-2">
            {batches.slice(0, 4).map((batch) => (
              <div
                key={batch.batchId}
                className="flex flex-col gap-1 rounded-token-sm border border-line-subtle bg-white px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-slate-800">{batch.batchId}</span>
                <span className="text-slate-500">
                  {formatDate(batch.exportedAt)} · 患者 {batch.counts.patients ?? 0} · 事件{' '}
                  {(batch.counts.visit ?? 0) + (batch.counts.assessment ?? 0) + (batch.counts.session_report ?? 0)} · 文书{' '}
                  {batch.counts.documents ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
