import React from 'react';
import { Loader2, Zap, Layers, Sparkles } from 'lucide-react';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import { Vision3Dashboard } from './Vision3Dashboard';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { AssessmentType } from '../store/usePostureAssessmentStore';
import { ASSESSMENT_TEXTS, PANEL_TEXTS } from '../constants/uiText';
import { COLORS, SIZES, ANIMATIONS, TRANSITIONS } from '@/constants/uiStyles';

interface Vision3AnalysisPanelProps {
  activePanel: 'dashboard' | 'report';
  setActivePanel: (panel: 'dashboard' | 'report') => void;
  captureStatus: string;
  /** 深度报告 - LLM 解析的报告 */
  markdownReport: string | null;
  /** 流式报告内容 - 用于实时显示 LLM 输出 */
  streamingReport?: string;
  /** 是否正在生成流式报告 */
  isStreamingReport?: boolean;
  /** 基础报告 - 根据规则得出的结论 */
  auxiliaryDiagnosis: string | null;
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
  /** 是否正在加载深度报告 */
  isLoadingDeepReport?: boolean;
  /** 请求深度报告回调 */
  onRequestDeepAnalysis?: () => void;
}

export const Vision3AnalysisPanel: React.FC<Vision3AnalysisPanelProps> = ({
  activePanel,
  setActivePanel,
  captureStatus,
  markdownReport,
  streamingReport,
  isStreamingReport,
  auxiliaryDiagnosis,
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
  assessmentType,
  isLoadingDeepReport,
  onRequestDeepAnalysis
}) => {
  console.log('[Vision3AnalysisPanel] Props:', {
    activePanel,
    captureStatus,
    hasMarkdownReport: !!markdownReport,
    hasAuxiliaryDiagnosis: auxiliaryDiagnosis !== null,
    auxiliaryDiagnosisLength: auxiliaryDiagnosis?.length,
    hasStreamingReport: !!streamingReport,
    isStreamingReport
  });
  
  return (
    <div className={`h-full flex flex-col ${COLORS.neutral.light.bg} ${SIZES.radius.lg} ${COLORS.neutral.light.border} p-6 shadow-xl`}>
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
      <div className={`flex p-1 ${COLORS.neutral.light.bgSoft} ${SIZES.radius.md} border ${COLORS.neutral.light.borderSoft} backdrop-blur-sm self-start`}>
        <button
          onClick={() => setActivePanel('dashboard')}
          className={`flex items-center ${SIZES.gap.sm} ${SIZES.padding.md} ${SIZES.radius.sm} ${SIZES.font.xl} font-medium ${TRANSITIONS.default} ${
            activePanel === 'dashboard' 
              ? `${COLORS.primary.blueBg} ${COLORS.primary.blueText} ${COLORS.primary.blueShadow}` 
              : COLORS.neutral.light.buttonInactive
          }`}
        >
          <div className={`${SIZES.size.xs} ${SIZES.radius.full} ${activePanel === 'dashboard' ? `${COLORS.primary.blueLight} ${COLORS.neutral.light.indicatorActive}` : COLORS.neutral.light.indicator}`} />
          {PANEL_TEXTS.dataPanel}
        </button>
        <button
          onClick={() => setActivePanel('report')}
          className={`flex items-center ${SIZES.gap.sm} ${SIZES.padding.md} ${SIZES.radius.sm} ${SIZES.font.xl} font-medium ${TRANSITIONS.default} ${
            activePanel === 'report' 
              ? `${COLORS.secondary.purpleBg} ${COLORS.secondary.purpleText} ${COLORS.secondary.purpleShadow}` 
              : COLORS.neutral.light.buttonInactive
          }`}
        >
          <div className={`${SIZES.size.xs} ${SIZES.radius.full} ${activePanel === 'report' ? `${COLORS.secondary.purpleLight} ${COLORS.neutral.light.indicatorActive}` : COLORS.neutral.light.indicator}`} />
          {PANEL_TEXTS.aiReport}
        </button>
      </div>

      {/* Analysis Action Buttons - Only Deep Analysis */}
      {captureStatus === 'completed' && (
        <div className={`flex ${SIZES.gap.sm} p-1 ${COLORS.neutral.light.bgSoft} ${SIZES.radius.md} border ${COLORS.neutral.light.borderSoft} backdrop-blur-sm mt-2`}>
          {/* 深度报告按钮 - 如果没有深度报告，显示获取按钮 */}
          {!markdownReport && onRequestDeepAnalysis ? (
            <button
              onClick={() => {
                onRequestDeepAnalysis();
                setActivePanel('report');
              }}
              disabled={isLoadingDeepReport}
              className={`flex-1 flex items-center justify-center ${SIZES.gap.sm} py-2 ${SIZES.radius.sm} ${SIZES.font.md} font-black uppercase tracking-wider ${TRANSITIONS.default} ${
                isLoadingDeepReport
                  ? COLORS.neutral.light.buttonDisabled
                  : `${COLORS.secondary.purple} text-white shadow-lg ${COLORS.secondary.purpleShadow} hover:opacity-90`
              }`}
            >
              {isLoadingDeepReport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {PANEL_TEXTS.deepAnalysis}
                </>
              )}
            </button>
          ) : null}
        </div>
      )}

      <div className="flex-1 overflow-hidden min-h-0 mt-4">
        {activePanel === 'report' ? (
          <div className={`h-full ${ANIMATIONS.fadeIn} ${ANIMATIONS.slideInRight} ${SIZES.radius.lg} overflow-auto`}>
            {/* 基础报告 */}
            {auxiliaryDiagnosis && (
              <div className={`mb-6 p-4 ${COLORS.neutral.light.bgSoft} ${SIZES.radius.lg} border ${COLORS.neutral.light.borderSoft}`}>
                <h3 className={`mb-3 ${SIZES.font.lg} font-bold ${COLORS.neutral.slateText} flex items-center gap-2`}>
                  <Zap size={18} className={COLORS.info.cyanText} />
                  基础评估报告
                </h3>
                <MarkdownReport 
                  content={auxiliaryDiagnosis} 
                  loading={false}
                />
              </div>
            )}
            
            {/* 深度报告 */}
            {(markdownReport || streamingReport) && (
              <div className={`p-4 ${COLORS.neutral.light.bgSoft} ${SIZES.radius.lg} border ${COLORS.neutral.light.borderSoft}`}>
                <h3 className={`mb-3 ${SIZES.font.lg} font-bold ${COLORS.neutral.slateText} flex items-center gap-2`}>
                  <Sparkles size={18} className={COLORS.secondary.purpleText} />
                  深度分析报告
                </h3>
                <MarkdownReport 
                  content={isStreamingReport ? streamingReport || '' : markdownReport || ''} 
                  loading={false}
                />
              </div>
            )}
            
            {/* 无报告提示 */}
            {!auxiliaryDiagnosis && !markdownReport && !streamingReport && (
              <div className={`h-full flex items-center justify-center ${COLORS.neutral.light.bgSoft} ${SIZES.radius.lg} border ${COLORS.neutral.light.borderSoft}`}>
                <p className={`${SIZES.font.md} ${COLORS.neutral.slateText}`}>暂无报告数据</p>
              </div>
            )}
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
