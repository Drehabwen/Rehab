import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { ReportGenerator, ReportType, ReportFormat } from '../../services/ReportGenerator';
import { ReportViewer } from './ReportViewer';
import { DataCenterService } from '../../services/DataCenterService';
import { Assessment } from '../../types/assessment';
import { formatDate } from '../assessment/utils/assessmentHistoryUtils';

interface ReportCenterProps {
  patientId: string;
}

export const ReportCenter: React.FC<ReportCenterProps> = ({ patientId }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  
  // 报告生成配置
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
    const patientReports = ReportGenerator.loadReports(patientId);
    setReports(patientReports);
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
    if (window.confirm('确定要删除这份报告吗？')) {
      ReportGenerator.deleteReport(reportId);
      loadReports();
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(null);
      }
    }
  };

  const handleExportReport = (report: any) => {
    const blob = new Blob([report.content], {
      type: report.format === 'markdown' ? 'text/markdown' : 'text/html',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '_')}.${report.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">报告中心</h2>
        <Button onClick={() => setShowGenerator(true)}>
          生成新报告
        </Button>
      </div>

      {showGenerator && (
        <Card>
          <CardHeader>
            <CardTitle>生成报告</CardTitle>
            <CardDescription>配置报告生成选项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">报告类型</label>
                  <select
                    value={reportConfig.type}
                    onChange={(e) => setReportConfig({ ...reportConfig, type: e.target.value as ReportType })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="assessment">评估报告</option>
                    <option value="treatment">治疗计划报告</option>
                    <option value="progress">康复进度报告</option>
                    <option value="comprehensive">综合康复报告</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">报告格式</label>
                  <select
                    value={reportConfig.format}
                    onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value as ReportFormat })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">时间范围</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={new Date(reportConfig.timeRange.start).toISOString().split('T')[0]}
                    onChange={(e) => setReportConfig({
                      ...reportConfig,
                      timeRange: {
                        ...reportConfig.timeRange,
                        start: new Date(e.target.value).getTime(),
                      },
                    })}
                    className="flex-1 px-4 py-2 border rounded-lg"
                  />
                  <input
                    type="date"
                    value={new Date(reportConfig.timeRange.end).toISOString().split('T')[0]}
                    onChange={(e) => setReportConfig({
                      ...reportConfig,
                      timeRange: {
                        ...reportConfig.timeRange,
                        end: new Date(e.target.value).getTime(),
                      },
                    })}
                    className="flex-1 px-4 py-2 border rounded-lg"
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>报告列表</CardTitle>
              <CardDescription>所有生成的报告</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reports.length === 0 ? (
                  <p className="text-gray-500">暂无报告</p>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedReport?.id === report.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedReport(report)}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{report.title}</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportReport(report);
                            }}
                          >
                            导出
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReport(report.id);
                            }}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        生成时间: {formatDate(new Date(report.createdAt).toISOString())}
                      </p>
                      <p className="text-xs text-gray-500">
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
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-gray-500">请选择或生成一份报告</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
