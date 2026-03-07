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
import { PostureReportViewer } from '@/components/shared/PostureReportViewer';
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
  const [reportType, setReportType] = useState<'auxiliary' | 'deep'>('deep');
  const [selectedReport, setSelectedReport] = useState<PostureReport | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [chartPortals, setChartPortals] = useState<React.ReactPortal[]>([]);

  useEffect(() => {
    const postureData = selectedAssessment?.data.posture;
    if (postureData) {
      if (postureData.markdownReport) {
        setReportType('deep');
      } else if (postureData.auxiliaryDiagnosis) {
        setReportType('auxiliary');
      }
    }
  }, [selectedAssessment]);

  useEffect(() => {
    const postureData = selectedAssessment?.data.posture;
    if (postureData) {
      const content = reportType === 'deep' ? (postureData.markdownReport || postureData.auxiliaryDiagnosis) : (postureData.auxiliaryDiagnosis || postureData.markdownReport);
      if (content) setSelectedReportMarkdown(content);
    }
  }, [reportType, selectedAssessment]);

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

  const getAssessmentTypeLabel = (type: string) => {
    switch (type) {
      case 'posture': return '体态评估';
      case 'rom': return '关节活动度评估';
      case 'medvoice': return '语音接诊评估';
      case 'combined': return '综合评估';
      default: return '未知评估';
    }
  };

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
    let csvContent = '';
    
    if (assessment.data.posture?.metrics) {
      const metrics = assessment.data.posture.metrics;
      const rows = Object.entries(metrics).map(([key, value]) => [key, value]);
      csvContent = 'metric,value\n' + rows.map(r => r.join(',')).join('\n');
    } else if (assessment.data.medvoice) {
      const medvoice = assessment.data.medvoice;
      csvContent = 'field,value\n';
      csvContent += `patient_name,${medvoice.patientInfo.name}\n`;
      csvContent += `patient_gender,${medvoice.patientInfo.gender}\n`;
      csvContent += `patient_age,${medvoice.patientInfo.age}\n`;
      csvContent += `case_id,${medvoice.patientInfo.case_id}\n`;
      csvContent += `visit_date,${medvoice.patientInfo.visit_date}\n`;
      csvContent += `view_mode,${medvoice.viewMode}\n`;
      if (medvoice.structuredCase) {
        Object.entries(medvoice.structuredCase).forEach(([key, value]) => {
          if (value) {
            csvContent += `${key},${value.replace(/\n/g, ' ')}\n`;
          }
        });
      }
    } else if (assessment.data.rom) {
      const rom = assessment.data.rom;
      csvContent = 'joint,direction,side,angle,maxAngle,minAngle,confidence\n';
      rom.items.forEach(item => {
        csvContent += `${item.joint},${item.direction},${item.side},${item.angle},${item.maxAngle},${item.minAngle},${item.confidence}\n`;
      });
    }
    
    if (csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-${assessment.id}-${new Date(assessment.createdAt).toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
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
                            {getAssessmentTypeLabel(assessment.type)}
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
                            {new Date(assessment.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
              {/* Posture Assessment */}
              {selectedAssessment.data.posture && (
                <div className="space-y-6">
                  {/* Summary Header */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                        <Activity size={24} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">评估模式</div>
                        <div className="font-bold text-slate-900">
                          {selectedAssessment.mode === 'realtime' ? '实时全维度扫描' : selectedAssessment.mode === 'stepped' ? '分步定向拍摄' : '其他模式'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">视角</div>
                      <div className="font-bold text-slate-900">
                        {selectedAssessment.data.posture.view === 'front' ? '正面 (Front)' : 
                         selectedAssessment.data.posture.view === 'side' ? '侧面 (Side)' : 
                         selectedAssessment.data.posture.view === 'back' ? '背面 (Back)' : '综合视图'}
                      </div>
                    </div>
                  </div>

                  {selectedAssessment.data.posture.issues && selectedAssessment.data.posture.issues.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">检测到的体态问题</h4>
                      <div className="space-y-2">
                        {selectedAssessment.data.posture.issues.map((issue, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "px-2 py-1 text-[9px] font-black uppercase rounded-lg shadow-sm",
                                issue.severity === 'severe' ? 'bg-rose-500 text-white' :
                                issue.severity === 'moderate' ? 'bg-amber-500 text-white' :
                                'bg-blue-500 text-white'
                              )}>
                                {issue.severity === 'severe' ? '严重' : issue.severity === 'moderate' ? '中度' : '轻度'}
                              </span>
                              <span className="font-bold text-slate-900">{issue.title}</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{issue.description}</p>
                            {issue.recommendation && (
                              <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-start gap-2">
                                <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                </div>
                                <p className="text-xs text-slate-500 italic">{issue.recommendation}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedAssessment.data.posture.metrics && Object.keys(selectedAssessment.data.posture.metrics).length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">生物力学指标</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(selectedAssessment.data.posture.metrics).map(([key, value]) => {
                          if (key === 'head_axes') return null; // Skip complex objects
                          return (
                            <div key={key} className="bento-card p-4 bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate" title={key}>
                                {key.replace(/_/g, ' ')}
                              </div>
                              <div className="text-xl font-black text-slate-900 flex items-baseline gap-1">
                                {typeof value === 'number' ? value.toFixed(1) : String(value)}
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                  {key.toLowerCase().includes('angle') ? '°' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ROM Assessment */}
              {selectedAssessment.data.rom && (
                <div className="space-y-6">
                  {/* ROM Assessment Header */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-green-400">
                        <Activity size={24} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">评估类型</div>
                        <div className="font-bold text-slate-900">关节活动度评估</div>
                      </div>
                    </div>
                  </div>

                  {/* ROM Data */}
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">关节活动度数据</h4>
                    <div className="space-y-3">
                      {selectedAssessment.data.rom.items.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-green-100 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-slate-900">
                              {item.joint} {item.direction} ({item.side})
                            </div>
                            <div className="text-xl font-black text-green-600">{item.angle.toFixed(1)}°</div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span>最大值: {item.maxAngle.toFixed(1)}°</span>
                            <span>最小值: {item.minAngle.toFixed(1)}°</span>
                            <span>置信度: {(item.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ROM Summary */}
                  {selectedAssessment.data.rom.summary && (
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">评估总结</h4>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-sm text-slate-600 leading-relaxed">{selectedAssessment.data.rom.summary}</p>
                      </div>
                    </div>
                  )}

                  {/* ROM Recommendations */}
                  {selectedAssessment.data.rom.recommendations && selectedAssessment.data.rom.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">康复建议</h4>
                      <div className="space-y-2">
                        {selectedAssessment.data.rom.recommendations.map((recommendation, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-green-100 transition-colors">
                            <p className="text-sm text-slate-600 leading-relaxed">{recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MedVoice Assessment */}
              {selectedAssessment.data.medvoice && (
                <div className="space-y-6">
                  {/* Summary Header */}
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-400">
                        <Activity size={24} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">评估模式</div>
                        <div className="font-bold text-slate-900">
                          语音接诊评估
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">视图模式</div>
                      <div className="font-bold text-slate-900">
                        {selectedAssessment.data.medvoice.viewMode === 'standard' ? '标准模式' : 'SOAP模式'}
                      </div>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">患者信息</h4>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">姓名</div>
                          <div className="font-bold text-slate-900">{selectedAssessment.data.medvoice.patientInfo.name}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">性别</div>
                          <div className="font-bold text-slate-900">{selectedAssessment.data.medvoice.patientInfo.gender}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">年龄</div>
                          <div className="font-bold text-slate-900">{selectedAssessment.data.medvoice.patientInfo.age}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">病历号</div>
                          <div className="font-bold text-slate-900">{selectedAssessment.data.medvoice.patientInfo.case_id}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Structured Case */}
                  {selectedAssessment.data.medvoice.structuredCase && (
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">结构化病历</h4>
                      <div className="space-y-3">
                        {Object.entries(selectedAssessment.data.medvoice.structuredCase).map(([key, value]) => {
                          if (!value) return null;
                          return (
                            <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-purple-100 transition-colors">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{key}</div>
                              <div className="text-sm text-slate-600 leading-relaxed">{value}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Transcript */}
                  {selectedAssessment.data.medvoice.transcript && (
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">对话记录</h4>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {selectedAssessment.data.medvoice.transcript}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3">
              {(selectedAssessment.data.posture?.markdownReport || selectedAssessment.data.posture?.auxiliaryDiagnosis) && (
                <button
                  onClick={() => {
                    const postureData = selectedAssessment.data.posture;
                    if (postureData) {
                      const reportContent = postureData.markdownReport || postureData.auxiliaryDiagnosis;
                      if (reportContent) {
                        setSelectedReportMarkdown(reportContent);
                        
                        // Construct PostureReport object for charts
                        const report: PostureReport = {
                          id: selectedAssessment.id,
                          date: selectedAssessment.createdAt,
                          view: postureData.view || 'unknown',
                          html: '', // Legacy support
                          markdown: reportContent,
                          timeSeries: postureData.timeSeries
                        };
                        setSelectedReport(report);
                      }
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
          <PostureReportViewer
            auxiliaryDiagnosis={selectedAssessment?.data.posture?.auxiliaryDiagnosis}
            markdownReport={selectedAssessment?.data.posture?.markdownReport}
            reportType={reportType}
            setReportType={setReportType}
            isFullscreen={isFullscreen}
            setIsFullscreen={setIsFullscreen}
            onClose={() => { setSelectedReportMarkdown(null); setSelectedReport(null); setIsFullscreen(false); }}
            title="体态评估报告"
            subtitle="NEXUS HUB AI POWERED ANALYSIS"
          />
          {chartPortals}
        </div>
      )}
    </div>
  );
};
