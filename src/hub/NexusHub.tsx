﻿import React, { useEffect, useState } from 'react';
import { Database, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HubSidebar } from './components/HubSidebar';

import { Vision3Plugin } from '@/plugins/vision3/Vision3Plugin';
import { MedVoicePlugin } from '@/plugins/medvoice/MedVoicePlugin';
import { ROMPlugin } from '@/plugins/rom/ROMPlugin';
import { NexusReportCenter } from './components/NexusReportCenter';
import { NewSessionModal } from './components/NewSessionModal';
import { PatientSearchModal } from './components/PatientSearchModal';
import { DataSettingsModal } from './components/DataSettingsModal';
import { PatientToolbox } from './components/PatientToolbox';
import { ProgressComparison } from './components/ProgressComparison';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { DashboardView } from './views/DashboardView';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { usePatientList } from './hooks/usePatientList';
import type { Patient } from '@/types/patient';
import type { ViewMode } from './types';
import { getPatientAvatar, getPatientDisplayName } from '@/lib/patient-utils';
import { PatientHeaderBar, StatePanel } from '@/components/layout';

export const NexusHub: React.FC = () => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [activePlugin, setActivePlugin] = useState<'vision3' | 'medvoice' | 'reports' | 'datacenter' | 'comparison' | 'rom'>('vision3');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);

  const { patients, loadPatients, setCurrentPatient } = usePatientStore();
  const { loadSessions, getPatientSessions } = useSessionStore();

  useEffect(() => {
    loadPatients();
    loadSessions();
  }, [loadPatients, loadSessions]);

  const { patientsWithStatus, stats, getPatientLabel } = usePatientList({
    patients,
    getPatientSessions,
  });

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentPatient(patient);
    setView('toolbox');
  };

  const handleToolSelectFromToolbox = (toolId: string) => {
    setActivePlugin(toolId as 'vision3' | 'medvoice' | 'comparison' | 'rom');
    setView('workspace');
  };

  const handleBackFromToolbox = () => {
    setView('dashboard');
    setSelectedPatient(null);
    setCurrentPatient(null);
  };

  const handleBackFromWorkspace = () => {
    setView('toolbox');
  };

  const handleSelectTool = (tool: 'vision3' | 'medvoice' | 'reports' | 'datacenter' | 'comparison' | 'rom') => {
    setActivePlugin(tool);
    if (!selectedPatient && tool !== 'datacenter' && tool !== 'reports') {
      setView('dashboard');
    }
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setSelectedPatient(null);
    setCurrentPatient(null);
  };

  const handleStartNewPatient = async (patientId: string) => {
    await loadPatients();
    const newPatient = usePatientStore.getState().getPatientById(patientId);
    if (newPatient) {
      setSelectedPatient(newPatient);
      setCurrentPatient(newPatient);
      setView('toolbox');
    }
    setShowNewSessionModal(false);
  };

  const renderWorkspaceContent = () => {
    switch (activePlugin) {
      case 'vision3':
        return <Vision3Plugin />;
      case 'medvoice':
        return <MedVoicePlugin />;
      case 'rom':
        return <ROMPlugin />;
      case 'reports':
        return <NexusReportCenter mode="reports" />;
      case 'datacenter':
        return <NexusReportCenter mode="datacenter" />;
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
                actions={
                  <>
                    <button className="btn-primary" onClick={handleBackToDashboard}>去完成首次评估</button>
                    <button className="btn-secondary" onClick={() => { setActivePlugin('reports'); setView('workspace'); }}>查看历史记录</button>
                  </>
                }
              />
            </div>
          </div>
        );
      default:
        return <Vision3Plugin />;
    }
  };

  const showSidebar = view === 'dashboard' || (!selectedPatient && view === 'workspace');
  const showPatientHeader = (view === 'workspace' || view === 'toolbox') && !!selectedPatient;
  const showCenterHeader = view === 'workspace' && !selectedPatient && (activePlugin === 'datacenter' || activePlugin === 'reports');

  return (
    <div className="flex h-screen mesh-gradient text-slate-900 overflow-hidden">
      {showSidebar ? (
        <HubSidebar
          activeId={view === 'dashboard' ? 'dashboard' : 'datacenter'}
          onSelect={(id) => {
            if (id === 'dashboard') {
              handleBackToDashboard();
            }
            if (id === 'datacenter') {
              setView('workspace');
              setActivePlugin('datacenter');
              setSelectedPatient(null);
            }
          }}
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
          onSettingsClick={() => setShowDataSettings(true)}
        />
      ) : null}

      <main className={cn('flex-1 min-w-0 flex flex-col relative')}>
        {showPatientHeader && selectedPatient ? (
          <PatientHeaderBar
            name={getPatientDisplayName(selectedPatient)}
            avatar={getPatientAvatar(selectedPatient)}
            meta={`第 ${getPatientSessions(selectedPatient.id).length + 1} 次接诊 · 最近更新 ${new Date(selectedPatient.updatedAt).toLocaleDateString('zh-CN')}`}
            onBack={view === 'workspace' ? handleBackFromWorkspace : handleBackFromToolbox}
            onSettings={() => setShowDataSettings(true)}
          />
        ) : null}

        {view === 'dashboard' ? (
          <header className="h-14 px-4 md:px-8 border-b border-slate-200 bg-white/90 flex items-center justify-between">
            <div className="text-sm text-slate-500">康复评估系统</div>
            <button onClick={() => setIsCollapsed((v) => !v)} className="btn-icon md:hidden" aria-label="menu">
              <Menu size={18} />
            </button>
          </header>
        ) : null}

        {showCenterHeader ? (
          <div className="patient-header-bar px-6 md:px-8">
            <div className="h-full max-w-[1600px] mx-auto flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-900">
                  {activePlugin === 'reports' ? '报告中心' : '数据中心'}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {activePlugin === 'reports' ? '查看报告状态与导出入口' : '高密度列表查看评估记录'}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowDataSettings(true)}>
                <Database size={16} />
              </button>
            </div>
          </div>
        ) : null}

        <div className={cn('flex-1 min-h-0 overflow-hidden', (view === 'workspace' || view === 'toolbox') && 'pb-20')}>
          {view === 'dashboard' ? (
            <DashboardView
              patients={patients}
              patientsWithStatus={patientsWithStatus}
              stats={stats}
              onSelectPatient={handleSelectPatient}
              onNewPatient={() => setShowNewSessionModal(true)}
              onSearchPatient={() => setShowSearchModal(true)}
              getPatientLabel={getPatientLabel}
              getPatientSessions={getPatientSessions}
            />
          ) : null}

          {(view === 'workspace' || view === 'toolbox') && selectedPatient ? (
            view === 'toolbox' ? (
              <PatientToolbox
                patient={selectedPatient}
                onSelectTool={handleToolSelectFromToolbox}
                onBack={handleBackFromToolbox}
                sessionCount={getPatientSessions(selectedPatient.id).length}
              />
            ) : (
              <div className="h-full">{renderWorkspaceContent()}</div>
            )
          ) : null}

          {view === 'workspace' && !selectedPatient && (activePlugin === 'datacenter' || activePlugin === 'reports') ? (
            <div className="h-full">{renderWorkspaceContent()}</div>
          ) : null}
        </div>

        {view === 'workspace' ? (
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
      </main>
    </div>
  );
};
