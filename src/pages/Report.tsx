import { useMeasurementStore } from '@/store/useMeasurementStore';
import { Trash2, FileDown, ChevronDown, Edit3, Activity, Calendar, Clock, BarChart3, Maximize2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ManualAnalysis from '@/components/ManualAnalysis';
import { cn } from '@/lib/utils';

const JOINT_NAMES: Record<string, string> = {
  cervical: '颈椎',
  shoulder: '肩关节',
  thoracolumbar: '胸腰段',
  wrist: '腕关节',
  ankle: '踝关节',
  hip: '髋关节',
  knee: '膝关节',
  elbow: '肘关节',
};

const DIRECTION_NAMES: Record<string, string> = {
  flexion: '前屈',
  extension: '后伸',
  abduction: '外展',
  adduction: '内收',
  'internal-rotation': '内旋',
  'external-rotation': '外旋',
  'left-rotation': '左旋',
  'right-rotation': '右旋',
  'left-lateral-flexion': '左侧屈',
  'right-lateral-flexion': '右侧屈',
  'ulnar-deviation': '尺偏',
  'radial-deviation': '桡偏',
  dorsiflexion: '背伸',
  plantarflexion: '跖屈',
};

const SIDE_NAMES: Record<string, string> = {
  left: '左',
  right: '右',
};

export default function Report() {
  const { savedMeasurements, deleteSavedMeasurement } = useMeasurementStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [annotatingImage, setAnnotatingImage] = useState<string | null>(null);

  const selectedSession = useMemo(
    () => savedMeasurements.find((session) => session.id === selectedSessionId),
    [savedMeasurements, selectedSessionId],
  );

  const handleManualSave = (annotatedImage: string) => {
    const link = document.createElement('a');
    link.href = annotatedImage;
    link.download = `annotated-measurement-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAnnotatingImage(null);
  };

  const exportPDF = async (id: string) => {
    const element = document.getElementById(`report-${id}`);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`report-${id}.pdf`);
    } catch (error) {
      console.error('PDF generation failed', error);
      alert('导出 PDF 失败，请重试。');
    }
  };

  if (savedMeasurements.length === 0) {
    return (
      <div className="animate-in flex flex-col items-center justify-center py-32 fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-[3rem] border border-dashed border-gray-200 bg-gray-50 p-8">
          <Edit3 className="mx-auto mb-6 h-16 w-16 text-gray-300" />
          <h2 className="mb-2 text-2xl font-black text-gray-900">暂无测量报告</h2>
          <p className="text-gray-500">完成一次测量并保存后，报告归档会显示在这里。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in space-y-8 fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black tracking-tight text-gray-900">测量报告归档</h1>
        <p className="mt-2 text-gray-500">查看历史测量记录，支持导出、标注和结果回溯。</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {savedMeasurements.map((session) => {
          const date = new Date(session.date);
          const formattedDate = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
          const formattedTime = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={session.id}
              className={cn(
                'group flex flex-col gap-4 rounded-2xl border px-5 py-4 transition-all duration-300 xl:flex-row xl:items-center xl:gap-6',
                selectedSessionId === session.id
                  ? 'border-blue-500 bg-blue-50/70 shadow-md'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md',
              )}
            >
              <div className="flex min-w-0 items-center gap-4 xl:w-[240px] xl:shrink-0">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all group-hover:scale-105',
                    selectedSessionId === session.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white',
                  )}
                >
                  <Calendar size={20} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-bold text-slate-900">测量记录 {formattedDate}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                    <Clock size={12} className="shrink-0" />
                    <span>{formattedTime}</span>
                    <span className="mx-1 opacity-30">|</span>
                    <span className="truncate">ID: {session.id.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-3 xl:gap-6">
                <div className="flex items-center gap-2 rounded-xl bg-slate-100/50 px-3 py-2">
                  <Activity size={16} className="text-blue-500" />
                  <div className="text-[13px] font-bold text-slate-900">
                    {session.measurements.length} <span className="text-[11px] font-medium text-slate-500">项测量</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {session.measurements.slice(0, 3).map((measurement, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: measurement.color }} />
                      {JOINT_NAMES[measurement.joint] || measurement.joint}
                    </div>
                  ))}
                  {session.measurements.length > 3 && (
                    <div className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-400">
                      +{session.measurements.length - 3}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-3 xl:border-t-0 xl:pt-0">
                <button
                  onClick={() => setSelectedSessionId(session.id)}
                  className={cn(
                    'flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all xl:flex-none',
                    selectedSessionId === session.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-lg',
                  )}
                >
                  <BarChart3 size={16} />
                  <span>查看详情</span>
                </button>
                <button
                  onClick={() => exportPDF(session.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                  title="导出 PDF"
                >
                  <FileDown size={18} />
                </button>
                <button
                  onClick={() => deleteSavedMeasurement(session.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                  title="删除记录"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedSession && (
        <div className="animate-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 fade-in duration-300 backdrop-blur-sm">
          <div
            className="animate-in relative h-[90vh] w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-slate-50 shadow-2xl zoom-in-95 duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">测量详情报告</h2>
                  <p className="text-sm font-medium text-slate-400">{new Date(selectedSession.date).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => exportPDF(selectedSession.id)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95"
                >
                  <FileDown size={18} />
                  导出 PDF
                </button>
                <button
                  onClick={() => setSelectedSessionId(null)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                >
                  <ChevronDown size={24} />
                </button>
              </div>
            </div>

            <div id={`report-${selectedSession.id}`} className="custom-scrollbar h-[calc(90vh-84px)] overflow-y-auto p-8">
              <div className="space-y-12 pb-12">
                {selectedSession.measurements.map((item, index) => (
                  <div key={index} className="relative rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm">
                    <div className="mb-8 flex items-center gap-4">
                      <div className="h-10 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <h5 className="text-2xl font-black text-slate-900">
                        {JOINT_NAMES[item.joint] || item.joint}
                        {item.side ? <span className="mx-3 font-light text-slate-200">|</span> : null}
                        <span className="text-blue-600">
                          {item.side ? `${SIDE_NAMES[item.side] || item.side}侧 ` : ''}
                          {DIRECTION_NAMES[item.direction] || item.direction}
                        </span>
                      </h5>
                    </div>

                    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                      <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 transition-colors">
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">最小角度</p>
                        <p className="text-3xl font-black text-slate-900">
                          {item.minAngle === Infinity ? '-' : item.minAngle.toFixed(1)}
                          <span className="ml-1 text-lg text-slate-400">°</span>
                        </p>
                      </div>
                      <div className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 transition-colors">
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">最大角度</p>
                        <p className="text-3xl font-black text-slate-900">
                          {item.maxAngle === -Infinity ? '-' : item.maxAngle.toFixed(1)}
                          <span className="ml-1 text-lg text-slate-400">°</span>
                        </p>
                      </div>
                      <div className="rounded-3xl bg-blue-600 p-6 text-white shadow-xl shadow-blue-500/20">
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-blue-100">活动范围 (ROM)</p>
                        <p className="text-3xl font-black">
                          {item.maxAngle !== -Infinity && item.minAngle !== Infinity
                            ? (item.maxAngle - item.minAngle).toFixed(1)
                            : '-'}
                          <span className="ml-1 text-lg opacity-60">°</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                      <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6 lg:col-span-8">
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={item.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis
                                dataKey="timestamp"
                                type="number"
                                tickFormatter={(value) => `${value.toFixed(1)}s`}
                                tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis
                                domain={[0, 180]}
                                tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#ffffff',
                                  borderRadius: '16px',
                                  border: 'none',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                  padding: '12px',
                                }}
                                itemStyle={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}
                                labelStyle={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}
                                formatter={(value: number) => [`${value.toFixed(1)}°`, '角度']}
                                labelFormatter={(label: number) => `${label.toFixed(2)}s`}
                              />
                              <Line
                                type="monotone"
                                dataKey="angle"
                                stroke={item.color || '#2563eb'}
                                strokeWidth={4}
                                dot={false}
                                activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: item.color || '#2563eb' }}
                                animationDuration={1500}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {item.maxAngleImage && (
                        <div className="flex flex-col rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6 lg:col-span-4">
                          <div className="mb-4 flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">最大角度瞬间</p>
                            <button
                              onClick={() => setAnnotatingImage(item.maxAngleImage!)}
                              className="flex items-center text-xs font-bold text-blue-600 transition-colors hover:text-blue-800"
                            >
                              <Edit3 className="mr-1 h-3 w-3" />
                              手动标注
                            </button>
                          </div>
                          <div className="group relative flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <img src={item.maxAngleImage} alt="Max Angle Frame" className="h-full w-full object-contain" />
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition-all group-hover:bg-slate-900/20 group-hover:opacity-100">
                              <button
                                onClick={() => setAnnotatingImage(item.maxAngleImage!)}
                                className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-black text-slate-900 shadow-xl transition-all hover:scale-105 active:scale-95"
                              >
                                <Maximize2 size={16} />
                                点击标注
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-8 text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">
                    生成时间: {new Date(selectedSession.date).toLocaleString()} | Vision3 智能评估系统
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {annotatingImage && (
        <ManualAnalysis imageUrl={annotatingImage} onClose={() => setAnnotatingImage(null)} onSave={handleManualSave} />
      )}
    </div>
  );
}
