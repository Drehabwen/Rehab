import React from 'react';
import {
  Maximize2,
  Minimize2,
  Video,
  VideoOff,
  Play,
  Square,
  RotateCcw,
  Activity,
  Clock3,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BaseWebcamView from '@/components/shared/BaseWebcamView';
import type { ActiveMeasurement } from '@/store/useMeasurementStore';
import type { JointType, MovementDirection } from '../types';
import { ROM_TEXTS, getROMDirectionLabel, getROMSideLabel } from '../constants/uiText';
import { PageTitleSection, UnifiedStatusBadge } from '@/components/layout';
import { COLORS } from '@/constants/uiStyles';

interface ROMCameraStageProps {
  videoContainerRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  isCameraOn: boolean;
  isMirrored: boolean;
  isMeasuring: boolean;
  activeMeasurements: ActiveMeasurement[];
  selectedJoint: JointType;
  selectedDirection: MovementDirection;
  selectedSide: 'left' | 'right';
  onResults: (results: unknown, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  startROMAssessment: () => void;
  stopROMAssessment: () => void;
  resetROMAssessment: () => void;
  setIsCameraOn: (enabled: boolean) => void;
  toggleFullscreen: () => void;
  qualityFeedback?: {
    tone: 'warning' | 'error' | 'success';
    text: string;
  } | null;
}

const formatAngle = (value: number) => {
  if (!Number.isFinite(value) || value === Infinity || value === -Infinity) {
    return '--';
  }
  return value.toFixed(1);
};

export const ROMCameraStage: React.FC<ROMCameraStageProps> = ({
  videoContainerRef,
  isFullscreen,
  isCameraOn,
  isMirrored,
  isMeasuring,
  activeMeasurements,
  selectedJoint,
  selectedDirection,
  selectedSide,
  onResults,
  startROMAssessment,
  stopROMAssessment,
  resetROMAssessment,
  setIsCameraOn,
  toggleFullscreen,
  qualityFeedback,
}) => {
  const currentMeasurement = activeMeasurements[0];
  const sampleCount = currentMeasurement?.data.length ?? 0;
  const durationSec = sampleCount > 0 ? currentMeasurement.data[sampleCount - 1].timestamp : 0;
  const hasMeasuredData = sampleCount > 0;

  const status = isMeasuring
    ? { badge: 'processing' as const, text: '测量中', message: '正在采集动作数据，请保持姿势稳定' }
    : hasMeasuredData
      ? { badge: 'success' as const, text: '已测量', message: '当前动作已完成采集，可停止并查看结果' }
      : { badge: 'disabled' as const, text: '未测量', message: '点击开始测量后系统将自动记录角度曲线' };

  const selectedSideLabel = getROMSideLabel(selectedJoint, selectedSide);
  const selectedJointLabel = ROM_TEXTS.joints[selectedJoint];
  const selectedDirectionLabel = getROMDirectionLabel(selectedJoint, selectedDirection);
  const captureProgress = isMeasuring ? Math.min(100, sampleCount * 2) : hasMeasuredData ? 100 : 0;
  const overlayPanelClass = 'rounded-xl border border-slate-200 bg-white/95';
  const mutedCardClass = 'rounded-20 border border-slate-200 bg-slate-50 p-4';
  const whiteCardClass = 'rounded-20 border border-slate-200 bg-white p-4';
  const metricCardClass = 'rounded-xl border border-slate-200 bg-slate-50 p-3';
  const sectionTitleClass = 'text-sm font-semibold text-slate-900';
  const bodyTextClass = 'text-sm text-slate-700';
  const helperTextClass = 'text-xs text-slate-500';
  const iconClass = COLORS.neutral.slate600;
  const progressTrackClass = 'h-2 w-full overflow-hidden rounded-full bg-slate-100';
  const progressFillClass = isMeasuring ? 'bg-blue-600' : hasMeasuredData ? 'bg-emerald-600' : 'bg-slate-300';
  const qualityToneClass = qualityFeedback?.tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : qualityFeedback?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner h-full min-h-0">
        <PageTitleSection
          title="关节活动度测量"
          description={`${selectedJointLabel} · ${selectedDirectionLabel} · ${selectedSideLabel}`}
          right={<UnifiedStatusBadge status={status.badge} text={status.text} />}
        />

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 min-h-0 flex-1">
          <div className="bento-card p-4 min-h-[560px] relative" ref={videoContainerRef}>
            <BaseWebcamView
              isCameraOn={isCameraOn}
              isMirrored={isMirrored}
              onResults={onResults}
              className="w-full h-full rounded-20"
            />

            <div className="absolute left-6 right-6 top-6 pointer-events-none">
              <div className={cn(overlayPanelClass, 'flex items-center justify-between px-4 py-3')}>
                <div>
                  <p className={sectionTitleClass}>{status.message}</p>
                  <p className={cn(helperTextClass, 'mt-1')}>实时采样 {sampleCount} 帧 · 持续 {durationSec.toFixed(1)} 秒</p>
                </div>
                <UnifiedStatusBadge status={status.badge} text={status.text} />
              </div>
            </div>

            <div className="absolute left-6 right-6 bottom-6">
              <div className={cn(overlayPanelClass, 'flex flex-wrap items-center justify-center gap-2 p-3')}>
                <button
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className="btn-secondary"
                  title={isCameraOn ? '关闭摄像头' : '开启摄像头'}
                >
                  {isCameraOn ? <VideoOff size={14} /> : <Video size={14} />}
                  {isCameraOn ? '关闭摄像头' : '开启摄像头'}
                </button>

                {isMeasuring ? (
                  <button onClick={stopROMAssessment} className="btn-primary" title="停止测量">
                    <Square size={14} />
                    停止并生成结果
                  </button>
                ) : (
                  <button onClick={startROMAssessment} className="btn-primary" title="发起评估">
                    <Play size={14} />
                    发起评估
                  </button>
                )}

                <button onClick={resetROMAssessment} className="btn-tertiary" title="返回入口">
                  <RotateCcw size={14} />
                  返回入口
                </button>

                <button onClick={toggleFullscreen} className="btn-icon" title={isFullscreen ? '退出全屏' : '进入全屏'}>
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>
          </div>

          <aside className="bento-card p-5 flex flex-col gap-4 min-h-[560px]">
            <div className={mutedCardClass}>
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className={iconClass} />
                <p className={sectionTitleClass}>当前测量目标</p>
              </div>
              <p className={bodyTextClass}>{selectedJointLabel} · {selectedDirectionLabel} · {selectedSideLabel}</p>
              <p className={cn(helperTextClass, 'mt-1')}>建议动作稳定保持 3-5 秒，避免快速摆动。</p>
            </div>

            <div className={whiteCardClass}>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className={iconClass} />
                <p className={sectionTitleClass}>测量进度</p>
              </div>
              <div
                className={progressTrackClass}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={captureProgress}
              >
                <div className={cn('h-full transition-all', progressFillClass)} style={{ width: `${captureProgress}%` }} />
              </div>
              <div className={cn(helperTextClass, 'mt-2 flex items-center justify-between')}>
                <span>{isMeasuring ? '采集中' : hasMeasuredData ? '已完成' : '待开始'}</span>
                <span>{captureProgress}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={metricCardClass}>
                <p className={helperTextClass}>当前角度</p>
                <p className={cn('mt-1 text-xl font-semibold', COLORS.neutral.light.text)}>{formatAngle(currentMeasurement?.currentAngle ?? 0)}°</p>
              </div>
              <div className={metricCardClass}>
                <p className={helperTextClass}>采样时长</p>
                <p className={cn('mt-1 text-xl font-semibold', COLORS.neutral.light.text)}>{durationSec.toFixed(1)}s</p>
              </div>
              <div className={metricCardClass}>
                <p className={helperTextClass}>最大角度</p>
                <p className={cn('mt-1 text-xl font-semibold', COLORS.neutral.light.text)}>{formatAngle(currentMeasurement?.maxAngle ?? 0)}°</p>
              </div>
              <div className={metricCardClass}>
                <p className={helperTextClass}>最小角度</p>
                <p className={cn('mt-1 text-xl font-semibold', COLORS.neutral.light.text)}>{formatAngle(currentMeasurement?.minAngle ?? 0)}°</p>
              </div>
            </div>

            {qualityFeedback && (
              <div className={cn('rounded-xl border px-3 py-2 text-xs font-medium', qualityToneClass)}>
                {qualityFeedback.text}
              </div>
            )}

            <div className={cn(mutedCardClass, 'mt-auto')}>
              <div className="flex items-center gap-2 mb-2">
                <Clock3 size={14} className={iconClass} />
                <p className={sectionTitleClass}>操作提示</p>
              </div>
              <ul className={cn('space-y-1 text-xs', COLORS.neutral.light.textMuted)}>
                <li>保持受测关节完整出现在镜头中。</li>
                <li>动作到最大活动范围后短暂停留。</li>
                <li>如角度波动明显，建议重测一次。</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};
