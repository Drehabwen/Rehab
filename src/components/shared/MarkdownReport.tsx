import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import { COLORS } from '@/constants/uiStyles';

interface MarkdownReportProps {
  content: string | null;
  loading?: boolean;
  className?: string;
  animate?: boolean;
  showChrome?: boolean;
  title?: string;
  subtitle?: string;
  footerNote?: string;
  tone?: 'blue' | 'cyan' | 'violet';
  emptyTitle?: string;
  emptyDescription?: string;
}

const toneClassMap = {
  blue: {
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-600',
    strong: 'text-blue-700',
    quote: 'border-blue-500 bg-blue-50 text-slate-700',
    dot: 'bg-emerald-500',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10',
    iconText: 'text-cyan-600',
    strong: 'text-cyan-700',
    quote: 'border-cyan-500 bg-cyan-50 text-slate-700',
    dot: 'bg-cyan-500',
  },
  violet: {
    iconBg: 'bg-violet-500/10',
    iconText: 'text-violet-600',
    strong: 'text-violet-700',
    quote: 'border-violet-500 bg-violet-50 text-slate-700',
    dot: 'bg-violet-500',
  },
} as const;

const mojibakeTokens = [
  '\u951F',
  '\u93C2',
  '\u9369',
  '\u93B6',
  '\u7487',
  '\u7039',
  '\u7F01',
  '\u9357',
  '\u95B2',
  '\u9350',
  '\u935A',
  '\u93B5',
  '\u59F9\u56E8\u20AC',
  '\u5BEE\u509A\u7236',
  '\uFFFD',
];
const mojibakePattern = new RegExp(mojibakeTokens.join('|'), 'u');
const suspiciousPhoneticPattern = /[\u3100-\u312F]/u;
const viewLabelMap = {
  front: '正面',
  side: '侧面',
  back: '背面',
} as const;

const normalizeMarkdownLine = (line: string) => {
  const withoutControlChars = line.replace(/[\uFEFF\u200B-\u200D\u2060]/g, '').trimEnd();
  const withHeadingSpace = withoutControlChars.replace(/^(#{1,6})([^\s#].*)$/, '$1 $2');

  return withHeadingSpace
    .replace(/^(#{1,6})\s*(front|side|back)\b.*$/i, (_, hashes: string, view: keyof typeof viewLabelMap) => `${hashes} ${viewLabelMap[view]}评估`)
    .replace(/^评估视角[:：]\s*(front|side|back)\b.*$/i, (_, view: keyof typeof viewLabelMap) => `评估视角：${viewLabelMap[view]}`);
};

const shouldDropMarkdownLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return mojibakePattern.test(trimmed) || suspiciousPhoneticPattern.test(trimmed);
};

export const sanitizeMarkdownContent = (content?: string | null) => {
  if (typeof content !== 'string') {
    return '';
  }

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const cleanedLines = normalized
    .split('\n')
    .map(normalizeMarkdownLine)
    .filter((line) => !shouldDropMarkdownLine(line));

  return cleanedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const sanitizeReadableText = (content?: string | null) =>
  sanitizeMarkdownContent(content).replace(/\n{2,}/g, '\n\n').trim();

export const MarkdownReport: React.FC<MarkdownReportProps> = ({
  content,
  loading = false,
  className = '',
  animate = true,
  showChrome = true,
  title = 'AI 康复评估报告',
  subtitle = '基于当前采集数据生成',
  footerNote = '报告由 Rehab-AI 生成，仅供临床参考。',
  tone = 'blue',
  emptyTitle = '暂无报告内容',
  emptyDescription = '完成评估后，报告会显示在这里。',
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const rawContent = typeof content === 'string' ? content.trim() : '';
  const normalizedContent = sanitizeMarkdownContent(content);
  const contentFiltered = Boolean(rawContent) && !normalizedContent;
  const toneClasses = toneClassMap[tone];

  useEffect(() => {
    if (!normalizedContent) {
      setDisplayedContent('');
      return;
    }

    if (!animate) {
      setDisplayedContent(normalizedContent);
      return;
    }

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < normalizedContent.length) {
        setDisplayedContent(normalizedContent.substring(0, currentIdx + 1));
        currentIdx += 10;
      } else {
        clearInterval(interval);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [normalizedContent, animate]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-10 min-h-[240px] rounded-2xl border border-slate-200 bg-slate-50 ${className}`}>
        <Loader2 className={`mb-4 h-9 w-9 animate-spin ${toneClasses.iconText}`} />
        <p className="text-sm font-semibold text-slate-900">{'\u6b63\u5728\u751f\u6210\u62a5\u544a'}</p>
        <p className="mt-2 text-center text-sm text-slate-500">{'\u7cfb\u7edf\u6b63\u5728\u6574\u7406\u5f53\u524d\u4f53\u6001\u6570\u636e\uff0c\u8bf7\u7a0d\u5019\u3002'}</p>
      </div>
    );
  }

  if (!normalizedContent) {
    return (
      <div className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center ${className}`}>
        <FileText className="mb-4 h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          {contentFiltered ? '报告内容存在异常字符，已自动过滤；请稍后查看清洗后的内容。' : emptyDescription}
        </p>
      </div>
    );
  }

  const contentBody = (
    <div className={showChrome ? 'flex-1 overflow-y-auto p-5 lg:p-6 custom-scrollbar' : 'p-5 lg:p-6'}>
      <div className={`max-w-none leading-relaxed ${COLORS.neutral.light.text}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ ...props }) => <h1 className="mb-4 mt-6 border-b border-slate-200 pb-2 text-2xl font-bold first:mt-0" {...props} />,
            h2: ({ ...props }) => <h2 className="mb-3 mt-6 text-xl font-bold first:mt-0" {...props} />,
            h3: ({ ...props }) => <h3 className={`mb-2 mt-5 text-lg font-bold first:mt-0 ${toneClasses.strong}`} {...props} />,
            p: ({ ...props }) => <p className="mb-4 leading-7 text-slate-700" {...props} />,
            ul: ({ ...props }) => <ul className="mb-4 list-disc space-y-1 pl-5 text-slate-700" {...props} />,
            ol: ({ ...props }) => <ol className="mb-4 list-decimal space-y-1 pl-5 text-slate-700" {...props} />,
            li: ({ ...props }) => <li className="leading-7" {...props} />,
            blockquote: ({ ...props }) => <blockquote className={`my-4 rounded-r-xl border-l-4 px-4 py-3 italic ${toneClasses.quote}`} {...props} />,
            table: ({ ...props }) => (
              <div className="my-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full border-collapse text-sm" {...props} />
              </div>
            ),
            th: ({ ...props }) => <th className="border border-slate-200 bg-slate-100 px-4 py-2 text-left font-semibold text-slate-800" {...props} />,
            td: ({ ...props }) => <td className="border border-slate-200 px-4 py-2 text-slate-700" {...props} />,
            strong: ({ ...props }) => <strong className={`font-semibold ${toneClasses.strong}`} {...props} />,
            code: ({ ...props }) => <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-800" {...props} />,
            hr: ({ ...props }) => <hr className="my-8 border-slate-200" {...props} />,
          }}
        >
          {displayedContent}
        </ReactMarkdown>
      </div>
    </div>
  );

  if (!showChrome) {
    return (
      <div className={`min-h-[220px] rounded-2xl border border-slate-200 bg-white ${className}`}>
        {contentBody}
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-3xl border ${COLORS.neutral.light.border} ${COLORS.neutral.light.bg} ${className}`}>
      <div className={`flex items-center justify-between border-b ${COLORS.neutral.light.borderSoft} ${COLORS.neutral.light.bgSoft} px-6 py-4`}>
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${toneClasses.iconBg}`}>
            <FileText className={`h-5 w-5 ${toneClasses.iconText}`} />
          </div>
          <div>
            <h3 className={`font-semibold ${COLORS.neutral.light.text}`}>{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${toneClasses.dot}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${COLORS.neutral.light.textMuted}`}>Report Ready</span>
        </div>
      </div>

      {contentBody}

      <div className={`flex items-center gap-2 border-t ${COLORS.neutral.light.borderSoft} ${COLORS.neutral.light.bgSoft} px-6 py-3 text-[11px] italic text-slate-500`}>
        <AlertCircle className="h-3 w-3" />
        {footerNote}
      </div>
    </div>
  );
};
