import React from 'react';
import { 
  RotateCcw, 
  Share2, 
  Download,
  CheckCircle,
  BrainCircuit
} from 'lucide-react';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import { REPORT_TEXTS, SYSTEM_TEXTS } from '../constants/uiText';

interface PostureReportProps {
  markdownReport?: string;
  onReset: () => void;
}

export const PostureReport: React.FC<PostureReportProps> = ({ markdownReport, onReset }) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4 duration-700">
      {!markdownReport ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
          <div className="w-20 h-20 rounded-3xl bg-antey-primary/10 flex items-center justify-center mb-6 animate-pulse">
            <BrainCircuit className="text-antey-primary" size={40} />
          </div>
          <h4 className="text-lg font-black text-slate-900 uppercase tracking-[0.2em] mb-3">{REPORT_TEXTS.generating}</h4>
          <p className="text-[11px] text-slate-400 font-bold max-w-[240px] leading-relaxed">
            {REPORT_TEXTS.generatingDescription}
          </p>
          <div className="mt-8 flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-antey-primary/30 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Report Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle className="text-emerald-500" size={20} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{REPORT_TEXTS.intelligentReport}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">AI Analysis Ready</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all">
                <Share2 size={16} />
              </button>
              <button className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all">
                <Download size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-50/80 rounded-[2.5rem] border border-slate-200/60 overflow-hidden flex flex-col">
            <MarkdownReport content={markdownReport} animate={true} className="border-none rounded-none h-full bg-transparent" />
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-4">
            <button 
              onClick={onReset}
              className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-50 transition-all border border-slate-200 flex items-center justify-center gap-3"
            >
              <RotateCcw size={16} />
              {SYSTEM_TEXTS.reevaluate}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
