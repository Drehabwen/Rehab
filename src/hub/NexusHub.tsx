import React, { useState, useEffect } from 'react';
import { HubSidebar } from './components/HubSidebar';
import { Bell, Search, Calendar, ChevronLeft, User, Settings, Database, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Vision3Plugin } from '@/plugins/vision3/Vision3Plugin';
import { MedVoicePlugin } from '@/plugins/medvoice/MedVoicePlugin';
import { ROMPlugin } from '@/plugins/rom/ROMPlugin';
import { NexusReportCenter } from './components/NexusReportCenter';
import { GlobalExport } from '@/components/GlobalExport';
import { NewSessionModal } from './components/NewSessionModal';
import { PatientSearchModal } from './components/PatientSearchModal';
import { DataSettingsModal } from './components/DataSettingsModal';
import { PatientToolbox } from './components/PatientToolbox';
import { PatientWorkspace } from './components/PatientWorkspace';
import { ProgressComparison } from './components/ProgressComparison';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import { DashboardView } from './views/DashboardView';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { usePatientList } from './hooks/usePatientList';
import type { Patient } from '@/types/patient';
import type { ViewMode } from './types';

export const NexusHub: React.FC = () => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [activePlugin, setActivePlugin] = useState<'vision3' | 'medvoice' | 'reports' | 'datacenter' | 'comparison' | 'rom'>('vision3');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);
  
  const { patients, loadPatients, addPatient, setCurrentPatient } = usePatientStore();
  const { loadSessions, getPatientSessions } = useSessionStore();
  
  useEffect(() => {
    loadPatients();
    loadSessions();
  }, [loadPatients, loadSessions]);

  const { patientsWithStatus, stats, getPatientLabel } = usePatientList({
    patients,
    getPatientSessions
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
        return <NexusReportCenter />;
      case 'datacenter':
        return <NexusReportCenter />;
      case 'comparison':
        return selectedPatient ? (
          <ProgressComparison
            patientId={selectedPatient.id}
            patientName={selectedPatient.name}
            onBack={handleBackFromWorkspace}
          />
        ) : null;
      default:
        return <Vision3Plugin />;
    }
  };

  return (
    <div className="flex h-screen mesh-gradient font-sans text-slate-900 overflow-hidden">
      {view === 'dashboard' && (
        <HubSidebar 
          activeId="dashboard" 
          onSelect={(id) => {
            if (id === 'datacenter') {
              setView('workspace');
              setActivePlugin('datacenter');
              setSelectedPatient(null);
            } else if (id === 'vision3') {
              setView('workspace');
              setActivePlugin('vision3');
            }
          }} 
          isCollapsed={isCollapsed} 
          onToggle={() => setIsCollapsed(!isCollapsed)}
          onSettingsClick={() => setShowDataSettings(true)}
        />
      )}
      
      <main className={cn("flex-1 flex flex-col min-w-0 relative", (view === 'workspace' || view === 'toolbox') && "w-full")}>
        {(view === 'workspace' || view === 'toolbox') && selectedPatient && (
          <div className="absolute top-0 left-0 right-0 z-20">
            <div className="bg-white/60 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={view === 'workspace' ? handleBackFromWorkspace : handleBackFromToolbox}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <ChevronLeft size={18} className="text-slate-600" />
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <User size={18} className="text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black">
                          {selectedPatient.id}
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {selectedPatient.name || '匿名患者'}
                        </span>
                      </div>
                      <div className="text-[10px] font-medium text-slate-400">
                        {view === 'toolbox' ? '工具箱' : `第 ${getPatientSessions(selectedPatient.id).length + 1} 次接诊`}
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowDataSettings(true)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <Settings size={18} className="text-slate-500" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        <header className={cn(
          "h-20 border-b border-slate-200/60 bg-white/40 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-10",
          view === 'workspace' && "hidden"
        )}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
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
              onSelectPatient={handleSelectPatient}
              onNewPatient={() => setShowNewSessionModal(true)}
              onSearchPatient={() => setShowSearchModal(true)}
              getPatientLabel={getPatientLabel}
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
                  renderWorkspaceContent()
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
              <div className="absolute top-0 left-0 right-0 z-20">
                <div className="bg-white/60 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={handleBackToDashboard}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <ChevronLeft size={18} className="text-slate-600" />
                      </button>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                          <Database size={18} className="text-emerald-500" />
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-900">数据与报告中心</span>
                          <div className="text-[10px] font-medium text-slate-400">
                            查看所有评估记录
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setShowDataSettings(true)}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      <Settings size={18} className="text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="h-full pt-4">
                {renderWorkspaceContent()}
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
