import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Loader2, AlertCircle } from 'lucide-react';

interface MarkdownReportProps {
  content: string | null;
  loading?: boolean;
  className?: string;
  animate?: boolean;
}

export const MarkdownReport: React.FC<MarkdownReportProps> = ({ 
  content, 
  loading = false, 
  className = "",
  animate = true 
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const normalizedContent = typeof content === 'string' ? content.trim() : '';
  
  // Typewriter effect for a more "AI-generating" feel
  useEffect(() => {
    if (!normalizedContent) {
      setDisplayedContent('');
      return;
    }

    if (!animate) {
      setDisplayedContent(normalizedContent);
      return;
    }

    // Simple character-by-character animation
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < normalizedContent.length) {
        setDisplayedContent(normalizedContent.substring(0, currentIdx + 1));
        currentIdx += 10; // Speed up by adding 10 chars at a time
      } else {
        clearInterval(interval);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [normalizedContent, animate]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 min-h-[300px] bg-slate-900/50 rounded-2xl border border-slate-800 animate-pulse ${className}`}>
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">AI 专家正在深度分析视角数据...</p>
        <p className="text-slate-500 text-sm mt-2">预计需要 5-10 秒</p>
      </div>
    );
  }

  if (!normalizedContent) {
    return (
      <div className={`flex flex-col items-center justify-center p-12 min-h-[300px] bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed ${className}`}>
        <FileText className="w-12 h-12 text-slate-700 mb-4" />
        <p className="text-slate-500 font-medium">完成评估后，报告将在此生成</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold">AI 康复评估报告</h3>
            <p className="text-xs text-slate-500">基于多视角生物力学分析</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Analysis Ready</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="max-w-none text-slate-300 leading-relaxed">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({...props}) => <h1 className="text-2xl font-bold text-white mt-8 mb-4 border-b border-slate-700 pb-2" {...props} />,
              h2: ({...props}) => <h2 className="text-xl font-bold text-white mt-6 mb-3" {...props} />,
              h3: ({...props}) => <h3 className="text-lg font-bold text-white mt-5 mb-2 text-blue-300" {...props} />,
              p: ({...props}) => <p className="mb-4 text-slate-200 leading-relaxed" {...props} />,
              ul: ({...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
              ol: ({...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
              li: ({...props}) => <li className="text-slate-200" {...props} />,
              blockquote: ({...props}) => (
                <blockquote className="border-l-4 border-blue-400 bg-blue-500/10 py-3 px-4 rounded-r-lg italic my-4 text-slate-300" {...props} />
              ),
              table: ({...props}) => (
                <div className="overflow-x-auto my-6">
                  <table className="w-full border-collapse text-sm" {...props} />
                </div>
              ),
              th: ({...props}) => <th className="bg-slate-800 text-slate-100 px-4 py-2 text-left border border-slate-700 font-bold" {...props} />,
              td: ({...props}) => <td className="px-4 py-2 border border-slate-800 text-slate-300" {...props} />,
              strong: ({...props}) => <strong className="text-blue-300 font-semibold" {...props} />,
              code: ({...props}) => <code className="text-blue-200 bg-slate-800 px-1.5 py-0.5 rounded font-mono text-sm" {...props} />,
              hr: ({...props}) => <hr className="my-8 border-slate-700" {...props} />,
            }}
          >
            {displayedContent}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 italic">
        <AlertCircle className="w-3 h-3" />
        报告由 Rehab-AI 生成，结果仅供参考，不作为最终医疗诊断。
      </div>
    </div>
  );
};
