import React from 'react';
import { 
  RotateCcw, 
  Share2, 
  Download,
  CheckCircle,
  BrainCircuit,
  Activity,
  ChevronDown,
  ArrowUpRight
} from 'lucide-react';
import { MarkdownReport } from './MarkdownReport';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/uiStyles';

interface PostureReportViewerProps {
  /** 基础报告 - 根据规则得出的结论 */
  auxiliaryDiagnosis?: string | null;
  /** 深度报告 - LLM解析的报告 */
  markdownReport?: string | null;
  /** 当前报告类型 */
  reportType?: 'auxiliary' | 'deep';
  /** 设置报告类型 */
  setReportType?: (type: 'auxiliary' | 'deep') => void;
  /** 是否正在分析中 */
  isAnalyzing?: boolean;
  /** 重置回调 */
  onReset?: () => void;
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 是否显示切换按钮 */
  showToggle?: boolean;
  /** 是否全屏 */
  isFullscreen?: boolean;
  /** 设置全屏 */
  setIsFullscreen?: (value: boolean) => void;
  /** 关闭回调 */
  onClose?: () => void;
  /** 额外的类名 */
  className?: string;
  /** 是否内嵌模式（非弹窗） */
  inline?: boolean;
}

/**
 * 体态报告查看器 - 共享组件
 * 
 * 统一显示基础报告（规则结论）和深度报告（LLM解析）
 * 支持弹窗模式和内嵌模式
 */
export const PostureReportViewer: React.FC<PostureReportViewerProps> = ({
  auxiliaryDiagnosis,
  markdownReport,
  reportType = 'deep',
  setReportType,
  isAnalyzing = false,
  onReset,
  title = '体态深度评估报告',
  subtitle = 'NEXUS HUB AI POWERED ANALYSIS',
  showToggle = true,
  isFullscreen = false,
  setIsFullscreen,
  onClose,
  className,
  inline = false
}) => {
  // 确定当前要显示的内容
  const currentContent = reportType === 'deep' ? markdownReport : auxiliaryDiagnosis;
  const hasBothReports = !!auxiliaryDiagnosis && !!markdownReport;
  const isLoading = isAnalyzing && !currentContent;
  const toggleButtonBaseClass = 'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all';
  const toggleContainerClass = 'segmented-control rounded-xl';
  const toggleButtonClass = (active: boolean, tone: 'blue' | 'violet') =>
    cn(
      toggleButtonBaseClass,
      active ? `bg-white shadow-sm ${tone === 'blue' ? 'text-blue-600' : 'text-purple-600'}` : 'text-slate-400 hover:text-slate-600',
    );
  const headerShellClass = 'p-6 sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur-md';
  const headerIconClass = (tone: 'deep' | 'auxiliary') =>
    cn('w-10 h-10 rounded-2xl flex items-center justify-center', tone === 'deep' ? 'bg-purple-50 text-purple-500' : 'bg-blue-50 text-blue-500');
  const headerTitleClass = cn('font-black uppercase tracking-tight', COLORS.neutral.light.text);
  const headerSubtitleClass = cn('text-[10px] font-bold uppercase tracking-widest', COLORS.neutral.light.textLight);
  const chromeButtonClass = cn('p-3 rounded-2xl transition-all', COLORS.neutral.light.textLight, COLORS.neutral.light.hover, COLORS.neutral.light.hoverText);
  const emptyStateShellClass = 'p-8 rounded-[3rem] border border-dashed border-slate-200 bg-slate-50/50';
  const emptyStateTitleClass = cn('mb-3 text-lg font-black uppercase tracking-[0.2em]', COLORS.neutral.light.text);
  const emptyStateBodyClass = cn('max-w-[240px] text-[11px] font-bold leading-relaxed', COLORS.neutral.light.textLight);
  const emptyStateIconShellClass = cn('mb-6 flex h-20 w-20 items-center justify-center rounded-3xl', COLORS.neutral.light.selected);
  const inlineReportShellClass = 'flex-1 overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-slate-50/80 flex flex-col';
  const resetButtonClass = cn('flex-1 flex items-center justify-center gap-3 rounded-2xl border py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all', COLORS.neutral.light.border, COLORS.neutral.light.bg, COLORS.neutral.light.text, COLORS.neutral.light.hover);
  const modalShellClass = 'relative flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-500 ease-in-out';
  const modalBodyClass = 'flex-1 overflow-y-auto bg-slate-900 p-0';

  // 报告类型切换按钮
  const ReportTypeToggle = () => {
    if (!showToggle || !hasBothReports || !setReportType) return null;
    
    return (
      <div className={toggleContainerClass}>
        <button
          onClick={() => setReportType('auxiliary')}
          className={toggleButtonClass(reportType === 'auxiliary', 'blue')}
        >
          基础报告
        </button>
        <button
          onClick={() => setReportType('deep')}
          className={toggleButtonClass(reportType === 'deep', 'violet')}
        >
          深度报告
        </button>
      </div>
    );
  };

  // 头部组件
  const Header = () => (
    <div className={cn(
      "flex items-center justify-between",
      inline ? "mb-6" : headerShellClass
    )}>
      <div className="flex items-center gap-4">
        <div className={headerIconClass(reportType === 'deep' ? 'deep' : 'auxiliary')}>
          {reportType === 'deep' ? <BrainCircuit size={20} /> : <Activity size={20} />}
        </div>
        <div>
          <h3 className={headerTitleClass}>{title}</h3>
          <p className={headerSubtitleClass}>{subtitle}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <ReportTypeToggle />
        
        {!inline && onClose && (
          <div className="flex items-center gap-2">
            {setIsFullscreen && (
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={cn(chromeButtonClass, 'hidden md:block')}
                title={isFullscreen ? "退出全屏" : "全屏预览"}
              >
                <ArrowUpRight size={20} className={isFullscreen ? "rotate-180" : ""} />
              </button>
            )}
            <button 
              onClick={onClose}
              className={chromeButtonClass}
            >
              <ChevronDown size={20} className="rotate-180" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // 加载状态
  if (isLoading) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center text-center",
        inline ? emptyStateShellClass : "h-full"
      )}>
        <div className="w-20 h-20 rounded-3xl bg-antey-primary/10 flex items-center justify-center mb-6 animate-pulse">
          <BrainCircuit className="text-antey-primary" size={40} />
        </div>
        <h4 className={emptyStateTitleClass}>
          正在生成报告
        </h4>
        <p className={emptyStateBodyClass}>
          AI 正在分析您的体态数据，请稍候...
        </p>
        <div className="mt-8 flex gap-2">
          {[0, 1, 2].map(i => (
            <div 
              key={i} 
              className="w-2 h-2 rounded-full bg-antey-primary/30 animate-bounce" 
              style={{ animationDelay: `${i * 0.2}s` }} 
            />
          ))}
        </div>
      </div>
    );
  }

  // 无内容状态
  if (!currentContent) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center text-center",
        inline ? emptyStateShellClass : "h-full"
      )}>
        <div className={emptyStateIconShellClass}>
          <Activity className={COLORS.neutral.light.textLight} size={40} />
        </div>
        <h4 className={emptyStateTitleClass}>
          暂无报告
        </h4>
        <p className={emptyStateBodyClass}>
          完成体态评估后，报告将在此显示
        </p>
      </div>
    );
  }

  // 内嵌模式
  if (inline) {
    return (
      <div className={cn("flex-1 flex flex-col min-h-0", className)}>
        <Header />
        
        <div className={inlineReportShellClass}>
          <MarkdownReport 
            content={currentContent} 
            animate={true} 
            className="border-none rounded-none h-full bg-transparent" 
          />
        </div>

        {onReset && (
          <div className="mt-6 flex gap-4">
            <button 
              onClick={onReset}
              className={resetButtonClass}
            >
              <RotateCcw size={16} />
              重新评估
            </button>
          </div>
        )}
      </div>
    );
  }

  // 弹窗模式
  return (
    <div className={cn(
      modalShellClass,
      isFullscreen 
        ? "w-full h-full rounded-none" 
        : "w-full max-w-5xl h-[90vh] rounded-[2.5rem] animate-in zoom-in-95 duration-300",
      className
    )}>
      <Header />
      
      <div className={modalBodyClass}>
        <MarkdownReport 
          content={currentContent} 
          animate={false} 
          className="border-none rounded-none h-full" 
        />
      </div>
    </div>
  );
};

export default PostureReportViewer;
