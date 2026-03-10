import React, { useState } from 'react';
import { formatDate } from '../assessment/utils/assessmentHistoryUtils';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';

interface ReportViewerProps {
  report: {
    id: string;
    patientId: string;
    type: string;
    format: string;
    title: string;
    content: string;
    createdAt: number;
    data: any;
  };
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ report }) => {
  const [activeTab, setActiveTab] = useState('content');

  const handlePrint = () => {
    window.print();
  };

  const renderMarkdownContent = (content: string) => {
    // 简单的 Markdown 渲染
    const html = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/gim, '<br>');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const renderHtmlContent = (content: string) => {
    return <div dangerouslySetInnerHTML={{ __html: content }} />;
  };

  const renderPdfContent = (content: string) => {
    return (
      <div className="py-8 text-center">
        <p>PDF 格式报告需要下载后查看</p>
        <Button
          onClick={() => {
            const blob = new Blob([content], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          }}
        >
          打开 PDF
        </Button>
      </div>
    );
  };

  const renderContent = () => {
    switch (report.format) {
      case 'markdown':
        return renderMarkdownContent(report.content);
      case 'html':
        return renderHtmlContent(report.content);
      case 'pdf':
        return renderPdfContent(report.content);
      default:
        return <p>不支持的报告格式</p>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{report.title}</CardTitle>
            <CardDescription>
              生成时间: {formatDate(new Date(report.createdAt).toISOString())}
            </CardDescription>
            <CardDescription className="mt-1">
              类型: {report.type} | 格式: {report.format}
            </CardDescription>
          </div>
          <Button onClick={handlePrint} variant="outline" size="sm">
            打印报告
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[600px] overflow-auto">
        <div className="mb-4 border-b border-slate-200 pb-4">
          <div className="segmented-control w-fit">
            <button
              className={`segmented-control-tab ${activeTab === 'content' ? 'segmented-control-tab-solid' : 'segmented-control-tab-inactive'}`}
              onClick={() => setActiveTab('content')}
            >
              报告内容
            </button>
            <button
              className={`segmented-control-tab ${activeTab === 'data' ? 'segmented-control-tab-solid' : 'segmented-control-tab-inactive'}`}
              onClick={() => setActiveTab('data')}
            >
              原始数据
            </button>
          </div>
        </div>

        {activeTab === 'content' ? (
          <div className="space-y-4">
            <div className="prose max-w-none">{renderContent()}</div>
          </div>
        ) : null}

        {activeTab === 'data' ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-medium">评估数据</h3>
              <pre className="overflow-x-auto text-sm">
                {JSON.stringify(report.data.assessments, null, 2)}
              </pre>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-medium">治疗计划</h3>
              <pre className="overflow-x-auto text-sm">
                {JSON.stringify(report.data.treatmentPlans, null, 2)}
              </pre>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-medium">评估记录</h3>
              <pre className="overflow-x-auto text-sm">
                {JSON.stringify(report.data.records, null, 2)}
              </pre>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-medium">指标数据</h3>
              <pre className="overflow-x-auto text-sm">
                {JSON.stringify(report.data.metrics, null, 2)}
              </pre>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-medium">洞察</h3>
              <pre className="overflow-x-auto text-sm">
                {JSON.stringify(report.data.insights, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
