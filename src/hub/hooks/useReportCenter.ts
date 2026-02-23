import { useState, useEffect, useRef } from 'react';
import { PostureReport } from '@/store/useMeasurementStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { usePatientStore } from '@/store/usePatientStore';
import type { Assessment } from '@/types/assessment';
import type { Patient } from '@/types/patient';

export interface UseReportCenterReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  selectedReportHtml: string | null;
  setSelectedReportHtml: (html: string | null) => void;
  selectedReport: PostureReport | null;
  setSelectedReport: (report: PostureReport | null) => void;
  selectedAssessment: Assessment | null;
  setSelectedAssessment: (assessment: Assessment | null) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  reportContainerRef: React.RefObject<HTMLDivElement>;
  patients: Patient[];
  assessments: Assessment[];
  filteredPatients: Patient[];
  filteredAssessments: Assessment[];
  stats: Array<{
    label: string;
    value: number;
    icon: string;
    color: string;
    bg: string;
  }>;
  exportToJson: (assessment: Assessment) => void;
  exportToCsv: (assessment: Assessment) => void;
}

export const useReportCenter = (): UseReportCenterReturn => {
  const { 
    assessments, 
    loadAssessments, 
    loadAssessmentsByPatient
  } = useAssessmentStore();
  
  const { 
    patients, 
    loadPatients
  } = usePatientStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedReportHtml, setSelectedReportHtml] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<PostureReport | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPatients();
    loadAssessments();
  }, [loadPatients, loadAssessments]);

  useEffect(() => {
    if (selectedPatientId) {
      loadAssessmentsByPatient(selectedPatientId);
    }
  }, [selectedPatientId, loadAssessmentsByPatient]);

  const filteredPatients = patients.filter((p: Patient) => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssessments = selectedPatientId 
    ? assessments.filter((a: Assessment) => a.patientId === selectedPatientId)
    : assessments;

  const stats = [
    { label: '总评估数', value: assessments.length, icon: 'Database', color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '患者总数', value: patients.length, icon: 'User', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: '本周新增', value: assessments.filter((a: Assessment) => Date.now() - a.createdAt < 7 * 24 * 60 * 60 * 1000).length, icon: 'Activity', color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  const exportToJson = (assessment: Assessment) => {
    const dataStr = JSON.stringify(assessment, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${assessment.id}-${new Date(assessment.createdAt).toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCsv = (assessment: Assessment) => {
    if (!assessment.data.posture?.metrics) return;
    
    const metrics = assessment.data.posture.metrics;
    const rows = Object.entries(metrics).map(([key, value]) => [key, value]);
    const csvContent = 'metric,value\n' + rows.map(r => r.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${assessment.id}-${new Date(assessment.createdAt).toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedPatientId,
    setSelectedPatientId,
    selectedReportHtml,
    setSelectedReportHtml,
    selectedReport,
    setSelectedReport,
    selectedAssessment,
    setSelectedAssessment,
    isFullscreen,
    setIsFullscreen,
    reportContainerRef,
    patients,
    assessments,
    filteredPatients,
    filteredAssessments,
    stats,
    exportToJson,
    exportToCsv
  };
};
