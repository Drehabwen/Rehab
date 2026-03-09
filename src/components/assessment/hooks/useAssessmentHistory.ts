import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAssessmentRecordStore } from '../../../store/useAssessmentRecordStore';
import { AssessmentRecordStorage } from '../../../utils/assessmentRecordStorage';
import { APP_CONFIG } from '../../../config/appConfig';
import type { AssessmentRecord } from '../../../types/assessment';

export interface StorageInfo {
  used: number;
  count: number;
  available: boolean;
  warningLevel: 'normal' | 'warning' | 'critical';
  usedPercentage: number;
}

export type ImportStatus = 'idle' | 'success' | 'error';

export const useAssessmentHistory = () => {
  const {
    records,
    currentRecord,
    deleteRecord,
    setCurrentRecord,
  } = useAssessmentRecordStore();

  const [filterType, setFilterType] = useState<'all' | 'front' | 'side' | 'back'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    used: 0,
    count: 0,
    available: true,
    warningLevel: 'normal',
    usedPercentage: 0
  });
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const info = AssessmentRecordStorage.getStorageInfo(APP_CONFIG.CURRENT_PATIENT_ID);
    setStorageInfo(info);
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesType = filterType === 'all' || record.assessmentType === filterType;
      const matchesSearch = searchTerm === '' || 
        record.id.includes(searchTerm) ||
        record.feedback?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [records, filterType, searchTerm]);

  const handleExport = useCallback(() => {
    const data = AssessmentRecordStorage.exportData(APP_CONFIG.CURRENT_PATIENT_ID);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment_records_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('idle');
    setErrorMessage('');

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          
          if (!content || content.trim().length === 0) {
            setImportStatus('error');
            setErrorMessage('文件内容为空');
            return;
          }

          let data;
          try {
            data = JSON.parse(content);
          } catch (parseError) {
            setImportStatus('error');
            setErrorMessage('文件格式错误，请确保是有效的 JSON 文件');
            return;
          }

          if (!data.records || !Array.isArray(data.records)) {
            setImportStatus('error');
            setErrorMessage('文件格式不正确，缺少 records 字段');
            return;
          }

          const success = AssessmentRecordStorage.importData(content, APP_CONFIG.CURRENT_PATIENT_ID);
          
          if (success) {
            setImportStatus('success');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            setImportStatus('error');
            setErrorMessage('导入失败，请检查文件格式');
          }
        } catch (error) {
          console.error('导入失败:', error);
          setImportStatus('error');
          setErrorMessage(error instanceof Error ? error.message : '导入失败，请检查文件格式');
        }
      };
      
      reader.onerror = () => {
        setImportStatus('error');
        setErrorMessage('文件读取失败');
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('导入失败:', error);
      setImportStatus('error');
      setErrorMessage('导入失败，请检查文件格式');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClearRecords = useCallback(() => {
    if (confirm('确定要清空所有评估记录吗？此操作不可恢复。')) {
      useAssessmentRecordStore.getState().clearRecords();
    }
  }, []);

  return {
    records,
    currentRecord,
    filteredRecords,
    filterType,
    setFilterType,
    searchTerm,
    setSearchTerm,
    storageInfo,
    importStatus,
    errorMessage,
    fileInputRef,
    deleteRecord,
    setCurrentRecord,
    handleExport,
    handleImport,
    handleFileChange,
    handleClearRecords,
  };
};
