import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { HubSidebar } from './components/HubSidebar';

import { Vision3Plugin } from '@/plugins/vision3/Vision3Plugin';
import { MedVoicePlugin } from '@/plugins/medvoice/MedVoicePlugin';
import { ROMPlugin } from '@/plugins/rom/ROMPlugin';
import { ScaleAssessmentPanel } from '@/components/patient/ScaleAssessmentPanel';
import { NexusReportCenter } from './components/NexusReportCenter';
import { NewSessionModal } from './components/NewSessionModal';
import { PatientSearchModal } from './components/PatientSearchModal';
import { DataSettingsModal } from './components/DataSettingsModal';
import { SquatLabSyncPanel } from '@/components/SquatLabSyncPanel';
import { PatientToolbox } from './components/PatientToolbox';
import { ProgressComparison } from './components/ProgressComparison';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { DashboardView } from './views/DashboardView';
import { AssessmentCenterView } from './views/AssessmentCenterView';
import { DataCenterView } from './views/DataCenterView';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { usePatientList } from './hooks/usePatientList';
import { IntegrationService, type PatientReminders } from '@/services/integrationService';
import type { Patient } from '@/types/patient';
import { getPatientAvatar, getPatientDisplayName } from '@/lib/patient-utils';
import { PatientHeaderBar, StatePanel } from '@/components/layout';

type CenterId = 'dashboard' | 'assessment' | 'reports' | 'datacenter';
type AssessmentStage = 'overview' | 'workspace';
type AssessmentTool = 'vision3' | 'medvoice' | 'comparison' | 'rom' | 'scale';

export const NexusHub: React.FC = () => {
  const [activeCenter, setActiveCenter] = useState<CenterId>('dashboard');
  const [assessmentStage, setAssessmentStage] = useState<AssessmentStage>('overview');
  const [activePlugin, setActivePlugin] = useState<AssessmentTool>('vision3');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [remindersMap, setRemindersMap] = useState<Map<string, PatientReminders>>(new Map());
  const [totalOverdue, setTotalOverdue] = useState(0);
  const [totalDueSoon, setTotalDueSoon] = useState(0);

  const { patients, loadPatients, setCurrentPatient, getPatientById } = usePatientStore();
  const { sessions, loadSessions, getPatientSessions } = useSessionStore();
  const { assessments, loadAssessments, clearCurrentAssessment } = useAssessmentStore();
  const { resetMeasurement } = useMeasurementStore();

  useEffect(() => {
    loadPatients();
    loadSessions();
    loadAssessments();
  }, [loadPatients, loadSessions, loadAssessments]);

  // 定期拉取提醒数据
  const refreshReminders = useCallback(async () => {
    try {
      const data = await IntegrationService.getAllReminders();
      const map = new Map<string, PatientReminders>();
      for (const p of data.patients) {
        map.set(p.patient_id, p);
      }
      setRemindersMap(map);
      setTotalOverdue(data.total_overdue);
      setTotalDueSoon(data.total_due_soon);
    } catch {
      // 静默降级
    }
  }, []);

  useEffect(() => {
    refreshReminders();
    // 每5分钟刷新一次
    const interval = setInterval(refreshReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshReminders]);

  useEffect(() => {
    const handleNavigateToReports = () => {
      console.log('[NexusHub] Switching active center to reports');
      setActiveCenter('reports');
    };
    window.addEventListener('rehab-navigate-to-reports', handleNavigateToReports);
    return () => {
      window.removeEventListener('rehab-navigate-to-reports', handleNavigateToReports);
    };
  }, []);

  const { stats, visitTasks, getVisitTaskByPatientId } = usePatientList({
    patients,
    assessments,
    getPatientSessions,
  });

  const selectedVisitTask = useMemo(
    () => (selectedPatient ? getVisitTaskByPatientId(selectedPatient.id) : null),
    [getVisitTaskByPatientId, selectedPatient],
  );

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentPatient(patient);
    clearCurrentAssessment();
    resetMeasurement();
    setActiveCenter('assessment');
    setAssessmentStage('overview');
  };

  const handleToolSelectFromToolbox = (toolId: string) => {
    setActivePlugin(toolId as AssessmentTool);
    setActiveCenter('assessment');
    setAssessmentStage('workspace');
  };

  const handleBackFromToolbox = () => {
    setAssessmentStage('overview');
    setActiveCenter('assessment');
    setSelectedPatient(null);
    setCurrentPatient(null);
    clearCurrentAssessment();
    resetMeasurement();
  };

  const handleBackFromWorkspace = () => {
    setAssessmentStage('overview');
  };

  const handleSelectTool = (tool: AssessmentTool) => {
    setActivePlugin(tool);
    if (!selectedPatient) return;
    setActiveCenter('assessment');
    setAssessmentStage('workspace');
  };

  const handleStartNewPatient = async (patientId: string) => {
    await loadPatients();
    const newPatient = getPatientById(patientId);
    if (newPatient) {
      setSelectedPatient(newPatient);
      setCurrentPatient(newPatient);
      setActiveCenter('assessment');
      setAssessmentStage('overview');
    }
    setShowNewSessionModal(false);
  };

  const handleOpenReports = () => {
    setActiveCenter('reports');
  };

  const handleOpenComparison = () => {
    setActivePlugin('comparison');
    setActiveCenter('assessment');
    setAssessmentStage('workspace');
  };

  const renderAssessmentWorkspace = () => {
    switch (activePlugin) {
      case 'vision3':
        return <Vision3Plugin />;
      case 'medvoice':
        return <MedVoicePlugin />;
      case 'rom':
        return <ROMPlugin />;
      case 'scale':
        return selectedPatient && selectedVisitTask?.sessionId ? (
          <ScaleAssessmentPanel
            patientId={selectedPatient.id}
            sessionId={selectedVisitTask.sessionId}
            onBack={handleBackFromWorkspace}
          />
        ) : (
          <div className="rehab-page">
            <div className="rehab-page-inner">
              <StatePanel
                title="暂时无法进行量表评定"
                description="未关联有效的治疗会话。"
                actions={<button className="btn-primary" onClick={handleBackFromWorkspace}>返回</button>}
              />
            </div>
          </div>
        );
      case 'comparison':
        return selectedPatient ? (
          <ProgressComparison
            patientId={selectedPatient.id}
            patientName={selectedPatient.name}
            onBack={handleBackFromWorkspace}
          />
        ) : (
          <div className="rehab-page">
            <div className="rehab-page-inner">
              <StatePanel
                title="暂时无法进行前后对比"
                description="至少需要 2 次完整评估记录。"
                actions={(
                  <>
                    <button className="btn-primary" onClick={() => setAssessmentStage('overview')}>去完成首次评估</button>
                    <button className="btn-secondary" onClick={() => setActiveCenter('reports')}>查看报告</button>
                  </>
                )}
              />
            </div>
          </div>
        );
      default:
        return <Vision3Plugin />;
    }
  };

  const renderCenterContent = () => {
    switch (activeCenter) {
      case 'dashboard':
        return (
          <DashboardView
            patients={patients}
            visitTasks={visitTasks}
            stats={stats}
            onSelectPatient={handleSelectPatient}
            onNewPatient={() => setShowNewSessionModal(true)}
            onSearchPatient={() => setShowSearchModal(true)}
            onOpenSyncPanel={() => setShowSyncPanel(true)}
            remindersMap={remindersMap}
            totalOverdue={totalOverdue}
            totalDueSoon={totalDueSoon}
            onRefreshReminders={refreshReminders}
          />
        );
      case 'assessment':
        if (!selectedPatient) {
          return <AssessmentCenterView visitTasks={visitTasks} onSelectPatient={handleSelectPatient} />;
        }

        if (assessmentStage === 'workspace') {
          return <div className="h-full">{renderAssessmentWorkspace()}</div>;
        }

        return (
          <PatientToolbox
            patient={selectedPatient}
            visitTask={selectedVisitTask}
            onSelectTool={handleToolSelectFromToolbox}
            onOpenReports={handleOpenReports}
            onOpenComparison={handleOpenComparison}
            onBack={handleBackFromToolbox}
            sessionCount={getPatientSessions(selectedPatient.id).length}
          />
        );
      case 'reports':
        return (
          <NexusReportCenter
            mode="reports"
            patientId={selectedPatient?.id ?? null}
            sessionId={selectedVisitTask?.sessionId ?? null}
          />
        );
      case 'datacenter':
        return (
          <DataCenterView
            sessions={sessions}
            assessments={assessments}
            visitTasks={visitTasks}
          />
        );
      default:
        return null;
    }
  };

  const showPatientHeader = activeCenter === 'assessment' && !!selectedPatient;
  const showWorkspaceToolbar = activeCenter === 'assessment' && assessmentStage === 'workspace' && !!selectedPatient;

  return (
    <div className="mesh-gradient flex h-screen overflow-hidden text-slate-900">
      <HubSidebar
        activeId={activeCenter}
        onSelect={(id) => {
          if (id === 'dashboard' || id === 'assessment' || id === 'reports' || id === 'datacenter') {
            setActiveCenter(id);
            if (id !== 'assessment') {
              setAssessmentStage('overview');
            }
          }
        }}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        onSettingsClick={() => setShowDataSettings(true)}
      />

      <main className={cn('relative flex min-w-0 flex-1 flex-col')}>
        {showPatientHeader && selectedPatient ? (
          <PatientHeaderBar
            name={getPatientDisplayName(selectedPatient)}
            avatar={getPatientAvatar(selectedPatient)}
            meta={`第 ${Math.max(getPatientSessions(selectedPatient.id).length, 1)} 次接诊 · 最近更新 ${new Date(selectedPatient.updatedAt).toLocaleDateString('zh-CN')}`}
            onBack={assessmentStage === 'workspace' ? handleBackFromWorkspace : handleBackFromToolbox}
            onSettings={() => setShowDataSettings(true)}
          />
        ) : null}

        <div className={cn('flex-1 min-h-0 overflow-hidden', showWorkspaceToolbar && 'pb-20')}>
          {renderCenterContent()}
        </div>

        {showWorkspaceToolbar ? (
          <WorkspaceToolbar activeTool={activePlugin} onSelectTool={handleSelectTool} />
        ) : null}

        <NewSessionModal
          isOpen={showNewSessionModal}
          onClose={() => setShowNewSessionModal(false)}
          onStartSession={handleStartNewPatient}
        />

        <PatientSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSelectPatient={handleSelectPatient}
        />

        <DataSettingsModal
          isOpen={showDataSettings}
          onClose={() => setShowDataSettings(false)}
        />

        <SquatLabSyncPanel
          isOpen={showSyncPanel}
          onClose={() => setShowSyncPanel(false)}
          onImportSuccess={(name) => {
            loadPatients();
          }}
        />
      </main>
    </div>
  );
};
