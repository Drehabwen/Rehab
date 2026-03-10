import React, { useEffect, useRef } from 'react';
import { AlertTriangle, History, Loader2 } from 'lucide-react';
import * as marked from 'marked';
import { useTreatmentPlanStore } from '../../store/useTreatmentPlanStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TreatmentPlanVersionCompare } from './TreatmentPlanVersionCompare';
import { TreatmentPlanVersionList } from './TreatmentPlanVersionList';

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

  const errorClass = 'semantic-panel semantic-panel-error mb-4 flex items-center gap-2';
  const contentShellClass = 'overflow-hidden rounded-xl border border-slate-200 bg-white';
  const contentHeaderClass = 'flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3';
  const contentBodyClass = 'min-h-[400px] max-h-[600px] overflow-y-auto bg-white p-4';

  return (
    <div className="space-y-4">
      <Card className="mx-auto max-w-4xl">
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">治疗计划生成</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                版本历史
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
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

          {error ? (
            <div className={errorClass}>
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          ) : null}

          <div className={contentShellClass}>
            <div className={contentHeaderClass}>
              <span className="text-sm font-medium text-slate-600">治疗计划内容</span>
              {isGenerating ? (
                <div className="flex items-center text-sm text-blue-600">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  正在生成...
                </div>
              ) : null}
            </div>
            <div ref={contentRef} className={contentBodyClass}>
              {!currentContent && !isGenerating ? (
                <div className="py-10 text-center text-slate-500">
                  点击上方按钮生成治疗计划
                </div>
              ) : null}
            </div>
          </div>

          {currentContent && !isGenerating ? (
            <div className="mt-4 flex justify-end">
              <Button onClick={clearContent} variant="danger">
                清除内容
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      {showVersionHistory ? (
        <TreatmentPlanVersionList assessmentId={assessmentId} patientId={patientId} />
      ) : null}

      {comparingVersions[0] && comparingVersions[1] ? (
        <TreatmentPlanVersionCompare assessmentId={assessmentId} patientId={patientId} />
      ) : null}
    </div>
  );
};
