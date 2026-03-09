import React from 'react';
import { ArrowRight, Calendar, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types/patient';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { tools } from './patient-tools';
import {
  getPatientDisplayName,
  getPatientAvatar,
  getPatientColor,
} from '@/lib/patient-utils';
import { PageTitleSection, UnifiedStatusBadge } from '@/components/layout';

interface PatientToolboxProps {
  patient: Patient;
  onSelectTool: (toolId: string) => void;
  onBack: () => void;
  sessionCount: number;
}

export const PatientToolbox: React.FC<PatientToolboxProps> = ({
  patient,
  onSelectTool,
  onBack,
  sessionCount,
}) => {
  const { assessments } = useAssessmentStore();

  const patientAssessments = assessments.filter((a) => a.patientId === patient.id);

  const assessmentCounts = {
    posture: patientAssessments.filter((a) => a.type === 'posture').length,
    rom: patientAssessments.filter((a) => a.type === 'rom').length,
    voice: patientAssessments.filter((a) => a.type === 'medvoice').length,
    comparison: patientAssessments.length > 1 ? 1 : 0,
  };

  const getToolCount = (toolId: string): number => {
    switch (toolId) {
      case 'vision3':
        return assessmentCounts.posture;
      case 'medvoice':
        return assessmentCounts.voice;
      case 'rom':
        return assessmentCounts.rom;
      case 'comparison':
        return assessmentCounts.comparison;
      default:
        return 0;
    }
  };

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner">
        <PageTitleSection
          title="患者工作台"
          description="选择功能后进入评估流程。"
          right={
            <button onClick={onBack} className="btn-secondary">
              返回患者管理
            </button>
          }
        />

        <section className="bento-card p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-semibold', getPatientColor(patient))}>
                {getPatientAvatar(patient)}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-900 truncate">{getPatientDisplayName(patient)}</div>
                <div className="text-sm text-slate-500 truncate">ID: {patient.id}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium">体态 {assessmentCounts.posture}</div>
              <div className="px-3 py-2 rounded-xl bg-violet-50 text-violet-700 text-sm font-medium">语音 {assessmentCounts.voice}</div>
              <div className="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-medium">ROM {assessmentCounts.rom}</div>
              <div className="px-3 py-2 rounded-xl bg-cyan-50 text-cyan-700 text-sm font-medium">对比 {assessmentCounts.comparison}</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1"><Calendar size={14} /> 建档 {new Date(patient.createdAt).toLocaleDateString('zh-CN')}</span>
            <span className="inline-flex items-center gap-1"><Clock size={14} /> 第 {sessionCount + 1} 次接诊</span>
            {patient.notes ? <span className="inline-flex items-center gap-1"><FileText size={14} /> {patient.notes}</span> : null}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {tools.map((tool) => {
            const count = getToolCount(tool.id);
            const disabled = !tool.available;

            return (
              <button
                key={tool.id}
                onClick={() => tool.available && onSelectTool(tool.id)}
                disabled={disabled}
                className={cn(
                  'bento-card p-4 text-left transition-colors min-h-[148px] flex flex-col',
                  disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center', tool.color)}>
                    <tool.icon size={18} />
                  </div>
                  {disabled ? (
                    <UnifiedStatusBadge status="disabled" text="即将上线" />
                  ) : count > 0 ? (
                    <UnifiedStatusBadge status="success" text={`已记录 ${count}`} />
                  ) : (
                    <UnifiedStatusBadge status="processing" text="可开始" />
                  )}
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900">{tool.name}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-6 line-clamp-2">{tool.description}</p>

                <div className="mt-auto pt-4 flex items-center text-sm text-antey-primary font-medium">
                  进入功能
                  <ArrowRight size={14} className="ml-1" />
                </div>
              </button>
            );
          })}
        </section>
      </div>
    </div>
  );
};
