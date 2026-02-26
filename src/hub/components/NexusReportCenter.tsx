import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  FileText, 
  Search, 
  Trash2, 
  Calendar, 
  User, 
  Activity,
  ArrowUpRight,
  ExternalLink,
  ChevronDown,
  Database,
  FileJson,
  FileSpreadsheet
} from 'lucide-react';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import { cn } from '@/lib/utils';
import { PostureReport } from '@/store/useMeasurementStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { usePatientStore } from '@/store/usePatientStore';
import { ReportChart } from './ReportChart';
import type { Assessment } from '@/types/assessment';

export const NexusReportCenter: React.FC = () => {
  const { 
    assessments, 
    loadAssessments, 
    loadAssessmentsByPatient,
    deleteAssessment 
  } = useAssessmentStore();
  
  const { 
    patients, 
    loadPatients
  } = usePatientStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedReportMarkdown, setSelectedReportMarkdown] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<PostureReport | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [chartPortals, setChartPortals] = useState<React.ReactPortal[]>([]);

  useEffect(() => {
    loadPatients();
    loadAssessments();
  }, [loadPatients, loadAssessments]);

  useEffect(() => {
    if (selectedPatientId) {
      loadAssessmentsByPatient(selectedPatientId);
    }
  }, [selectedPatientId, loadAssessmentsByPatient]);

  useEffect(() => {
    if (selectedReportMarkdown && reportContainerRef.current && selectedReport) {
      const scripts = reportContainerRef.current.getElementsByTagName('script');
      Array.from(scripts).forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });

      const placeholders = reportContainerRef.current.querySelectorAll('.rehab-chart');
      const newPortals: React.ReactPortal[] = [];

      placeholders.forEach((el, idx) => {
        const type = el.getAttribute('data-type') as 'sway' | 'angle' | 'velocity';
        const title = el.getAttribute('data-title') || '';
        const metricKey = el.getAttribute('data-key') || '';
        const unit = el.getAttribute('data-unit') || '';
        const color = el.getAttribute('data-color') || '#3b82f6';

        if (selectedReport.timeSeries) {
          const chartData = selectedReport.timeSeries.map(point => ({
            timestamp: point.timestamp,
            value: point[metricKey as keyof typeof point] as number
          }));

          const portal = ReactDOM.createPortal(
            <ReportChart
              key={`chart-${idx}`}
              type={type}
              data={chartData}
              title={title}
              metricKey={metricKey}
              unit={unit}
              color={color}
            />,
            el as Element
          );
          newPortals.push(portal);
        }
      });
      setChartPortals(newPortals);
    } else {
      setChartPortals([]);
    }
  }, [selectedReportMarkdown, selectedReport]);

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssessments = selectedPatientId 
    ? assessments.filter(a => a.patientId === selectedPatientId)
    : assessments;

  const stats = [
    { label: '总评估数', value: assessments.length, icon: Database, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '患者总数', value: patients.length, icon: User, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: '本周新增', value: assessments.filter(a => Date.now() - a.createdAt < 7 * 24 * 60 * 60 * 1000).length, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  const exportToJson = (assessment: Assessment) => {
    const dataStr = JSON.stringify(assessment, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${assessment.id}-${new Date(assessment.createdAt).toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCsv = (assessment: Assessment) => {
    const metrics = assessment.data.posture?.metrics;
    if (!metrics) return;
    const rows = Object.entries(metrics).map(([key, value]) => [key, value]);
    const csvContent = 'metric,value\n' + rows.map(r => r.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${assessment.id}-${new Date(assessment.createdAt).toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
              数据与报告
            </h1>
            <p className="text-slate-400 font-medium text-lg flex items-center gap-2">
              <span className="w-8 h-[1px] bg-slate-200" />
              {selectedPatientId 
                ? `筛选: ${patients.find(p => p.id === selectedPatientId)?.name || '未知患者'}`
                : '全部患者的评估记录'
              }
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-sm">
              <div className="px-4 py-2 bg-white/80 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {assessments.length} 条记录
              </div>
            </div>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bento-card p-6 flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-slate-900">{stat.value}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bento-card p-6">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                <User size={14} />
                患者筛选
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="搜索患者..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-antey-primary/10 focus:border-antey-primary/30 transition-all outline-none"
                />
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <button
                  onClick={() => setSelectedPatientId(null)}
                  className={cn(
                    "w-full px-4 py-3 flex items-center gap-3 text-left rounded-xl transition-all",
                    !selectedPatientId 
                      ? "bg-antey-primary/10 text-antey-primary border border-antey-primary/20" 
                      : "hover:bg-slate-50 text-slate-600 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    !selectedPatientId ? "bg-antey-primary/20" : "bg-slate-100"
                  )}>
                    <Database size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">全部患者</div>
                    <div className="text-[10px] text-slate-400">{assessments.length} 条评估</div>
                  </div>
                </button>
                
                {filteredPatients.map((patient) => {
                  const patientAssessments = assessments.filter(a => a.patientId === patient.id);
                  return (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                      className={cn(
                        "w-full px-4 py-3 flex items-center gap-3 text-left rounded-xl transition-all",
                        selectedPatientId === patient.id 
                          ? "bg-antey-primary/10 text-antey-primary border border-antey-primary/20" 
                          : "hover:bg-slate-50 text-slate-600 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                        selectedPatientId === patient.id 
                          ? "bg-antey-primary/20 text-antey-primary" 
                          : "bg-slate-100 text-slate-500"
                      )}>
                        {patient.name?.charAt(0) || patient.id.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{patient.name || '未命名患者'}</div>
                        <div className="text-[10px] text-slate-400">{patientAssessments.length} 条评估</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="space-y-3">
              {filteredAssessments.length === 0 ? (
                <div className="bento-card p-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
                    <FileText size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">暂无评估记录</h3>
                  <p className="text-slate-400">完成体态评估后，数据将在此自动保存。</p>
                </div>
              ) : (
                filteredAssessments.map((assessment) => (
                  <div key={assessment.id} className="bento-card p-5 flex items-center justify-between hover:border-antey-primary/30 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Activity size={18} className="text-blue-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-black text-slate-900">
                            {assessment.type === 'posture' ? '体态评估' : '关节活动度评估'}
                          </span>
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                            assessment.mode === 'realtime' 
                              ? "bg-emerald-50 text-emerald-600" 
                              : "bg-blue-50 text-blue-600"
                          )}>
                            {assessment.mode === 'realtime' ? '实时' : '分步'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-[10px] font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(assessment.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={10} />
                            {patients.find(p => p.id === assessment.patientId)?.name || '未知患者'}
                          </span>
                          {assessment.data.posture?.view && (
                            <span className="flex items-center gap-1">
                              <ArrowUpRight size={10} />
                              {assessment.data.posture.view === 'front' ? '正面' : 
                               assessment.data.posture.view === 'side' ? '侧面' : '背面'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => exportToJson(assessment)}
                        className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        title="导出 JSON"
                      >
                        <FileJson size={16} />
                      </button>
                      <button 
                        onClick={() => exportToCsv(assessment)}
                        className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                        title="导出 CSV"
                      >
                        <FileSpreadsheet size={16} />
                      </button>
                      <button 
                        onClick={() => deleteAssessment(assessment.id)}
                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => setSelectedAssessment(assessment)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-antey-primary transition-all"
                      >
                        详情
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedAssessment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedAssessment(null)} />
          <div className="relative bg-white shadow-2xl w-full max-w-3xl max-h-[80vh] rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">评估详情</h3>
                  <p className="text-[10px] text-slate-400">
                    {new Date(selectedAssessment.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAssessment(null)}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
              >
                <ChevronDown size={20} className="rotate-180" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedAssessment.data.posture && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">检测问题</h4>
                    <div className="space-y-2">
                      {selectedAssessment.data.posture.issues.map((issue, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "px-2 py-1 text-[9px] font-black uppercase rounded-lg",
                              issue.severity === 'severe' ? 'bg-rose-100 text-rose-600' :
                              issue.severity === 'moderate' ? 'bg-amber-100 text-amber-600' :
                              'bg-blue-100 text-blue-600'
                            )}>
                              {issue.severity === 'severe' ? '严重' : issue.severity === 'moderate' ? '中度' : '轻度'}
                            </span>
                            <span className="font-bold text-slate-900">{issue.title}</span>
                          </div>
                          <p className="text-sm text-slate-600">{issue.description}</p>
                          <p className="text-xs text-slate-400 mt-1">{issue.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">测量指标</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(selectedAssessment.data.posture.metrics).map(([key, value]) => (
                        <div key={key} className="bento-card p-4">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">{key}</div>
                          <div className="text-lg font-black text-slate-900">
                            {typeof value === 'number' ? value.toFixed(1) : value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3">
              {selectedAssessment.data.posture?.markdownReport && (
                <button
                  onClick={() => {
                    const postureData = selectedAssessment.data.posture;
                    if (postureData && postureData.markdownReport) {
                      setSelectedReportMarkdown(postureData.markdownReport);
                      
                      // Construct PostureReport object for charts
                      const report: PostureReport = {
                        id: selectedAssessment.id,
                        date: selectedAssessment.createdAt,
                        view: postureData.view || 'unknown',
                        html: '', // Legacy support
                        markdown: postureData.markdownReport,
                        timeSeries: postureData.timeSeries
                      };
                      setSelectedReport(report);
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                >
                  <Activity size={14} />
                  查看深度报告
                </button>
              )}
              <button 
                onClick={() => exportToJson(selectedAssessment)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <FileJson size={14} />
                导出 JSON
              </button>
              <button 
                onClick={() => exportToCsv(selectedAssessment)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-antey-primary transition-all flex items-center gap-2"
              >
                <FileSpreadsheet size={14} />
                导出 CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReportMarkdown && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setSelectedReportMarkdown(null); setSelectedReport(null); setIsFullscreen(false); }} />
          <div className={cn(
            "relative bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ease-in-out",
            isFullscreen 
              ? "w-full h-full rounded-none" 
              : "w-full max-w-5xl h-[90vh] rounded-[2.5rem] animate-in zoom-in-95 duration-300"
          )}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">体态深度评估报告</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nexus Hub AI Powered Analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all hidden md:block"
                  title={isFullscreen ? "退出全屏" : "全屏预览"}
                >
                  <ArrowUpRight size={20} className={isFullscreen ? "rotate-180" : ""} />
                </button>
                <button 
                  onClick={() => { setSelectedReportMarkdown(null); setSelectedReport(null); setIsFullscreen(false); }}
                  className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
                >
                  <ChevronDown size={20} className="rotate-180" />
                </button>
              </div>
            </div>
            <div ref={reportContainerRef} className="flex-1 overflow-y-auto p-0 bg-slate-900">
              <MarkdownReport content={selectedReportMarkdown} animate={false} className="border-none rounded-none h-full" />
            </div>
            {chartPortals}
          </div>
        </div>
      )}
    </div>
  );
};
