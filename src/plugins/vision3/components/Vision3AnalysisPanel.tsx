import React from 'react';
import { Loader2, Zap, Layers } from 'lucide-react';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import { Vision3Dashboard } from './Vision3Dashboard';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { AssessmentType } from '../store/usePostureAssessmentStore';
import { ASSESSMENT_TEXTS, PANEL_TEXTS } from '../constants/uiText';
import { COLORS, SIZES, ANIMATIONS, TRANSITIONS } from '@/constants/uiStyles';

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
  assessmentType: AssessmentType;
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
  getSeverityLabel,
  assessmentType
}) => {
  return (
    <div className="h-full flex flex-col gap-4">
      {/* Assessment Type Badge */}
      <div className="flex items-center gap-2 self-start">
        {assessmentType === 'quick' ? (
          <div className={`flex items-center ${SIZES.gap.sm} ${SIZES.padding.md} ${COLORS.info.cyanBg} border ${COLORS.info.cyanBorder} ${SIZES.radius.sm}`}>
            <Zap size={14} className={COLORS.info.cyanText} />
            <span className={`text-xs font-bold ${COLORS.info.cyanText} uppercase tracking-wider`}>{ASSESSMENT_TEXTS.quick.label}</span>
          </div>
        ) : (
          <div className={`flex items-center ${SIZES.gap.sm} ${SIZES.padding.md} ${COLORS.success.emeraldBg} border ${COLORS.success.emeraldBorder} ${SIZES.radius.sm}`}>
            <Layers size={14} className={COLORS.success.emeraldText} />
            <span className={`text-xs font-bold ${COLORS.success.emeraldText} uppercase tracking-wider`}>{ASSESSMENT_TEXTS.standard.label}</span>
          </div>
        )}
      </div>

      {/* Panel Toggle Header */}
      <div className={`flex p-1 ${COLORS.neutral.slateBg} ${SIZES.radius.md} border ${COLORS.neutral.slateBorder} backdrop-blur-sm self-start`}>
        <button
          onClick={() => setActivePanel('dashboard')}
          className={`flex items-center ${SIZES.gap.sm} ${SIZES.padding.md} ${SIZES.radius.sm} ${SIZES.font.xl} font-medium ${TRANSITIONS.default} ${
            activePanel === 'dashboard' 
              ? `${COLORS.primary.blueBg} ${COLORS.primary.blueText} ${COLORS.primary.blueShadow}` 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <div className={`${SIZES.size.xs} ${SIZES.radius.full} ${activePanel === 'dashboard' ? `${COLORS.primary.blueLight} animate-pulse` : 'bg-slate-600'}`} />
          {PANEL_TEXTS.dataPanel}
        </button>
        <button
          onClick={() => setActivePanel('report')}
          className={`flex items-center ${SIZES.gap.sm} ${SIZES.padding.md} ${SIZES.radius.sm} ${SIZES.font.xl} font-medium ${TRANSITIONS.default} ${
            activePanel === 'report' 
              ? `${COLORS.secondary.purpleBg} ${COLORS.secondary.purpleText} ${COLORS.secondary.purpleShadow}` 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <div className={`${SIZES.size.xs} ${SIZES.radius.full} ${activePanel === 'report' ? `${COLORS.secondary.purpleLight} animate-pulse` : 'bg-slate-600'}`} />
          {PANEL_TEXTS.aiReport}
          {captureStatus === 'analyzing' && <Loader2 className="w-3 h-3 animate-spin" />}
        </button>
      </div>

      {/* Analysis Action Buttons */}
      {captureStatus === 'completed' && (
        <div className={`flex ${SIZES.gap.sm} p-1 ${COLORS.neutral.slateBg} ${SIZES.radius.md} border ${COLORS.neutral.slateBorder30} backdrop-blur-sm mt-2`}>
          <button
            onClick={() => {
              setReportType('auxiliary');
              setActivePanel('report');
            }}
            className={`flex-1 flex items-center justify-center ${SIZES.gap.sm} py-2 ${SIZES.radius.sm} ${SIZES.font.md} font-black uppercase tracking-wider ${TRANSITIONS.default} ${
              reportType === 'auxiliary' && activePanel === 'report'
                ? `${COLORS.primary.blue} text-white shadow-lg ${COLORS.primary.blueShadow}`
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {PANEL_TEXTS.auxiliaryDiagnosis}
          </button>
          <button
            onClick={() => {
              setReportType('deep');
              setActivePanel('report');
            }}
            className={`flex-1 flex items-center justify-center ${SIZES.gap.sm} py-2 ${SIZES.radius.sm} ${SIZES.font.md} font-black uppercase tracking-wider ${TRANSITIONS.default} ${
              reportType === 'deep' && activePanel === 'report'
                ? `${COLORS.secondary.purple} text-white shadow-lg ${COLORS.secondary.purpleShadow}`
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {PANEL_TEXTS.deepAnalysis}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden min-h-0 mt-4">
        {activePanel === 'report' ? (
          <div className={`h-full ${ANIMATIONS.fadeIn} ${ANIMATIONS.slideInRight}`}>
            <MarkdownReport 
              content={reportType === 'deep' ? markdownReport : auxiliaryReport} 
              loading={captureStatus === 'analyzing' && !(reportType === 'deep' ? markdownReport : auxiliaryReport)} 
            />
          </div>
        ) : (
          <div className={`h-full ${ANIMATIONS.fadeIn} ${ANIMATIONS.slideInLeft}`}>
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
