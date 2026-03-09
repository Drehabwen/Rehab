import React from 'react';
import { Button } from '../ui/Button';
import { AlertTriangle, HardDrive } from 'lucide-react';
import type { StorageInfo, ImportStatus } from './hooks/useAssessmentHistory';

interface AssessmentHistoryListStorageProps {
  storageInfo: StorageInfo;
  importStatus: ImportStatus;
  errorMessage: string;
  onClearRecords: () => void;
}

export const AssessmentHistoryListStorage: React.FC<AssessmentHistoryListStorageProps> = ({
  storageInfo,
  importStatus,
  errorMessage,
  onClearRecords,
}) => {
  return (
    <>
      {importStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>导入成功！页面即将刷新...</span>
        </div>
      )}
      
      {importStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium">导入失败</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        </div>
      )}
      
      {storageInfo.warningLevel !== 'normal' && (
        <div className={`px-4 py-3 rounded-lg flex items-center gap-3 ${
          storageInfo.warningLevel === 'critical' 
            ? 'bg-red-50 border border-red-200 text-red-700' 
            : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
        }`}>
          {storageInfo.warningLevel === 'critical' ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <HardDrive className="w-5 h-5" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {storageInfo.warningLevel === 'critical' 
                ? '存储空间已满' 
                : '存储空间不足'}
            </p>
            <p className="text-sm">
              已使用 {(storageInfo.used / 1024 / 1024).toFixed(2)}MB 
              ({storageInfo.usedPercentage.toFixed(1)}%)，
              共 {storageInfo.count} 条记录
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearRecords}
          >
            清空记录
          </Button>
        </div>
      )}
    </>
  );
};
