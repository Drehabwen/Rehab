import React from 'react';
import { Loader2 } from 'lucide-react';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import { Vision3Dashboard } from './Vision3Dashboard';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';

interface Vision3AnalysisPanelProps {
  activePanel: 'dashboard' | 'report';
  setActivePanel: (panel: 'dashboard' | 'report') => void;
  reportType: 'auxiliary' | 'deep';
  setReportType: (type: 'auxiliary' | 'deep') => void;
  captureStatus: string;
  markdownReport: string | null;
  auxiliaryReport: string | null;
  activeTab: 'posture' | 'rom';
  result: { issues: PostureIssue[]; metrics: PostureMetrics } | null;
  showHeadAxes: boolean;
  setShowHeadAxes: (show: boolean) => void;
  axesScale: number;
  setAxesScale: (scale: number) => void;
  getShoulderStatus: (angle: number) => { text: string; color: string; bgColor: string };
  getHeadStatus: (angle: number) => { text: string; color: string; bgColor: string };
  getHipStatus: (angle: number) => { text: string; color: string; bgColor: string };
  getSeverityLabel: (severity: string) => string;
}

export const Vision3AnalysisPanel: React.FC<Vision3AnalysisPanelProps> = ({
  activePanel,
  setActivePanel,
  reportType,
  setReportType,
  captureStatus,
  markdownReport,
  auxiliaryReport,
  activeTab,
  result,
  showHeadAxes,
  setShowHeadAxes,
  axesScale,
  setAxesScale,
  getShoulderStatus,
  getHeadStatus,
  getHipStatus,
  getSeverityLabel
}) => {
  return (
    <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-4">
      {/* Panel Toggle Header */}
      <div className="flex p-1 bg-slate-900/60 rounded-xl border border-slate-800/50 backdrop-blur-sm self-start">
        <button
          onClick={() => setActivePanel('dashboard')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activePanel === 'dashboard' 
              ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${activePanel === 'dashboard' ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
          数据面板
        </button>
        <button
          onClick={() => setActivePanel('report')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activePanel === 'report' 
              ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${activePanel === 'report' ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
          AI 报告
          {captureStatus === 'analyzing' && <Loader2 className="w-3 h-3 animate-spin" />}
        </button>
      </div>

      {/* Analysis Action Buttons */}
      {captureStatus === 'completed' && (
        <div className="flex gap-2 p-1 bg-slate-900/40 rounded-xl border border-slate-800/30 backdrop-blur-sm mt-2">
          <button
            onClick={() => {
              setReportType('auxiliary');
              setActivePanel('report');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              reportType === 'auxiliary' && activePanel === 'report'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            辅助诊断
          </button>
          <button
            onClick={() => {
              setReportType('deep');
              setActivePanel('report');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              reportType === 'deep' && activePanel === 'report'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            深度分析
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden min-h-0 mt-4">
        {activePanel === 'report' ? (
          <div className="h-full animate-in fade-in slide-in-from-right-4 duration-500">
            <MarkdownReport 
              content={reportType === 'deep' ? markdownReport : auxiliaryReport} 
              loading={captureStatus === 'analyzing' && !(reportType === 'deep' ? markdownReport : auxiliaryReport)} 
            />
          </div>
        ) : (
          <div className="h-full animate-in fade-in slide-in-from-left-4 duration-500">
            <Vision3Dashboard 
              activeTab={activeTab}
              result={result}
              showHeadAxes={showHeadAxes}
              setShowHeadAxes={setShowHeadAxes}
              axesScale={axesScale}
              setAxesScale={setAxesScale}
              getShoulderStatus={getShoulderStatus}
              getHeadStatus={getHeadStatus}
              getHipStatus={getHipStatus}
              getSeverityLabel={getSeverityLabel}
            />
          </div>
        )}
      </div>
    </div>
  );
};
