import React, { useEffect, useRef } from 'react';
import { useTreatmentPlanStore } from '../../store/useTreatmentPlanStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AlertTriangle, Loader2, Check, History } from 'lucide-react';
import * as marked from 'marked';
import { TreatmentPlanVersionList } from './TreatmentPlanVersionList';
import { TreatmentPlanVersionCompare } from './TreatmentPlanVersionCompare';

interface TreatmentPlanViewerProps {
  assessmentId: string;
  patientId: string;
}

export const TreatmentPlanViewer: React.FC<TreatmentPlanViewerProps> = ({
  assessmentId,
  patientId,
}) => {
  const {
    currentContent,
    isGenerating,
    error,
    generatePlan,
    clearContent,
    comparingVersions,
  } = useTreatmentPlanStore();

  const [showVersionHistory, setShowVersionHistory] = React.useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // 当内容更新时，使用 ref 直接操作 DOM，避免 React 重新渲染
  useEffect(() => {
    const updateContent = async () => {
      if (contentRef.current && currentContent) {
        contentRef.current.innerHTML = await marked.parse(currentContent);
      }
    };
    updateContent();
  }, [currentContent]);

  const handleGenerate = () => {
    clearContent();
    generatePlan(assessmentId, patientId);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">治疗计划生成</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              版本历史
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                '生成治疗计划'
              )}
            </Button>
          </div>
        </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
          <AlertTriangle className="mr-2 h-4 w-4" />
          {error}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">治疗计划内容</span>
          {isGenerating && (
            <div className="flex items-center text-sm text-blue-600">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              正在生成...
            </div>
          )}
        </div>
        <div
          ref={contentRef}
          className="p-4 min-h-[400px] max-h-[600px] overflow-y-auto bg-white"
        >
          {!currentContent && !isGenerating && (
            <div className="text-center text-gray-500 py-10">
              点击上方按钮生成治疗计划
            </div>
          )}
        </div>
      </div>

      {currentContent && !isGenerating && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={clearContent}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            清除内容
          </Button>
        </div>
      )}
      </Card>

      {showVersionHistory && (
        <TreatmentPlanVersionList
          assessmentId={assessmentId}
          patientId={patientId}
        />
      )}

      {comparingVersions[0] && comparingVersions[1] && (
        <TreatmentPlanVersionCompare
          assessmentId={assessmentId}
          patientId={patientId}
        />
      )}
    </div>
  );
};
