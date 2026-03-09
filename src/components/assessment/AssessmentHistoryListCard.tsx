import React from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Eye, Trash2 } from 'lucide-react';
import { formatDate, getAssessmentTypeLabel } from './utils/assessmentHistoryUtils';
import type { AssessmentRecord } from '../../types/assessment';

interface AssessmentHistoryListCardProps {
  record: AssessmentRecord;
  isCurrent: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

export const AssessmentHistoryListCard: React.FC<AssessmentHistoryListCardProps> = ({
  record,
  isCurrent,
  onView,
  onDelete,
}) => {
  return (
    <div
      className={`border rounded-lg p-4 transition-all hover:shadow-lg ${
        isCurrent
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <Badge variant="info" className="mb-2">
            {getAssessmentTypeLabel(record.assessmentType)}
          </Badge>
          <p className="text-sm text-gray-600">
            {formatDate(record.timestamp)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => onView(record.id)}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            查看
          </Button>
          <Button
            onClick={() => onDelete(record.id)}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </Button>
        </div>
      </div>

      {record.imageData && (
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
          <img
            src={record.imageData}
            alt={`评估图像 - ${record.id}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {record.metrics && Object.keys(record.metrics).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-700 mb-1">关键指标</p>
          {Object.entries(record.metrics).slice(0, 3).map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs text-gray-600">
              <span>{key}:</span>
              <span className="font-semibold">{typeof value === 'number' ? value.toFixed(1) : String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {record.feedback && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>反馈：</strong>
            {record.feedback}
          </p>
        </div>
      )}

      {record.improvement !== undefined && (
        <Badge variant={record.improvement > 0 ? 'success' : 'warning'} className="mt-2">
          {record.improvement > 0 ? `改善 ${record.improvement}%` : `下降 ${Math.abs(record.improvement)}%`}
        </Badge>
      )}
    </div>
  );
};
