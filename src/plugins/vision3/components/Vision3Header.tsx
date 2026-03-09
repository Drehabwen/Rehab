import React from 'react';
import { RotateCcw, Settings2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewType = 'front' | 'side' | 'back';

interface Vision3HeaderProps {
  isEntryMode: boolean;
  setIsEntryMode: (mode: boolean) => void;
  view: ViewType;
  setView: (view: ViewType) => void;
}

const viewLabels: Record<ViewType, string> = {
  front: '\u6b63\u9762',
  side: '\u4fa7\u9762',
  back: '\u80cc\u9762',
};

export const Vision3Header: React.FC<Vision3HeaderProps> = ({
  isEntryMode,
  setIsEntryMode,
  view,
  setView,
}) => {
  return (
    <div className="bento-card p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
          <Camera size={18} />
        </div>
        <div>
          <div className="text-base font-semibold text-slate-900">{'\u4f53\u6001\u5206\u6790'}</div>
          <div className="text-xs text-slate-500">
            {isEntryMode ? '\u8bf7\u9009\u62e9\u8bc4\u4f30\u6a21\u5f0f' : '\u6267\u884c\u8bc4\u4f30\u5e76\u67e5\u770b\u7ed3\u679c'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 px-3 rounded-xl border border-blue-100 bg-blue-50 text-sm font-semibold text-blue-700 flex items-center">
          Posture AI
        </div>

        {!isEntryMode ? (
          <>
            <div className="flex items-center p-1 rounded-xl border border-slate-300 bg-white">
              {(Object.keys(viewLabels) as ViewType[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setView(item)}
                  className={cn('h-8 px-3 rounded-lg text-sm', view === item ? 'bg-slate-100 text-slate-900' : 'text-slate-600')}
                >
                  {viewLabels[item]}
                </button>
              ))}
            </div>

            <button onClick={() => setIsEntryMode(true)} className="btn-secondary">
              <RotateCcw size={14} />
              {'\u8fd4\u56de\u6a21\u5f0f\u9009\u62e9'}
            </button>
          </>
        ) : null}

        <button className="btn-icon" aria-label="settings">
          <Settings2 size={16} />
        </button>
      </div>
    </div>
  );
};
