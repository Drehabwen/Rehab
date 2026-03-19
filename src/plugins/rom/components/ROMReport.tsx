import React, { useMemo } from 'react';
import { FileText, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ROMAssessment } from '../types';
import { ROMService } from '../services/ROMService';
import { calculateROMStatus, directionNameMap, getROMReferenceAngle, jointNameMap, normalROMRanges } from '../utils/rom-utils';
import { ROM_TEXTS } from '../constants/uiText';
import { UnifiedStatusBadge } from '@/components/layout';

interface ROMReportProps {
  assessment: ROMAssessment;
  onExport: (assessment: ROMAssessment) => void;
}

const statusToneMap: Record<'normal' | 'limited' | 'excessive', 'success' | 'warning' | 'error'> = {
  normal: 'success',
  limited: 'warning',
  excessive: 'error',
};

export const ROMReport: React.FC<ROMReportProps> = ({ assessment, onExport }) => {
  const report = ROMService.generateReport(assessment);

  const analyzedItems = useMemo(() => {
    return assessment.data.map((item) => {
      const referenceAngle = getROMReferenceAngle(item);
      const status = calculateROMStatus(item.joint, item.direction, referenceAngle);
      const referenceRange = normalROMRanges[item.joint]?.[item.direction];
      const romRange =
        Number.isFinite(item.maxAngle) && Number.isFinite(item.minAngle)
          ? Math.max(0, item.maxAngle - item.minAngle)
          : 0;
      const targetMax = referenceRange?.max ?? 0;
      const deviation = referenceRange ? referenceAngle - targetMax : 0;
      return {
        ...item,
        status,
        jointLabel: jointNameMap[item.joint],
        directionLabel: directionNameMap[item.direction],
        referenceAngle,
        targetMax,
        romRange,
        deviation,
      };
    });
  }, [assessment.data]);

  const stats = useMemo(() => {
    const normal = analyzedItems.filter((item) => item.status === 'normal').length;
    const limited = analyzedItems.filter((item) => item.status === 'limited').length;
    const excessive = analyzedItems.filter((item) => item.status === 'excessive').length;
    return { normal, limited, excessive };
  }, [analyzedItems]);

  const recommendations = useMemo(() => ROMService.generateRecommendations(assessment.data), [assessment.data]);
  const averageConfidence = useMemo(() => {
    if (analyzedItems.length === 0) return 0;
    const total = analyzedItems.reduce((sum, item) => sum + item.confidence, 0);
    return Math.round((total / analyzedItems.length) * 100);
  }, [analyzedItems]);

  return (
    <div className="space-y-4">
      <section className="rounded-20 border border-slate-200 bg-white p-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">关节活动度评估报告</h3>
          </div>
          <p className="text-sm text-slate-500 mt-1">{new Date(assessment.createdAt).toLocaleString('zh-CN')}</p>
          <p className="text-xs text-slate-500 mt-1">评估编号：{assessment.id}</p>
        </div>

        <button onClick={() => onExport(assessment)} className="btn-primary">
          <Download size={14} />
          导出报告
        </button>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bento-card p-4">
          <p className="text-xs text-slate-500">正常项</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.normal}</p>
          <UnifiedStatusBadge status="success" text="范围正常" className="mt-2" />
        </div>
        <div className="bento-card p-4">
          <p className="text-xs text-slate-500">活动受限</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.limited}</p>
          <UnifiedStatusBadge status="warning" text={ROM_TEXTS.status.limited} className="mt-2" />
        </div>
        <div className="bento-card p-4">
          <p className="text-xs text-slate-500">活动过度</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{stats.excessive}</p>
          <UnifiedStatusBadge status="error" text={ROM_TEXTS.status.excessive} className="mt-2" />
        </div>
      </section>

      <section className="bento-card p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">数据质量</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">平均置信度 {averageConfidence}%</p>
        </div>
        <UnifiedStatusBadge
          status={averageConfidence >= 80 ? 'success' : averageConfidence >= 60 ? 'warning' : 'error'}
          text={averageConfidence >= 80 ? '数据可靠' : averageConfidence >= 60 ? '建议复核' : '建议重测'}
        />
      </section>

      <section className="bento-card p-0 overflow-hidden">
        <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
          <span>动作项</span>
          <span>当前角度</span>
          <span>参考角度</span>
          <span>ROM 幅度</span>
          <span>参考上限</span>
          <span>偏差</span>
          <span>置信度</span>
          <span>状态</span>
        </div>

        <div className="divide-y divide-slate-200">
          {analyzedItems.map((item, index) => (
            <div key={`${item.joint}-${item.direction}-${index}`} className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-3 px-4 py-3 items-center hover:bg-slate-50/80">
              <div>
                <p className="text-sm font-medium text-slate-900">{item.jointLabel} · {item.directionLabel}</p>
                <p className="text-xs text-slate-500 mt-1">{item.side === 'left' ? '左侧' : '右侧'}</p>
              </div>
              <span className="text-sm text-slate-800 tabular-nums">{item.angle.toFixed(1)}°</span>
              <span className="text-sm text-slate-800 tabular-nums">{item.referenceAngle.toFixed(1)}°</span>
              <span className="text-sm text-slate-800 tabular-nums">{item.romRange.toFixed(1)}°</span>
              <span className="text-sm text-slate-600 tabular-nums">{item.targetMax.toFixed(1)}°</span>
              <span className={item.deviation > 0 ? 'text-sm tabular-nums text-rose-600' : 'text-sm tabular-nums text-emerald-600'}>
                {item.deviation > 0 ? '+' : ''}{item.deviation.toFixed(1)}°
              </span>
              <span className="text-sm text-slate-600 tabular-nums">{Math.round(item.confidence * 100)}%</span>
              <UnifiedStatusBadge status={statusToneMap[item.status]} text={ROM_TEXTS.status[item.status]} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bento-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <p className="text-sm font-semibold text-slate-900">康复建议</p>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            {recommendations.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{item}</li>
            ))}
          </ul>
        </div>

        <div className="bento-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-sm font-semibold text-slate-900">结构化摘要</p>
          </div>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap max-h-[240px] overflow-y-auto custom-scrollbar">{report}</pre>
        </div>
      </section>
    </div>
  );
};
