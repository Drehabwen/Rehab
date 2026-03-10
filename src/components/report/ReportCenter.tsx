import React, { useEffect, useState } from 'react';
import { ReportFormat, ReportGenerator, ReportType } from '../../services/ReportGenerator';
import { formatDate } from '../assessment/utils/assessmentHistoryUtils';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { ReportViewer } from './ReportViewer';

interface ReportCenterProps {
  patientId: string;
}

export const ReportCenter: React.FC<ReportCenterProps> = ({ patientId }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  const [reportConfig, setReportConfig] = useState({
    type: 'comprehensive' as ReportType,
    format: 'markdown' as ReportFormat,
    patientId,
    timeRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime(),
      end: Date.now(),
    },
    includeCharts: true,
    includeRecommendations: true,
    includeRawData: false,
  });

  useEffect(() => {
    loadReports();
  }, [patientId]);

  const loadReports = () => {
    setReports(ReportGenerator.loadReports(patientId));
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const report = await ReportGenerator.generateReport(reportConfig);
      ReportGenerator.saveReport(report);
      loadReports();
      setSelectedReport(report);
      setShowGenerator(false);
    } catch (error) {
      console.error('生成报告失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteReport = (reportId: string) => {
    if (!window.confirm('确定要删除这份报告吗？')) return;

    ReportGenerator.deleteReport(reportId);
    loadReports();
    if (selectedReport?.id === reportId) {
      setSelectedReport(null);
    }
  };

  const handleExportReport = (report: any) => {
    const blob = new Blob([report.content], {
      type: report.format === 'markdown' ? 'text/markdown' : 'text/html',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${report.title.replace(/\s+/g, '_')}.${report.format}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const reportListItemClass = (active: boolean) =>
    active
      ? 'rounded-xl border border-blue-500 bg-blue-50 p-3 cursor-pointer transition-all'
      : 'rounded-xl border border-slate-200 bg-white p-3 cursor-pointer transition-all hover:border-slate-300';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">报告中心</h2>
        <Button onClick={() => setShowGenerator(true)}>生成新报告</Button>
      </div>

      {showGenerator ? (
        <Card>
          <CardHeader>
            <CardTitle>生成报告</CardTitle>
            <CardDescription>配置报告生成选项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">报告类型</label>
                <select
                  value={reportConfig.type}
                  onChange={(event) =>
                    setReportConfig({ ...reportConfig, type: event.target.value as ReportType })
                  }
                  className="field-select"
                >
                  <option value="assessment">评估报告</option>
                  <option value="treatment">治疗计划报告</option>
                  <option value="progress">康复进度报告</option>
                  <option value="comprehensive">综合康复报告</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">报告格式</label>
                <select
                  value={reportConfig.format}
                  onChange={(event) =>
                    setReportConfig({
                      ...reportConfig,
                      format: event.target.value as ReportFormat,
                    })
                  }
                  className="field-select"
                >
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">时间范围</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={new Date(reportConfig.timeRange.start).toISOString().split('T')[0]}
                  onChange={(event) =>
                    setReportConfig({
                      ...reportConfig,
                      timeRange: {
                        ...reportConfig.timeRange,
                        start: new Date(event.target.value).getTime(),
                      },
                    })
                  }
                  className="field-input flex-1"
                />
                <input
                  type="date"
                  value={new Date(reportConfig.timeRange.end).toISOString().split('T')[0]}
                  onChange={(event) =>
                    setReportConfig({
                      ...reportConfig,
                      timeRange: {
                        ...reportConfig.timeRange,
                        end: new Date(event.target.value).getTime(),
                      },
                    })
                  }
                  className="field-input flex-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGenerateReport} disabled={isGenerating}>
                {isGenerating ? '生成中...' : '生成报告'}
              </Button>
              <Button variant="outline" onClick={() => setShowGenerator(false)}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>报告列表</CardTitle>
              <CardDescription>所有已生成报告</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reports.length === 0 ? (
                  <div className="state-panel">
                    <p>暂无报告</p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className={reportListItemClass(selectedReport?.id === report.id)}
                      onClick={() => setSelectedReport(report)}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-slate-900">{report.title}</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleExportReport(report);
                            }}
                          >
                            导出
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteReport(report.id);
                            }}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">
                        生成时间: {formatDate(new Date(report.createdAt).toISOString())}
                      </p>
                      <p className="text-xs text-slate-500">
                        类型: {report.type} | 格式: {report.format}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedReport ? (
            <ReportViewer report={selectedReport} />
          ) : (
            <Card>
              <CardContent className="flex h-64 items-center justify-center">
                <p className="text-slate-500">请选择或生成一份报告</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
