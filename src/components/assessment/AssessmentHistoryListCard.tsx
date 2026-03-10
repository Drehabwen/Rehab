import React from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
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
  const cardClass = cn(
    'rounded-20 border p-4 transition-all',
    isCurrent
      ? 'border-blue-500 bg-blue-50 shadow-sm'
      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]',
  );

  return (
    <div className={cardClass}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <Badge variant="info" className="mb-2">
            {getAssessmentTypeLabel(record.assessmentType)}
          </Badge>
          <p className="text-sm text-slate-600">{formatDate(record.timestamp)}</p>
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
            variant="danger"
            size="sm"
            className="flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </Button>
        </div>
      </div>

      {record.imageData ? (
        <div className="mb-3 aspect-video overflow-hidden rounded-xl bg-slate-100">
          <img
            src={record.imageData}
            alt={`评估图像 - ${record.id}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      {record.metrics && Object.keys(record.metrics).length > 0 ? (
        <div className="space-y-1">
          <p className="mb-1 text-xs font-semibold text-slate-700">关键指标</p>
          {Object.entries(record.metrics).slice(0, 3).map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs text-slate-600">
              <span>{key}:</span>
              <span className="font-semibold">
                {typeof value === 'number' ? value.toFixed(1) : String(value)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {record.feedback ? (
        <div className="mt-2 border-t border-slate-200 pt-2">
          <p className="text-xs text-slate-600">
            <strong>反馈：</strong>
            {record.feedback}
          </p>
        </div>
      ) : null}

      {record.improvement !== undefined ? (
        <Badge variant={record.improvement > 0 ? 'success' : 'warning'} className="mt-2">
          {record.improvement > 0
            ? `改善 ${record.improvement}%`
            : `下降 ${Math.abs(record.improvement)}%`}
        </Badge>
      ) : null}
    </div>
  );
};
