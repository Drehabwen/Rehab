import React, { useState, useEffect, useCallback } from 'react';
import { HubSidebar } from './components/HubSidebar';
import { Bell, Search, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Vision3Plugin } from '@/plugins/vision3/Vision3Plugin';
import { MedVoicePlugin } from '@/plugins/medvoice/MedVoicePlugin';
import { NexusReportCenter } from './components/NexusReportCenter';
import { GlobalExport } from '@/components/GlobalExport';
import { NewSessionModal } from './components/NewSessionModal';
import { PatientSearchModal } from './components/PatientSearchModal';
import { DataSettingsModal } from './components/DataSettingsModal';
import { PatientToolbox } from './components/PatientToolbox';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { PatientHeader } from './components/PatientHeader';
import { DashboardView } from './components/DashboardView';
import { DataCenterHeader } from './components/DataCenterHeader';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { usePatientList } from './hooks/usePatientList';
import { useNexusHubEventHandler } from './hooks/useNexusHubEventHandler';
import type { Patient } from '@/types/patient';
import type { PatientStatus, ViewMode } from './types';

const getStatusLabel = (status: PatientStatus) => {
  const labels = {
    pending: '待接诊',
    assessing: '评估中',
    report: '待报告',
    completed: '已完成'
  };
  return labels[status];
};

const getStatusColor = (status: PatientStatus) => {
  const colors = {
    pending: 'bg-slate-100 text-slate-600',
    assessing: 'bg-blue-50 text-blue-600',
    report: 'bg-amber-50 text-amber-600',
    completed: 'bg-emerald-50 text-emerald-600'
  };
  return colors[status];
};

const renderWorkspaceContent = (activePlugin: 'vision3' | 'medvoice' | 'reports' | 'datacenter') => {
  switch (activePlugin) {
    case 'vision3':
      return <Vision3Plugin />;
    case 'medvoice':
      return <MedVoicePlugin />;
    case 'reports':
      return <NexusReportCenter />;
    case 'datacenter':
      return <NexusReportCenter />;
    default:
      return <Vision3Plugin />;
  }
};

export const NexusHub: React.FC = () => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [activePlugin, setActivePlugin] = useState<'vision3' | 'medvoice' | 'reports' | 'datacenter'>('vision3');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);
  
  const { patients, loadPatients, addPatient } = usePatientStore();
  const { loadSessions, getPatientSessions } = useSessionStore();
  
  useEffect(() => {
    loadPatients();
    loadSessions();
  }, [loadPatients, loadSessions]);

  const { patientsWithStatus, stats, getPatientLabel } = usePatientList({
    patients,
    getPatientSessions
  });

  const {
    handleSelectPatient,
    handleToolSelectFromToolbox,
    handleBackFromToolbox,
    handleBackFromWorkspace,
    handleSelectTool,
    handleBackToDashboard,
    handleStartNewPatient,
    handleSidebarSelect
  } = useNexusHubEventHandler({
    setView,
    setActivePlugin,
    setSelectedPatient,
    setShowNewSessionModal,
    setShowSearchModal,
    setShowDataSettings,
    addPatient,
    getPatientSessions
  });

  const handleSidebarSelectWrapped = useCallback((id: string) => {
    if (id === 'datacenter') {
      setView('workspace');
      setActivePlugin('datacenter');
      setSelectedPatient(null);
    } else if (id === 'vision3') {
      setView('workspace');
      setActivePlugin('vision3');
    }
  }, [setView, setActivePlugin, setSelectedPatient]);

  return (
    <div className="flex h-screen mesh-gradient font-sans text-slate-900 overflow-hidden">
      {view === 'dashboard' && (
        <HubSidebar 
          activeId="dashboard" 
          onSelect={handleSidebarSelectWrapped}
          isCollapsed={isCollapsed} 
          onToggle={() => setIsCollapsed(!isCollapsed)}
          onSettingsClick={() => setShowDataSettings(true)}
        />
      )}
      
      <main className={cn("flex-1 flex flex-col min-w-0 relative", (view === 'workspace' || view === 'toolbox') && "w-full")}>
        {(view === 'workspace' || view === 'toolbox') && selectedPatient && (
          <PatientHeader 
            view={view}
            patient={selectedPatient}
            sessionCount={getPatientSessions(selectedPatient.id).length + 1}
            onBack={view === 'workspace' ? handleBackFromWorkspace : handleBackFromToolbox}
            onSettingsClick={() => setShowDataSettings(true)}
          />
        )}
        
        <header className={cn(
          "h-20 border-b border-slate-200/60 bg-white/40 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-10",
          view === 'workspace' && "hidden"
        )}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-antey-primary animate-pulse shadow-[0_0_8px_rgba(13,148,136,0.5)]" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                Nexus / {view === 'dashboard' ? '患者管理' : '工作台'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-antey-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="搜索患者..." 
                className="bg-white/50 border border-slate-200/50 rounded-2xl py-2.5 pl-12 pr-6 text-sm w-80 focus:ring-4 focus:ring-antey-primary/5 focus:bg-white focus:border-antey-primary/20 transition-all outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <GlobalExport />
              <button className="relative p-2.5 text-slate-500 hover:bg-white hover:shadow-sm rounded-xl transition-all group">
                <Bell size={20} className="group-hover:scale-110 transition-transform" />
                <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="p-2.5 text-slate-500 hover:bg-white hover:shadow-sm rounded-xl transition-all group">
                <Calendar size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-black text-slate-900 leading-none mb-1">李德胜 医生</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">高级康复专家</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-antey-primary to-blue-600 p-0.5 shadow-lg shadow-antey-primary/20 hover:scale-105 transition-transform cursor-pointer">
                <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-[10px] font-black text-antey-primary">
                  DR
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {view === 'dashboard' && (
            <DashboardView 
              patients={patients}
              patientsWithStatus={patientsWithStatus}
              stats={stats}
              getPatientLabel={getPatientLabel}
              getStatusLabel={getStatusLabel}
              getStatusColor={getStatusColor}
              onSelectPatient={handleSelectPatient}
              onShowNewSession={() => setShowNewSessionModal(true)}
              onShowSearch={() => setShowSearchModal(true)}
            />
          )}

          {(view === 'workspace' || view === 'toolbox') && selectedPatient && (
            <>
              <div className="h-full pt-4 pb-20">
                {view === 'toolbox' ? (
                  <PatientToolbox 
                    patient={selectedPatient}
                    onSelectTool={handleToolSelectFromToolbox}
                    onBack={handleBackFromToolbox}
                    sessionCount={getPatientSessions(selectedPatient.id).length}
                  />
                ) : (
                  renderWorkspaceContent(activePlugin)
                )}
              </div>
              
              {view === 'workspace' && (
                <WorkspaceToolbar 
                  activeTool={activePlugin}
                  onSelectTool={handleSelectTool}
                />
              )}
            </>
          )}
          
          {view === 'workspace' && !selectedPatient && activePlugin === 'datacenter' && (
            <>
              <DataCenterHeader 
                onBack={handleBackToDashboard}
                onSettingsClick={() => setShowDataSettings(true)}
              />
              
              <div className="h-full pt-4">
                {renderWorkspaceContent(activePlugin)}
              </div>
              
              <WorkspaceToolbar 
                activeTool={activePlugin}
                onSelectTool={handleSelectTool}
              />
            </>
          )}
        </div>

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
