import React, { useMemo, useState } from 'react';
import { ArrowRight, Clock3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JointType, MovementDirection } from '../types';
import { PageTitleSection, UnifiedStatusBadge } from '@/components/layout';

interface ROMEntryHubProps {
  onStartAssessment: (joint: JointType, direction: MovementDirection, side: 'left' | 'right') => void;
}

const jointLabels: Partial<Record<JointType, string>> = {
  cervical: '颈椎',
  shoulder: '肩关节',
  elbow: '肘关节',
};

const directionLabels: Record<MovementDirection, string> = {
  flexion: '屈曲',
  extension: '伸展',
  abduction: '外展',
  adduction: '内收',
  internal_rotation: '内旋',
  external_rotation: '外旋',
};

const defaultDirectionsByJoint: Partial<Record<JointType, MovementDirection[]>> = {
  cervical: ['abduction', 'adduction', 'internal_rotation', 'external_rotation'],
  shoulder: ['flexion', 'abduction'],
  elbow: ['flexion'],
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
  const joints: JointType[] = ['cervical', 'shoulder', 'elbow'];

  const summaryText = useMemo(
    () => (selectedSide === 'left' ? '当前将执行左侧关节测量' : '当前将执行右侧关节测量'),
    [selectedSide],
  );

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner">
        <PageTitleSection
          title="关节活动度评估"
          description="先选侧别，再从动作列表开始测量。当前版本支持颈椎、肩关节、肘关节，其余关节需要特写镜头暂不支持。单项流程可在 2 秒内启动。"
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

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bento-card p-4">
            <div className="flex items-center gap-2 text-slate-900 mb-1">
              <Sparkles size={14} className="text-emerald-600" />
              <span className="text-sm font-semibold">流程建议</span>
            </div>
            <p className="text-xs text-slate-600">优先测量颈椎与肩关节，可快速识别代偿模式。保持动作稳定 3-5 秒。</p>
          </div>
          <div className="bento-card p-4">
            <div className="flex items-center gap-2 text-slate-900 mb-1">
              <Clock3 size={14} className="text-blue-600" />
              <span className="text-sm font-semibold">单项耗时</span>
            </div>
            <p className="text-xs text-slate-600">每个动作约 30-50 秒，动作越稳定结果越可靠。</p>
          </div>
          <div className="bento-card p-4">
            <div className="flex items-center gap-2 text-slate-900 mb-1">
              <ArrowRight size={14} className="text-cyan-600" />
              <span className="text-sm font-semibold">下一步</span>
            </div>
            <p className="text-xs text-slate-600">开始测量后可实时查看角度，并在结果页导出报告。</p>
          </div>
        </section>

        <section className="bento-card p-0 overflow-hidden">
          <div className="grid grid-cols-[1.2fr_2.2fr_0.8fr_1fr] gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
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
                <div key={joint} className="grid grid-cols-[1.2fr_2.2fr_0.8fr_1fr] gap-3 items-center px-4 py-3 hover:bg-slate-50/80">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{jointLabels[joint]}</p>
                    <p className="text-xs text-slate-500 mt-1">{selectedSide === 'left' ? '左侧' : '右侧'}测量</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {directions.map((direction) => (
                      <button
                        key={`${joint}-${direction}`}
                        onClick={() => onStartAssessment(joint, direction, selectedSide)}
                        className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-100"
                      >
                        {directionLabels[direction]}
                      </button>
                    ))}
                  </div>

                  <div className="text-sm text-slate-600">{durationByDirection[defaultDirection]}</div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => onStartAssessment(joint, defaultDirection, selectedSide)}
                      className="btn-primary h-8 px-3 text-xs"
                    >
                      开始
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
