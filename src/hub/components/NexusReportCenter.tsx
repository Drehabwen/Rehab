import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Calendar, 
  User, 
  Activity,
  ArrowUpRight,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeasurementStore, PostureReport } from '@/store/useMeasurementStore';
import { ReportChart } from './ReportChart';

export const NexusReportCenter: React.FC = () => {
  const { 
    savedMeasurements, 
    deleteSavedMeasurement,
    postureReports,
    deletePostureReport
  } = useMeasurementStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportHtml, setSelectedReportHtml] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<PostureReport | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [chartPortals, setChartPortals] = useState<React.ReactPortal[]>([]);

  useEffect(() => {
    if (selectedReportHtml && reportContainerRef.current && selectedReport) {
      // 1. Handle scripts (legacy support)
      const scripts = reportContainerRef.current.getElementsByTagName('script');
      Array.from(scripts).forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });

      // 2. Handle Chart Placeholders
      const placeholders = reportContainerRef.current.querySelectorAll('.rehab-chart');
      const newPortals: React.ReactPortal[] = [];

      placeholders.forEach((el, idx) => {
        const type = el.getAttribute('data-type') as 'sway' | 'angle' | 'velocity';
        const title = el.getAttribute('data-title') || '';
        const metricKey = el.getAttribute('data-key') || '';
        const unit = el.getAttribute('data-unit') || '';
        const color = el.getAttribute('data-color') || '#3b82f6';

        if (selectedReport.timeSeries) {
          // Prepare data: Recharts expects an array of objects
          const chartData = selectedReport.timeSeries.map(point => ({
            timestamp: point.timestamp,
            [metricKey]: point.metrics[metricKey]
          }));

          newPortals.push(
            ReactDOM.createPortal(
              <ReportChart 
                key={`chart-${idx}`}
                type={type}
                data={chartData}
                title={title}
                metricKey={metricKey}
                unit={unit}
                color={color}
              />,
              el as HTMLElement
            )
          );
        }
      });
      setChartPortals(newPortals);
    } else {
      setChartPortals([]);
    }
  }, [selectedReportHtml, selectedReport]);

  const stats = [
    { label: '总报告数', value: savedMeasurements.length + postureReports.length, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '本周新增', value: '12', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: '待审核', value: '3', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  const allReports = [
    ...savedMeasurements.map(m => ({ ...m, type: 'measurement' as const })),
    ...postureReports.map(r => ({ ...r, type: 'posture' as const }))
  ].sort((a, b) => b.date - a.date);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-antey-primary mb-2">
            <span className="w-8 h-[1px] bg-antey-primary" />
            Report Management
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
            报告<span className="text-gradient">中心</span>
          </h1>
          <p className="text-slate-400 font-medium text-lg">
            集中管理、分析并导出所有患者的康复数据报告。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-antey-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="搜索记录..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/50 border border-slate-200/50 rounded-2xl py-2.5 pl-12 pr-6 text-sm w-64 focus:ring-4 focus:ring-antey-primary/5 focus:bg-white focus:border-antey-primary/20 transition-all outline-none"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-antey-primary hover:border-antey-primary/20 transition-all shadow-sm">
            <Filter size={20} />
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bento-card-glass p-8 group hover:-translate-y-1 transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500", stat.bg, stat.color)}>
                <stat.icon size={24} />
              </div>
              <ArrowUpRight size={20} className="text-slate-300 group-hover:text-antey-primary transition-colors" />
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Clock size={16} className="text-antey-primary" />
            最近生成
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400">排序:</span>
            <button className="text-[10px] font-black text-slate-900 flex items-center gap-1 uppercase tracking-widest hover:text-antey-primary transition-colors">
              最新优先 <ChevronDown size={12} />
            </button>
          </div>
        </div>

        {allReports.length === 0 ? (
          <div className="bento-card-glass p-20 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
            <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-300">
              <FileText size={40} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">暂无报告数据</h3>
              <p className="text-slate-400 text-sm">完成康复评估或体态录制后，报告将在此自动生成。</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {allReports.map((report) => (
              <div key={report.id} className="group bento-card-glass p-6 flex items-center justify-between hover:border-antey-primary/30 hover:shadow-2xl transition-all duration-500">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                    report.type === 'posture' 
                      ? "bg-blue-50 text-blue-500 group-hover:bg-blue-100" 
                      : "bg-slate-50 text-slate-400 group-hover:bg-antey-primary/5 group-hover:text-antey-primary"
                  )}>
                    {report.type === 'posture' ? <Activity size={28} /> : <Activity size={28} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {report.type === 'posture' ? `体态趋势分析报告 (${report.view === 'front' ? '正视图' : report.view === 'side' ? '侧视图' : '背视图'})` : `关节活动度评估报告 - ${report.id.slice(-6).toUpperCase()}`}
                      </h3>
                      <span className={cn(
                        "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-md border",
                        report.type === 'posture' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}>
                        {report.type === 'posture' ? 'AI 深度分析' : '已完成'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                        <Calendar size={12} />
                        {new Date(report.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                        <User size={12} />
                        匿名患者
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                        <FileText size={12} />
                        {report.type === 'posture' ? 'LLM 时序分析' : `${report.measurements?.length || 0} 个分析项`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="p-3 text-slate-400 hover:text-antey-primary hover:bg-slate-50 rounded-xl transition-all">
                    <Download size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      if (report.type === 'posture') deletePostureReport(report.id);
                      else deleteSavedMeasurement(report.id);
                    }}
                    className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className="w-px h-8 bg-slate-100 mx-2" />
                  <button 
                    onClick={() => {
                      if (report.type === 'posture') {
                        setSelectedReportHtml(report.html);
                        setSelectedReport(report as PostureReport);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-antey-primary transition-all shadow-lg shadow-slate-900/10"
                  >
                    查看详情
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HTML Report Modal */}
      {selectedReportHtml && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setSelectedReportHtml(null); setSelectedReport(null); setIsFullscreen(false); }} />
          <div className={cn(
            "relative bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ease-in-out",
            isFullscreen 
              ? "w-full h-full rounded-none" 
              : "w-full max-w-5xl h-[90vh] rounded-[2.5rem] animate-in zoom-in-95 duration-300"
          )}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
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
                  onClick={() => { setSelectedReportHtml(null); setSelectedReport(null); setIsFullscreen(false); }}
                  className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
                >
                  <ChevronDown size={24} className="rotate-180" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-50/30">
              <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-12">
                <div 
                  ref={reportContainerRef}
                  className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-900"
                  dangerouslySetInnerHTML={{ __html: selectedReportHtml }} 
                />
                {/* Render Chart Portals */}
                {chartPortals}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                生成时间: {new Date().toLocaleString()}
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                  打印报告
                </button>
                <button className="flex-1 sm:flex-none px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
                  导出 PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
