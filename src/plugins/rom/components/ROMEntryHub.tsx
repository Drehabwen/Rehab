import React, { useMemo, useState } from 'react';
import { ArrowRight, Clock3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JointType, MovementDirection } from '../types';
import { getROMDirectionLabel, getROMSideLabel, ROM_TEXTS } from '../constants/uiText';
import { PageTitleSection, UnifiedStatusBadge } from '@/components/layout';

interface ROMEntryHubProps {
  onStartAssessment: (joint: JointType, direction: MovementDirection, side: 'left' | 'right') => void;
}

const jointLabels: Record<JointType, string> = ROM_TEXTS.joints;

const defaultDirectionsByJoint: Record<JointType, MovementDirection[]> = {
  shoulder: ['flexion', 'extension', 'abduction', 'external_rotation'],
  elbow: ['flexion', 'extension', 'internal_rotation', 'external_rotation'],
  wrist: ['flexion', 'extension', 'abduction', 'adduction'],
  hip: ['flexion', 'extension', 'abduction', 'internal_rotation'],
  knee: ['flexion', 'extension', 'abduction', 'adduction'],
  ankle: ['flexion', 'extension', 'abduction', 'adduction'],
  cervical: ['flexion', 'extension', 'internal_rotation', 'external_rotation'],
};

const durationByDirection: Record<MovementDirection, string> = {
  flexion: '30-40 秒',
  extension: '30-40 秒',
  abduction: '35-45 秒',
  adduction: '35-45 秒',
  internal_rotation: '40-50 秒',
  external_rotation: '40-50 秒',
};

export const ROMEntryHub: React.FC<ROMEntryHubProps> = ({ onStartAssessment }) => {
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  const joints: JointType[] = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle', 'cervical'];

  const summaryText = useMemo(
    () => (selectedSide === 'left' ? '当前将执行左侧关节筛查' : '当前将执行右侧关节筛查'),
    [selectedSide],
  );

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner">
        <PageTitleSection
          title={ROM_TEXTS.title}
          description="先选择关节和动作，再发起单项活动度测量。每次发起都会生成一条新的筛查记录。"
          right={
            <div className="flex items-center gap-2">
              <UnifiedStatusBadge status="processing" text={summaryText} className="hidden xl:inline-flex" />
              <div className="segmented-control">
                <button
                  onClick={() => setSelectedSide('left')}
                  className={cn('segmented-control-tab', selectedSide === 'left' ? 'segmented-control-tab-solid' : 'segmented-control-tab-inactive')}
                >
                  左侧
                </button>
                <button
                  onClick={() => setSelectedSide('right')}
                  className={cn('segmented-control-tab', selectedSide === 'right' ? 'segmented-control-tab-solid' : 'segmented-control-tab-inactive')}
                >
                  右侧
                </button>
              </div>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="bento-card p-4">
            <div className="mb-1 flex items-center gap-2 text-slate-900">
              <Sparkles size={14} className="text-emerald-600" />
              <span className="text-sm font-semibold">筛查建议</span>
            </div>
            <p className="text-xs text-slate-600">优先检查肩关节与髋关节，便于快速发现代偿模式和左右差异。</p>
          </div>
          <div className="bento-card p-4">
            <div className="mb-1 flex items-center gap-2 text-slate-900">
              <Clock3 size={14} className="text-blue-600" />
              <span className="text-sm font-semibold">单项耗时</span>
            </div>
            <p className="text-xs text-slate-600">单个动作通常需要 30 到 50 秒，动作越稳定，结果越可用。</p>
          </div>
          <div className="bento-card p-4">
            <div className="mb-1 flex items-center gap-2 text-slate-900">
              <ArrowRight size={14} className="text-cyan-600" />
              <span className="text-sm font-semibold">结果去向</span>
            </div>
            <p className="text-xs text-slate-600">完成测量后可直接查看结果，并导出到报告归档用于复测对比。</p>
          </div>
        </section>

        <section className="bento-card overflow-hidden p-0">
          <div className="grid grid-cols-[1.2fr_2.2fr_0.8fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <span>关节</span>
            <span>动作</span>
            <span>预计时长</span>
            <span className="text-right">开始</span>
          </div>

          <div className="divide-y divide-slate-200">
            {joints.map((joint) => {
              const directions = defaultDirectionsByJoint[joint];
              const defaultDirection = directions[0];

              return (
                <div key={joint} className="grid grid-cols-[1.2fr_2.2fr_0.8fr_1fr] items-center gap-3 px-4 py-3 hover:bg-slate-50/80">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{jointLabels[joint]}</p>
                    <p className="mt-1 text-xs text-slate-500">{getROMSideLabel(joint, selectedSide)}测量</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {directions.map((direction) => (
                      <button
                        key={`${joint}-${direction}`}
                        onClick={() => onStartAssessment(joint, direction, selectedSide)}
                        className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        {getROMDirectionLabel(joint, direction)}
                      </button>
                    ))}
                  </div>

                  <div className="text-sm text-slate-600">{durationByDirection[defaultDirection]}</div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => onStartAssessment(joint, defaultDirection, selectedSide)}
                      className="btn-primary h-8 px-3 text-xs"
                    >
                      发起
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
