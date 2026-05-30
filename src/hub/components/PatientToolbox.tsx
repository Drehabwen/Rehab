import React, { useState } from 'react';
import { Activity, ArrowLeft, BarChart3, ClipboardList, FileText, Layers, Mic, CheckCircle } from 'lucide-react';
import { AssessmentCard, PageHeader, StatusTag } from '@/components/workflow';
import { Button } from '@/components/ui';
import type { Patient } from '@/types/patient';
import type { Assessment } from '@/types/assessment';
import type { VisitTaskSummary, WorkflowToolId } from '../workflow';
import { formatDate } from '@/lib/session-utils';
import { useSessionStore } from '@/store/useSessionStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';

// Sub-components
import { PatientInfoCard } from './patient-toolbox/PatientInfoCard';
import { CompleteSessionModal } from './patient-toolbox/CompleteSessionModal';

interface PatientToolboxProps {
  patient: Patient;
  visitTask: VisitTaskSummary | null;
  onSelectTool: (toolId: WorkflowToolId) => void;
  onOpenReports: () => void;
  onOpenComparison: () => void;
  onBack: () => void;
  sessionCount: number;
}

const iconMap = {
  vision3: Activity,
  rom: Layers,
  medvoice: Mic,
  scale: ClipboardList,
} as const;

const accentMap = {
  vision3: 'bg-blue-600 text-white',
  rom: 'bg-emerald-600 text-white',
  medvoice: 'bg-violet-600 text-white',
  scale: 'bg-teal-600 text-white',
} as const;

export const PatientToolbox: React.FC<PatientToolboxProps> = ({
  patient,
  visitTask,
  onSelectTool,
  onOpenReports,
  onOpenComparison,
  onBack,
  sessionCount,
}) => {
  const comparisonEnabled = sessionCount > 1;

  const { updateSession } = useSessionStore();
  const { updateAssessment } = useAssessmentStore();

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  if (!visitTask) {
    return (
      <div className="rehab-page custom-scrollbar">
        <div className="rehab-page-inner">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">未能加载当前接诊信息，请返回接诊中心后重试。</div>
          </div>
        </div>
      </div>
    );
  }

  const handleConfirmComplete = async (notes: string, isBaseline: boolean) => {
    try {
      await updateSession(visitTask.visitId, {
        status: 'completed',
        notes: notes,
        isBaseline: isBaseline,
      });

      if (isBaseline) {
        const sessionAssessments = visitTask.modules
          .map(m => m.latestAssessment)
          .filter(Boolean) as Assessment[];
        
        await Promise.all(
          sessionAssessments.map(async (ast) => {
            await updateAssessment(ast.id, { isBaseline: true });
          })
        );
      }
    } catch (err) {
      console.error('Failed to complete session:', err);
    }

    onOpenReports();
  };

  const isCompleted = visitTask.status === 'completed';

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="接诊 -> 评估 -> 报告"
          title="评估中心"
          description="本页只用于完成本次接诊评估，完成后再进入报告中心，避免接诊、评估、报告任务混在同一页面。"
          summary={
            <>
              <StatusTag status={visitTask.status} />
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                接诊 ID {visitTask.visitId}
              </span>
            </>
          }
          actions={
            <>
              <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={onBack}>返回评估中心</Button>
              <Button variant="secondary" icon={<BarChart3 size={16} />} onClick={onOpenComparison} disabled={!comparisonEnabled}>进度对比</Button>
              <Button variant="primary" icon={<FileText size={16} />} onClick={onOpenReports}>进入报告中心</Button>
              {!isCompleted && (
                <Button 
                  variant="primary" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)]" 
                  icon={<CheckCircle size={16} />} 
                  onClick={() => setIsCompleteModalOpen(true)}
                  disabled={visitTask.completedModules === 0}
                >
                  完成本次评估
                </Button>
              )}
            </>
          }
        />

        <PatientInfoCard 
          patient={patient} 
          visitTask={visitTask} 
          sessionCount={sessionCount} 
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {visitTask.modules.map((module) => {
            const Icon = iconMap[module.toolId];
            return (
              <AssessmentCard
                key={module.toolId}
                icon={Icon}
                title={module.title}
                description={module.description}
                status={module.status}
                summary={module.latestAssessment ? '当前患者已存在该模块最新记录，可直接查看结果，也可以继续补录。' : '当前患者尚未完成该模块，建议按流程顺序尽快补齐。'}
                meta={module.latestCreatedAt ? `最近记录 ${formatDate(module.latestCreatedAt)}` : '暂无记录'}
                actionLabel={module.actionLabel}
                onAction={() => onSelectTool(module.toolId)}
                accentClassName={accentMap[module.toolId]}
                footer={
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>记录数 {module.assessmentCount}</span>
                    <span>{module.status === 'completed' ? '已可进入报告中心' : '完成后将进入报告中心'}</span>
                  </div>
                }
              />
            );
          })}
        </section>
      </div>

      <CompleteSessionModal 
        isOpen={isCompleteModalOpen} 
        onClose={() => setIsCompleteModalOpen(false)} 
        visitTask={visitTask} 
        onConfirm={handleConfirmComplete} 
      />
    </div>
  );
};
