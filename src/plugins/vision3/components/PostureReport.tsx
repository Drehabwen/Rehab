import React from 'react';
import { PostureReportViewer } from '@/components/shared/PostureReportViewer';

interface PostureReportProps {
  /** 基础报告 - 根据规则得出的结论 */
  auxiliaryDiagnosis?: string | null;
  /** 深度报告 - LLM解析的报告 */
  markdownReport?: string | null;
  /** 当前报告类型 */
  reportType?: 'auxiliary' | 'deep';
  /** 设置报告类型 */
  setReportType?: (type: 'auxiliary' | 'deep') => void;
  /** 重置回调 */
  onReset: () => void;
}

/**
 * 体态报告组件 - 使用共享的 PostureReportViewer
 * 
 * 统一显示基础报告（规则结论）和深度报告（LLM解析）
 */
export const PostureReport: React.FC<PostureReportProps> = ({ 
  auxiliaryDiagnosis,
  markdownReport,
  reportType = 'deep',
  setReportType,
  onReset 
}) => {
  return (
    <PostureReportViewer
      auxiliaryDiagnosis={auxiliaryDiagnosis}
      markdownReport={markdownReport}
      reportType={reportType}
      setReportType={setReportType}
      onReset={onReset}
      inline={true}
      title="体态评估报告"
      subtitle="AI POWERED ANALYSIS"
    />
  );
};

export default PostureReport;
