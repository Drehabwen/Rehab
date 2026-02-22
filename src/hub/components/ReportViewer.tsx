import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Activity, ArrowUpRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PostureReport } from '@/store/useMeasurementStore';
import { ReportChart } from './ReportChart';

interface ReportViewerProps {
  reportHtml: string;
  report: PostureReport;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onClose: () => void;
  reportContainerRef: React.RefObject<HTMLDivElement>;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  reportHtml,
  report,
  isFullscreen,
  onToggleFullscreen,
  onClose,
  reportContainerRef
}) => {
  const [chartPortals, setChartPortals] = useState<React.ReactPortal[]>([]);

  useEffect(() => {
    if (reportHtml && reportContainerRef.current && report) {
      const scripts = reportContainerRef.current.getElementsByTagName('script');
      Array.from(scripts).forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });

      const placeholders = reportContainerRef.current.querySelectorAll('.rehab-chart');
      const newPortals: React.ReactPortal[] = [];

      placeholders.forEach((el, idx) => {
        const type = el.getAttribute('data-type') as 'sway' | 'angle' | 'velocity';
        const title = el.getAttribute('data-title') || '';
        const metricKey = el.getAttribute('data-key') || '';
        const unit = el.getAttribute('data-unit') || '';
        const color = el.getAttribute('data-color') || '#3b82f6';

        if (report.timeSeries) {
          const chartData = report.timeSeries.map(point => ({
            timestamp: point.timestamp,
            value: point[metricKey as keyof typeof point] as number
          }));

          const portal = ReactDOM.createPortal(
            <ReportChart
              key={`chart-${idx}`}
              type={type}
              data={chartData}
              title={title}
              metricKey={metricKey}
              unit={unit}
              color={color}
            />,
            el as Element
          );
          newPortals.push(portal);
        }
      });
      setChartPortals(newPortals);
    } else {
      setChartPortals([]);
    }
  }, [reportHtml, report, reportContainerRef]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ease-in-out",
        isFullscreen 
          ? "w-full h-full rounded-none" 
          : "w-full max-w-5xl h-[90vh] rounded-[2.5rem] animate-in zoom-in-95 duration-300"
      )}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight">体态深度评估报告</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nexus Hub AI Powered Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onToggleFullscreen}
              className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all hidden md:block"
              title={isFullscreen ? "退出全屏" : "全屏预览"}
            >
              <ArrowUpRight size={20} className={isFullscreen ? "rotate-180" : ""} />
            </button>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
            >
              <ChevronDown size={20} className="rotate-180" />
            </button>
          </div>
        </div>
        <div ref={reportContainerRef} className="flex-1 overflow-y-auto p-8" dangerouslySetInnerHTML={{ __html: reportHtml }} />
        {chartPortals}
      </div>
    </div>
  );
};
