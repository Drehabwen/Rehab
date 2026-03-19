import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { HubSidebar } from './components/HubSidebar';

import { Vision3Plugin } from '@/plugins/vision3/Vision3Plugin';
import { MedVoicePlugin } from '@/plugins/medvoice/MedVoicePlugin';
import { ROMPlugin } from '@/plugins/rom/ROMPlugin';
import { TrainingPlanPlugin } from '@/plugins/training-plan/TrainingPlanPlugin';
import { NexusReportCenter } from './components/NexusReportCenter';
import { NewSessionModal } from './components/NewSessionModal';
import { PatientSearchModal } from './components/PatientSearchModal';
import { DataSettingsModal } from './components/DataSettingsModal';
import { PatientToolbox } from './components/PatientToolbox';
import { ProgressComparison } from './components/ProgressComparison';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { DashboardView } from './views/DashboardView';
import { AssessmentCenterView } from './views/AssessmentCenterView';
import { StudentsView } from './views/StudentsView';
import { AlertsView } from './views/AlertsView';
import { OrganizationView } from './views/OrganizationView';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { usePatientList } from './hooks/usePatientList';
import type { Patient } from '@/types/patient';
import { getPatientAvatar, getPatientDisplayName } from '@/lib/patient-utils';
import { PatientHeaderBar, StatePanel } from '@/components/layout';
import {
  canAccessSettings,
  canOpenReports,
  getAllowedCenters,
  getAllowedTools,
  getRuntimeAuthContext,
  type AssessmentTool,
  type CenterId,
} from '@/auth/access';

type AssessmentStage = 'overview' | 'workspace';

export const NexusHub: React.FC = () => {
  const authContext = useMemo(() => getRuntimeAuthContext(), []);
  const allowedCenters = useMemo<CenterId[]>(() => getAllowedCenters(authContext), [authContext]);
  const allowedTools = useMemo<AssessmentTool[]>(() => getAllowedTools(authContext), [authContext]);
  const defaultCenter = allowedCenters[0] ?? 'screening';
  const defaultTool = allowedTools[0] ?? 'vision3';

  const [activeCenter, setActiveCenter] = useState<CenterId>(defaultCenter);
  const [assessmentStage, setAssessmentStage] = useState<AssessmentStage>('overview');
  const [activePlugin, setActivePlugin] = useState<AssessmentTool>(defaultTool);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);

  const { patients, loadPatients, setCurrentPatient, getPatientById } = usePatientStore();
  const { sessions, loadSessions, getPatientSessions, startSession } = useSessionStore();
  const { assessments, loadAssessments } = useAssessmentStore();

  useEffect(() => {
    loadPatients();
    loadSessions();
    loadAssessments();
  }, [loadAssessments, loadPatients, loadSessions]);

  const { stats, visitTasks, getVisitTaskByPatientId } = usePatientList({
    patients,
    assessments,
    getPatientSessions,
  });

  const selectedVisitTask = useMemo(
    () => (selectedPatient ? getVisitTaskByPatientId(selectedPatient.id) : null),
    [getVisitTaskByPatientId, selectedPatient],
  );

  const reportsEnabled = canOpenReports(authContext);
  const settingsEnabled = canAccessSettings(authContext);
  const comparisonEnabled = allowedTools.includes('comparison');

  useEffect(() => {
    if (!allowedCenters.includes(activeCenter)) {
      setActiveCenter(defaultCenter);
      setAssessmentStage('overview');
    }
  }, [activeCenter, allowedCenters, defaultCenter]);

  useEffect(() => {
    if (!allowedTools.includes(activePlugin)) {
      setActivePlugin(defaultTool);
      setAssessmentStage('overview');
    }
  }, [activePlugin, allowedTools, defaultTool]);

  const navigateToScreening = (patient?: Patient | null) => {
    if (patient) {
      setSelectedPatient(patient);
      setCurrentPatient(patient);
    }
    if (allowedCenters.includes('screening')) {
      setActiveCenter('screening');
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentPatient(patient);
    navigateToScreening(patient);
    setAssessmentStage('overview');
  };

  const handleToolSelectFromToolbox = (toolId: string) => {
    if (!allowedTools.includes(toolId as AssessmentTool)) {
      return;
    }
    setActivePlugin(toolId as AssessmentTool);
    setActiveCenter('screening');
    setAssessmentStage('workspace');
  };

  const handleBackFromToolbox = () => {
    setAssessmentStage('overview');
    setActiveCenter('screening');
    setSelectedPatient(null);
    setCurrentPatient(null);
  };

  const handleBackFromWorkspace = () => {
    setAssessmentStage('overview');
  };

  const handleStartNewPatient = async (patientId: string) => {
    await loadPatients();
    const newPatient = getPatientById(patientId);
    if (newPatient) {
      setSelectedPatient(newPatient);
      setCurrentPatient(newPatient);
      setActiveCenter('screening');
      setAssessmentStage('overview');
    }
    setShowNewSessionModal(false);
  };

  const handleOpenReports = () => {
    if (allowedCenters.includes('reports')) {
      setActiveCenter('reports');
    }
  };

  const handleOpenPatientHistory = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentPatient(patient);
    if (allowedCenters.includes('students')) {
      setActiveCenter('students');
      return;
    }
    if (allowedCenters.includes('reports')) {
      setActiveCenter('reports');
      return;
    }
    navigateToScreening(patient);
    setAssessmentStage('overview');
  };

  const handleStartEvaluation = async (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentPatient(patient);
    await startSession(patient.id);
    await loadSessions();
    setActiveCenter('screening');
    setAssessmentStage('overview');
  };

  const handleOpenComparison = () => {
    if (!allowedTools.includes('comparison')) {
      return;
    }
    setActivePlugin('comparison');
    setActiveCenter('screening');
    setAssessmentStage('workspace');
  };

  const renderAssessmentWorkspace = () => {
    switch (activePlugin) {
      case 'vision3':
        return <Vision3Plugin onNavigateToReports={handleOpenReports} />;
      case 'medvoice':
        return <MedVoicePlugin />;
      case 'rom':
        return <ROMPlugin />;
      case 'training_plan':
        return <TrainingPlanPlugin />;
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
                title="当前无法进行前后对比"
                description="至少需要 2 次完整筛查记录后，才能进入前后对比视图。"
                actions={(
                  <>
                    <button className="btn-primary" onClick={() => setAssessmentStage('overview')}>返回筛查工作台</button>
                    <button className="btn-secondary" onClick={() => setActiveCenter('reports')}>查看报告</button>
                  </>
                )}
              />
            </div>
          </div>
        );
      default:
        return <Vision3Plugin onNavigateToReports={handleOpenReports} />;
    }
  };

  const renderCenterContent = () => {
    switch (activeCenter) {
      case 'home':
        return (
          <DashboardView
            patients={patients}
            visitTasks={visitTasks}
            stats={stats}
            onSelectPatient={handleSelectPatient}
            onOpenHistory={handleOpenPatientHistory}
            onStartEvaluation={handleStartEvaluation}
            canOpenHistory={reportsEnabled}
            onNewPatient={() => setShowNewSessionModal(true)}
            onSearchPatient={() => setShowSearchModal(true)}
          />
        );
      case 'screening':
        if (!selectedPatient) {
          return (
            <AssessmentCenterView
              visitTasks={visitTasks}
              onSelectPatient={handleSelectPatient}
              onOpenHistory={handleOpenPatientHistory}
              onStartEvaluation={handleStartEvaluation}
              canOpenHistory={reportsEnabled}
            />
          );
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
            allowedToolIds={allowedTools.filter((tool) => tool !== 'comparison')}
            showComparison={comparisonEnabled}
            showReports={reportsEnabled}
          />
        );
      case 'students':
        return (
          <StudentsView
            patients={patients}
            visitTasks={visitTasks}
            selectedPatient={selectedPatient}
            onSelectPatient={(patient) => {
              setSelectedPatient(patient);
              setCurrentPatient(patient);
            }}
            onOpenScreening={(patient) => {
              navigateToScreening(patient);
              setAssessmentStage('overview');
            }}
            onOpenReports={(patient) => {
              setSelectedPatient(patient);
              setCurrentPatient(patient);
              handleOpenReports();
            }}
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
      case 'alerts':
        return (
          <AlertsView
            visitTasks={visitTasks}
            onSelectPatient={handleSelectPatient}
            onOpenHistory={handleOpenPatientHistory}
            onStartEvaluation={handleStartEvaluation}
            canOpenHistory={reportsEnabled}
          />
        );
      case 'organization':
        return (
          <OrganizationView
            sessions={sessions}
            assessments={assessments}
            visitTasks={visitTasks}
            onOpenSettings={() => settingsEnabled && setShowDataSettings(true)}
          />
        );
      default:
        return null;
    }
  };

  const showPatientHeader = activeCenter === 'screening' && !!selectedPatient;
  const showWorkspaceToolbar = activeCenter === 'screening' && assessmentStage === 'workspace' && !!selectedPatient;

  return (
    <div className="mesh-gradient flex h-screen overflow-hidden text-slate-900">
      <HubSidebar
        activeId={activeCenter}
        onSelect={(id) => {
          if (allowedCenters.includes(id as CenterId)) {
            setActiveCenter(id as CenterId);
            if (id !== 'screening') {
              setAssessmentStage('overview');
            }
          }
        }}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        onSettingsClick={() => settingsEnabled && setShowDataSettings(true)}
        visibleItemIds={allowedCenters}
        showSettings={settingsEnabled}
      />

      <main className={cn('relative flex min-w-0 flex-1 flex-col')}>
        {showPatientHeader && selectedPatient ? (
          <PatientHeaderBar
            name={getPatientDisplayName(selectedPatient)}
            avatar={getPatientAvatar(selectedPatient)}
            meta={`第 ${Math.max(getPatientSessions(selectedPatient.id).length, 1)} 次筛查 · 最近更新 ${new Date(selectedPatient.updatedAt).toLocaleDateString('zh-CN')}`}
            onBack={assessmentStage === 'workspace' ? handleBackFromWorkspace : handleBackFromToolbox}
            onSettings={() => settingsEnabled && setShowDataSettings(true)}
          />
        ) : null}

        <div className={cn('flex-1 min-h-0 overflow-hidden', showWorkspaceToolbar && 'pb-20')}>
          {renderCenterContent()}
        </div>

        {showWorkspaceToolbar ? (
          <WorkspaceToolbar
            activeTool={activePlugin}
            onSelectTool={(toolId) => handleToolSelectFromToolbox(toolId)}
            visibleToolIds={allowedTools}
          />
        ) : null}
      </main>

      <NewSessionModal
        isOpen={showNewSessionModal}
        onClose={() => setShowNewSessionModal(false)}
        onStartSession={handleStartNewPatient}
      />
      <PatientSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectPatient={(patient) => {
          handleSelectPatient(patient);
          setShowSearchModal(false);
        }}
      />
      <DataSettingsModal
        isOpen={showDataSettings}
        onClose={() => setShowDataSettings(false)}
      />
    </div>
  );
};
