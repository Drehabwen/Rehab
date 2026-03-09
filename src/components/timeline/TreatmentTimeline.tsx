import React, { useMemo } from 'react';
import { useAssessmentRecordStore } from '../../store/useAssessmentRecordStore';
import { useTreatmentPlanStore } from '../../store/useTreatmentPlanStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  Activity,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronRight
} from 'lucide-react';

export const TreatmentTimeline: React.FC = () => {
  const { records, setCurrentRecord } = useAssessmentRecordStore();
  const { versions, setCurrentVersion } = useTreatmentPlanStore();

  const timelineData = useMemo(() => {
    const assessmentRecords = records.map(record => ({
      id: record.id,
      timestamp: record.timestamp,
      type: 'assessment' as const,
      data: record,
    }));

    const treatmentRecords = versions.map(version => ({
      id: version.id,
      timestamp: version.createdAt,
      type: 'treatment' as const,
      data: version,
    }));

    const allRecords = [...assessmentRecords, ...treatmentRecords];
    return allRecords.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
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
        return <Activity className="w-5 h-5" />;
      case 'treatment':
        return <FileText className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
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
          <TrendingUp className="w-3 h-3" />
          改善 {improvement}%
        </Badge>
      );
    } else if (improvement < 0) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <TrendingDown className="w-3 h-3" />
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>治疗时间线</CardTitle>
      </CardHeader>
      <CardContent>
        {timelineData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>暂无治疗记录</p>
            <p className="text-sm mt-2">开始评估和治疗后，这里会显示完整的时间线</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-6">
              {timelineData.map((record, index) => (
                <div key={record.id} className="relative pl-12">
                  <div className="absolute left-2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                  
                  <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          record.type === 'assessment' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-green-100 text-green-600'
                        }`}>
                          {getRecordIcon(record.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {getRecordTypeLabel(record.type)}
                            </h3>
                            <Badge variant="info">
                              {formatDate(record.timestamp)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatFullDate(record.timestamp)}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDetails(record)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {record.type === 'assessment' ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">
                            {getAssessmentTypeLabel(record.data.assessmentType)}
                          </Badge>
                          {getImprovementBadge(record)}
                        </div>

                        {record.data.imageData && (
                          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={record.data.imageData}
                              alt={`评估图像 - ${record.id}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {record.data.metrics && Object.keys(record.data.metrics).length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(record.data.metrics).slice(0, 4).map(([key, value]) => (
                              <div key={key} className="bg-gray-50 rounded p-2">
                                <p className="text-xs text-gray-600">{key}</p>
                                <p className="font-semibold text-sm">
                                  {typeof value === 'number' ? value.toFixed(2) : value}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {record.data.feedback && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <strong>反馈：</strong>
                              {record.data.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="success">
                            版本 {record.data.version}
                          </Badge>
                          {record.data.isCurrent && (
                            <Badge variant="primary">
                              当前版本
                            </Badge>
                          )}
                        </div>

                        {record.data.tags && record.data.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {record.data.tags.map((tag: string, tagIndex: number) => (
                              <Badge key={tagIndex} variant="default" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {record.data.content.substring(0, 200)}
                            {record.data.content.length > 200 && '...'}
                          </p>
                        </div>

                        {record.data.assessmentId && (
                          <div className="text-xs text-gray-500">
                            关联评估 ID: {record.data.assessmentId}
                          </div>
                        )}
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
