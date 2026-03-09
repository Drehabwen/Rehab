import React from 'react';
import { useTreatmentPlanStore } from '../../store/useTreatmentPlanStore';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { X, GitCompare, ArrowRight } from 'lucide-react';
import { TreatmentPlanVersion } from '../../types/assessment';
import * as marked from 'marked';

interface TreatmentPlanVersionCompareProps {
  assessmentId: string;
  patientId: string;
}

export const TreatmentPlanVersionCompare: React.FC<TreatmentPlanVersionCompareProps> = () => {
  const {
    versions,
    comparingVersions,
    endCompare,
  } = useTreatmentPlanStore();

  if (!comparingVersions[0] || !comparingVersions[1]) {
    return null;
  }

  const version1 = versions.find(v => v.id === comparingVersions[0]);
  const version2 = versions.find(v => v.id === comparingVersions[1]);

  if (!version1 || !version2) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const VersionCard = ({ version, label }: { version: TreatmentPlanVersion; label: string }) => (
    <Card className="flex-1">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{label}</CardTitle>
          <Badge variant="default">v{version.version}</Badge>
        </div>
        <div className="text-sm text-gray-600 mt-2">
          <div>创建时间：{formatDate(version.createdAt)}</div>
          {version.updatedAt !== version.createdAt && (
            <div>更新时间：{formatDate(version.updatedAt)}</div>
          )}
          {version.tags && version.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {version.tags.map((tag, index) => (
                <Badge key={index} variant="info" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: marked.parse(version.content) as string }}
        />
      </CardContent>
    </Card>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <GitCompare className="w-5 h-5 text-blue-600" />
            <CardTitle>版本对比</CardTitle>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <Badge variant="default">v{version1.version}</Badge>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <Badge variant="default">v{version2.version}</Badge>
          </div>
          <button
            onClick={endCompare}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VersionCard version={version1} label="版本 A" />
          <VersionCard version={version2} label="版本 B" />
        </div>
      </CardContent>
    </Card>
  );
};
