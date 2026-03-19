import React from 'react';
import { RotateCcw, BrainCircuit, Activity, ChevronDown, ArrowUpRight } from 'lucide-react';
import { MarkdownReport } from './MarkdownReport';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/uiStyles';

interface PostureReportViewerProps {
  auxiliaryDiagnosis?: string | null;
  markdownReport?: string | null;
  reportType?: 'auxiliary' | 'deep';
  setReportType?: (type: 'auxiliary' | 'deep') => void;
  isAnalyzing?: boolean;
  onReset?: () => void;
  title?: string;
  subtitle?: string;
  showToggle?: boolean;
  isFullscreen?: boolean;
  setIsFullscreen?: (value: boolean) => void;
  onClose?: () => void;
  className?: string;
  inline?: boolean;
}

const segmentedButtonBaseClass =
  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all';

export const PostureReportViewer: React.FC<PostureReportViewerProps> = ({
  auxiliaryDiagnosis,
  markdownReport,
  reportType = 'deep',
  setReportType,
  isAnalyzing = false,
  onReset,
  title = '体态评估报告',
  subtitle = 'AI POWERED ANALYSIS',
  showToggle = true,
  isFullscreen = false,
  setIsFullscreen,
  onClose,
  className,
  inline = false,
}) => {
  const currentContent = reportType === 'deep' ? markdownReport : auxiliaryDiagnosis;
  const hasBothReports = Boolean(auxiliaryDiagnosis && markdownReport);
  const canToggle = showToggle && hasBothReports && Boolean(setReportType);

  const renderToggle = () => {
    if (!canToggle || !setReportType) return null;

    return (
      <div className="segmented-control rounded-xl">
        <button
          onClick={() => setReportType('auxiliary')}
          className={cn(
            segmentedButtonBaseClass,
            reportType === 'auxiliary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600',
          )}
        >
          基础报告
        </button>
        <button
          onClick={() => setReportType('deep')}
          className={cn(
            segmentedButtonBaseClass,
            reportType === 'deep' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600',
          )}
        >
          深度报告
        </button>
      </div>
    );
  };

  const header = (
    <div
      className={cn(
        'flex items-center justify-between',
        inline ? 'mb-6' : 'sticky top-0 z-10 border-b border-slate-100 bg-white/80 p-6 backdrop-blur-md',
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-2xl',
            reportType === 'deep' ? 'bg-violet-50 text-violet-500' : 'bg-blue-50 text-blue-500',
          )}
        >
          {reportType === 'deep' ? <BrainCircuit size={20} /> : <Activity size={20} />}
        </div>
        <div>
          <h3 className={cn('font-black uppercase tracking-tight', COLORS.neutral.light.text)}>{title}</h3>
          <p className={cn('text-[10px] font-bold uppercase tracking-widest', COLORS.neutral.light.textLight)}>{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {renderToggle()}
        {!inline && onClose ? (
          <div className="flex items-center gap-2">
            {setIsFullscreen ? (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={cn(
                  'hidden rounded-2xl p-3 transition-all md:block',
                  COLORS.neutral.light.textLight,
                  COLORS.neutral.light.hover,
                  COLORS.neutral.light.hoverText,
                )}
                title={isFullscreen ? '退出全屏' : '全屏预览'}
              >
                <ArrowUpRight size={20} className={isFullscreen ? 'rotate-180' : ''} />
              </button>
            ) : null}
            <button
              onClick={onClose}
              className={cn(
                'rounded-2xl p-3 transition-all',
                COLORS.neutral.light.textLight,
                COLORS.neutral.light.hover,
                COLORS.neutral.light.hoverText,
              )}
            >
              <ChevronDown size={20} className="rotate-180" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  const body = (
    <MarkdownReport
      content={currentContent ?? null}
      loading={isAnalyzing && !currentContent}
      animate={!inline}
      showChrome={false}
      title={title}
      subtitle={subtitle}
      emptyTitle="暂无报告"
      emptyDescription="完成体态采集后，系统会在这里展示结构化报告。"
      className={cn('border-none bg-transparent', inline ? 'h-full rounded-none' : 'h-full rounded-none')}
      tone={reportType === 'deep' ? 'violet' : 'blue'}
    />
  );

  if (inline) {
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
        {header}
        <div className="flex flex-1 flex-col overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-slate-50/80">
          {body}
        </div>
        {onReset ? (
          <div className="mt-6 flex gap-4">
            <button
              onClick={onReset}
              className={cn(
                'flex flex-1 items-center justify-center gap-3 rounded-2xl border py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                COLORS.neutral.light.border,
                COLORS.neutral.light.bg,
                COLORS.neutral.light.text,
                COLORS.neutral.light.hover,
              )}
            >
              <RotateCcw size={16} />
              重新评估
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-500 ease-in-out',
        isFullscreen ? 'h-full w-full rounded-none' : 'h-[90vh] w-full max-w-5xl rounded-[2.5rem] animate-in zoom-in-95 duration-300',
        className,
      )}
    >
      {header}
      <div className="flex-1 overflow-y-auto bg-slate-900 p-0">{body}</div>
    </div>
  );
};

export default PostureReportViewer;
