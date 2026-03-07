import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JointType, MovementDirection } from '../types';
import { ROM_TEXTS } from '../constants/uiText';

interface ROMEntryHubProps {
  onStartAssessment: (joint: JointType, direction: MovementDirection, side: 'left' | 'right') => void;
}

export const ROMEntryHub: React.FC<ROMEntryHubProps> = ({ onStartAssessment }) => {
  const joints: JointType[] = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle', 'cervical'];
  const directions: MovementDirection[] = ['flexion', 'extension', 'abduction', 'adduction', 'internal_rotation', 'external_rotation'];
  
  return (
    <div className={cn('flex-1 flex flex-col p-8', 'animate-fade-in animate-zoom-in')}>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-4">{ROM_TEXTS.title}</h1>
        <p className="text-slate-400 text-lg">{ROM_TEXTS.description}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {joints.map((joint) => (
          <div 
            key={joint}
            className={cn('bg-white rounded-2xl shadow-lg p-6', 'hover:shadow-xl transition-all')}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-6">{ROM_TEXTS.joints[joint]}</h3>
            <div className="space-y-3">
              {directions.map((direction) => (
                <button
                  key={direction}
                  onClick={() => onStartAssessment(joint, direction, 'left')}
                  className={cn('w-full px-4 py-3 text-left rounded-xl', 'bg-slate-100 hover:bg-slate-200', 'transition-all')}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ROM_TEXTS.directions[direction]}</span>
                    <ArrowRight size={16} className="text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
