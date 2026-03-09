import React from 'react';
import { CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Upload, Download } from 'lucide-react';

interface AssessmentHistoryListHeaderProps {
  onImport: () => void;
  onExport: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AssessmentHistoryListHeader: React.FC<AssessmentHistoryListHeaderProps> = ({
  onImport,
  onExport,
  fileInputRef,
  onFileChange,
}) => {
  return (
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle>评估历史</CardTitle>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          <Button
            onClick={onImport}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            导入
          </Button>
          <Button
            onClick={onExport}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
        </div>
      </div>
    </CardHeader>
  );
};
