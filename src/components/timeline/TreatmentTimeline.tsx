import React, { useMemo } from 'react';
import {
  Activity,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssessmentRecordStore } from '../../store/useAssessmentRecordStore';
import { useTreatmentPlanStore } from '../../store/useTreatmentPlanStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export const TreatmentTimeline: React.FC = () => {
  const { records, setCurrentRecord } = useAssessmentRecordStore();
  const { versions, setCurrentVersion } = useTreatmentPlanStore();

  const timelineData = useMemo(() => {
    const assessmentRecords = records.map((record) => ({
      id: record.id,
      timestamp: record.timestamp,
      type: 'assessment' as const,
      data: record,
    }));

    const treatmentRecords = versions.map((version) => ({
      id: version.id,
      timestamp: version.createdAt,
      type: 'treatment' as const,
      data: version,
    }));

    return [...assessmentRecords, ...treatmentRecords].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [records, versions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'assessment':
        return <Activity className="h-5 w-5" />;
      case 'treatment':
        return <FileText className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getRecordTypeLabel = (type: string) => {
    switch (type) {
      case 'assessment':
        return '评估';
      case 'treatment':
        return '治疗计划';
      default:
        return '记录';
    }
  };

  const getAssessmentTypeLabel = (type: string) => {
    const labels = {
      front: '正面',
      side: '侧面',
      back: '背面',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getImprovementBadge = (record: any) => {
    if (record.type !== 'assessment') return null;

    const improvement = record.data.improvement;
    if (improvement === undefined) return null;

    if (improvement > 0) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          改善 {improvement}%
        </Badge>
      );
    }

    if (improvement < 0) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          下降 {Math.abs(improvement)}%
        </Badge>
      );
    }

    return null;
  };

  const handleViewDetails = (record: any) => {
    if (record.type === 'assessment') {
      setCurrentRecord(record.id);
    } else if (record.type === 'treatment') {
      setCurrentVersion(record.id);
    }
  };

  const recordShellClass = 'rounded-20 border border-slate-200 bg-white p-4 transition-shadow hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>治疗时间线</CardTitle>
      </CardHeader>
      <CardContent>
        {timelineData.length === 0 ? (
          <div className="state-panel">
            <Calendar className="mx-auto mb-4 h-16 w-16 opacity-50" />
            <p>暂无治疗记录</p>
            <p className="mt-2 text-sm">开始评估和治疗后，这里会显示完整的时间线。</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-slate-200" />

            <div className="space-y-6">
              {timelineData.map((record) => (
                <div key={record.id} className="relative pl-12">
                  <div className="absolute left-2 h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow" />

                  <div className={recordShellClass}>
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'rounded-lg p-2',
                            record.type === 'assessment'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-emerald-100 text-emerald-600',
                          )}
                        >
                          {getRecordIcon(record.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{getRecordTypeLabel(record.type)}</h3>
                            <Badge variant="info">{formatDate(record.timestamp)}</Badge>
                          </div>
                          <p className="text-sm text-slate-600">{formatFullDate(record.timestamp)}</p>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(record)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {record.type === 'assessment' ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{getAssessmentTypeLabel(record.data.assessmentType)}</Badge>
                          {getImprovementBadge(record)}
                        </div>

                        {record.data.imageData ? (
                          <div className="aspect-video overflow-hidden rounded-xl bg-slate-100">
                            <img
                              src={record.data.imageData}
                              alt={`评估图像 - ${record.id}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : null}

                        {record.data.metrics && Object.keys(record.data.metrics).length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            {Object.entries(record.data.metrics).slice(0, 4).map(([key, value]) => (
                              <div key={key} className="rounded-xl bg-slate-50 p-2">
                                <p className="text-xs text-slate-600">{key}</p>
                                <p className="text-sm font-semibold">
                                  {typeof value === 'number' ? value.toFixed(2) : value}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {record.data.feedback ? (
                          <div className="semantic-panel-soft semantic-panel-soft-info">
                            <p className="text-sm text-slate-700">
                              <strong>反馈：</strong>
                              {record.data.feedback}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="success">版本 {record.data.version}</Badge>
                          {record.data.isCurrent ? <Badge variant="primary">当前版本</Badge> : null}
                        </div>

                        {record.data.tags?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {record.data.tags.map((tag: string, tagIndex: number) => (
                              <Badge key={`${tag}-${tagIndex}`} variant="default" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        <div className="semantic-panel-soft semantic-panel-soft-success">
                          <p className="line-clamp-3 text-sm text-slate-700">
                            {record.data.content.substring(0, 200)}
                            {record.data.content.length > 200 ? '...' : ''}
                          </p>
                        </div>

                        {record.data.assessmentId ? (
                          <div className="text-xs text-slate-500">
                            关联评估 ID: {record.data.assessmentId}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
