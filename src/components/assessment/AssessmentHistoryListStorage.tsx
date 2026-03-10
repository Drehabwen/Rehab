import React from 'react';
import { AlertTriangle, CheckCircle2, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';
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
  const warningNoticeClass = cn(
    'semantic-panel flex items-center gap-3',
    storageInfo.warningLevel === 'critical'
      ? 'semantic-panel-error'
      : 'semantic-panel-warning',
  );

  return (
    <>
      {importStatus === 'success' ? (
        <div className={cn('semantic-panel semantic-panel-success flex items-center gap-2')}>
          <CheckCircle2 className="h-5 w-5" />
          <span>导入成功，页面即将刷新。</span>
        </div>
      ) : null}

      {importStatus === 'error' ? (
        <div className={cn('semantic-panel semantic-panel-error flex items-center gap-2')}>
          <AlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">导入失败</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {storageInfo.warningLevel !== 'normal' ? (
        <div className={warningNoticeClass}>
          {storageInfo.warningLevel === 'critical' ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <HardDrive className="h-5 w-5" />
          )}
          <div className="flex-1">
            <p className="font-medium">
              {storageInfo.warningLevel === 'critical' ? '存储空间已满' : '存储空间不足'}
            </p>
            <p className="text-sm">
              已使用 {(storageInfo.used / 1024 / 1024).toFixed(2)}MB
              （{storageInfo.usedPercentage.toFixed(1)}%），共 {storageInfo.count} 条记录
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClearRecords}>
            清空记录
          </Button>
        </div>
      ) : null}
    </>
  );
};
