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
import { ROM_TEXTS } from '../constants/uiText';
import { PageTitleSection, UnifiedStatusBadge } from '@/components/layout';

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
  onResults: (results: any, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  startROMAssessment: () => void;
  stopROMAssessment: () => void;
  resetROMAssessment: () => void;
  setIsCameraOn: (enabled: boolean) => void;
  toggleFullscreen: () => void;
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

  const selectedSideLabel = selectedSide === 'left' ? '左侧' : '右侧';
  const selectedJointLabel = ROM_TEXTS.joints[selectedJoint];
  const selectedDirectionLabel = ROM_TEXTS.directions[selectedDirection];
  const captureProgress = isMeasuring ? Math.min(100, sampleCount * 2) : hasMeasuredData ? 100 : 0;

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
              <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{status.message}</p>
                  <p className="text-xs text-slate-500 mt-1">实时采样 {sampleCount} 帧 · 持续 {durationSec.toFixed(1)} 秒</p>
                </div>
                <UnifiedStatusBadge status={status.badge} text={status.text} />
              </div>
            </div>

            <div className="absolute left-6 right-6 bottom-6">
              <div className="rounded-xl border border-slate-200 bg-white/95 p-3 flex flex-wrap items-center gap-2 justify-center">
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
                  <button onClick={startROMAssessment} className="btn-primary" title="开始测量">
                    <Play size={14} />
                    开始测量
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
            <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-slate-600" />
                <p className="text-sm font-semibold text-slate-900">当前测量目标</p>
              </div>
              <p className="text-sm text-slate-700">{selectedJointLabel} · {selectedDirectionLabel} · {selectedSideLabel}</p>
              <p className="text-xs text-slate-500 mt-1">建议动作稳定保持 3-5 秒，避免快速摆动。</p>
            </div>

            <div className="rounded-20 border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-slate-600" />
                <p className="text-sm font-semibold text-slate-900">测量进度</p>
              </div>
              <div
                className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={captureProgress}
              >
                <div className={cn('h-full transition-all', isMeasuring ? 'bg-blue-600' : hasMeasuredData ? 'bg-emerald-600' : 'bg-slate-300')} style={{ width: `${captureProgress}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{isMeasuring ? '采集中' : hasMeasuredData ? '已完成' : '待开始'}</span>
                <span>{captureProgress}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">当前角度</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">{formatAngle(currentMeasurement?.currentAngle ?? 0)}°</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">采样时长</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">{durationSec.toFixed(1)}s</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">最大角度</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">{formatAngle(currentMeasurement?.maxAngle ?? 0)}°</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">最小角度</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">{formatAngle(currentMeasurement?.minAngle ?? 0)}°</p>
              </div>
            </div>

            <div className="rounded-20 border border-slate-200 bg-slate-50 p-4 mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <Clock3 size={14} className="text-slate-600" />
                <p className="text-sm font-semibold text-slate-900">操作提示</p>
              </div>
              <ul className="text-xs text-slate-600 space-y-1">
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
