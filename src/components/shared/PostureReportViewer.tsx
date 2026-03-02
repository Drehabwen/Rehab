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

  // 报告类型切换按钮
  const ReportTypeToggle = () => {
    if (!showToggle || !hasBothReports || !setReportType) return null;
    
    return (
      <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
        <button
          onClick={() => setReportType('auxiliary')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
            reportType === 'auxiliary' 
              ? "bg-white text-blue-600 shadow-sm" 
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          基础报告
        </button>
        <button
          onClick={() => setReportType('deep')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
            reportType === 'deep' 
              ? "bg-white text-purple-600 shadow-sm" 
              : "text-slate-400 hover:text-slate-600"
          )}
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
      inline ? "mb-6" : "p-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "rounded-2xl flex items-center justify-center",
          reportType === 'deep' 
            ? "w-10 h-10 bg-purple-50 text-purple-500" 
            : "w-10 h-10 bg-blue-50 text-blue-500"
        )}>
          {reportType === 'deep' ? <BrainCircuit size={20} /> : <Activity size={20} />}
        </div>
        <div>
          <h3 className="font-black text-slate-900 uppercase tracking-tight">{title}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <ReportTypeToggle />
        
        {!inline && onClose && (
          <div className="flex items-center gap-2">
            {setIsFullscreen && (
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all hidden md:block"
                title={isFullscreen ? "退出全屏" : "全屏预览"}
              >
                <ArrowUpRight size={20} className={isFullscreen ? "rotate-180" : ""} />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
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
        inline ? "p-8 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200" : "h-full"
      )}>
        <div className="w-20 h-20 rounded-3xl bg-antey-primary/10 flex items-center justify-center mb-6 animate-pulse">
          <BrainCircuit className="text-antey-primary" size={40} />
        </div>
        <h4 className="text-lg font-black text-slate-900 uppercase tracking-[0.2em] mb-3">
          正在生成报告
        </h4>
        <p className="text-[11px] text-slate-400 font-bold max-w-[240px] leading-relaxed">
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
        inline ? "p-8 bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200" : "h-full"
      )}>
        <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
          <Activity className="text-slate-400" size={40} />
        </div>
        <h4 className="text-lg font-black text-slate-900 uppercase tracking-[0.2em] mb-3">
          暂无报告
        </h4>
        <p className="text-[11px] text-slate-400 font-bold max-w-[240px] leading-relaxed">
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
        
        <div className="flex-1 bg-slate-50/80 rounded-[2.5rem] border border-slate-200/60 overflow-hidden flex flex-col">
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
              className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-50 transition-all border border-slate-200 flex items-center justify-center gap-3"
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
      "relative bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ease-in-out",
      isFullscreen 
        ? "w-full h-full rounded-none" 
        : "w-full max-w-5xl h-[90vh] rounded-[2.5rem] animate-in zoom-in-95 duration-300",
      className
    )}>
      <Header />
      
      <div className="flex-1 overflow-y-auto p-0 bg-slate-900">
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
