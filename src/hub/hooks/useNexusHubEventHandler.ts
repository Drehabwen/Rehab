import { useCallback } from 'react';
import type { Patient } from '@/types/patient';
import type { ViewMode } from '../types';

interface UseNexusHubEventHandlerProps {
  setView: (view: ViewMode) => void;
  setActivePlugin: (plugin: 'vision3' | 'medvoice' | 'reports' | 'datacenter') => void;
  setSelectedPatient: (patient: Patient | null) => void;
  setShowNewSessionModal: (show: boolean) => void;
  setShowSearchModal: (show: boolean) => void;
  setShowDataSettings: (show: boolean) => void;
  addPatient: (name?: string) => Promise<Patient>;
  getPatientSessions: (patientId: string) => any[];
}

export const useNexusHubEventHandler = ({
  setView,
  setActivePlugin,
  setSelectedPatient,
  setShowNewSessionModal,
  setShowSearchModal,
  setShowDataSettings,
  addPatient,
  getPatientSessions
}: UseNexusHubEventHandlerProps) => {
  const handleSelectPatient = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setView('toolbox');
  }, [setSelectedPatient, setView]);

  const handleToolSelectFromToolbox = useCallback((toolId: string) => {
    setActivePlugin(toolId as 'vision3' | 'medvoice');
    setView('workspace');
  }, [setActivePlugin, setView]);

  const handleBackFromToolbox = useCallback(() => {
    setView('dashboard');
    setSelectedPatient(null);
  }, [setView, setSelectedPatient]);

  const handleBackFromWorkspace = useCallback(() => {
    setView('toolbox');
  }, [setView]);

  const handleSelectTool = useCallback((tool: 'vision3' | 'medvoice' | 'reports' | 'datacenter') => {
    setActivePlugin(tool);
  }, [setActivePlugin]);

  const handleBackToDashboard = useCallback(() => {
    setView('dashboard');
    setSelectedPatient(null);
  }, [setView, setSelectedPatient]);

  const handleStartNewPatient = useCallback(async (name?: string) => {
    const newPatient = await addPatient(name);
    setSelectedPatient(newPatient);
    setView('toolbox');
    setShowNewSessionModal(false);
  }, [addPatient, setSelectedPatient, setView, setShowNewSessionModal]);

  const handleSidebarSelect = useCallback((id: string) => {
    if (id === 'datacenter') {
      setView('workspace');
      setActivePlugin('datacenter');
      setSelectedPatient(null);
    } else if (id === 'vision3') {
      setView('workspace');
      setActivePlugin('vision3');
    }
  }, [setView, setActivePlugin, setSelectedPatient]);

  return {
    handleSelectPatient,
    handleToolSelectFromToolbox,
    handleBackFromToolbox,
    handleBackFromWorkspace,
    handleSelectTool,
    handleBackToDashboard,
    handleStartNewPatient,
    handleSidebarSelect
  };
};
