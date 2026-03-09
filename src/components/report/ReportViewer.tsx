import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatDate } from '../assessment/utils/assessmentHistoryUtils';

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
    // 简单的Markdown渲染
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
      <div className="text-center py-8">
        <p>PDF格式报告需要下载查看</p>
        <Button
          onClick={() => {
            const blob = new Blob([content], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          }}
        >
          打开PDF
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
        <div className="flex justify-between items-start">
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
        <div className="mb-4 border-b">
          <div className="flex space-x-4">
            <button
              className={`px-4 py-2 ${activeTab === 'content' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('content')}
            >
              报告内容
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'data' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('data')}
            >
              原始数据
            </button>
          </div>
        </div>
        
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="prose max-w-none">
              {renderContent()}
            </div>
          </div>
        )}
        
        {activeTab === 'data' && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">评估数据</h3>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(report.data.assessments, null, 2)}
              </pre>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">治疗计划</h3>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(report.data.treatmentPlans, null, 2)}
              </pre>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">评估记录</h3>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(report.data.records, null, 2)}
              </pre>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">评估指标</h3>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(report.data.metrics, null, 2)}
              </pre>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">洞察</h3>
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(report.data.insights, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
