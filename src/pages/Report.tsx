import { useMeasurementStore } from '@/store/useMeasurementStore';
import { Trash2, FileDown, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ManualAnalysis from '@/components/ManualAnalysis';
import { cn } from '@/lib/utils';

const JOINT_NAMES: Record<string, string> = {
  'cervical': '颈椎',
  'shoulder': '肩关节',
  'thoracolumbar': '胸腰椎',
  'wrist': '腕关节',
  'ankle': '踝关节',
  'hip': '髋关节',
  'knee': '膝关节',
  'elbow': '肘关节'
};

const DIRECTION_NAMES: Record<string, string> = {
  'flexion': '前屈',
  'extension': '后伸',
  'abduction': '外展',
  'adduction': '内收',
  'internal-rotation': '内旋',
  'external-rotation': '外旋',
  'left-rotation': '左旋',
  'right-rotation': '右旋',
  'left-lateral-flexion': '左侧屈',
  'right-lateral-flexion': '右侧屈',
  'ulnar-deviation': '尺偏',
  'radial-deviation': '桡偏',
  'dorsiflexion': '背伸',
  'plantarflexion': '跖屈'
};

const SIDE_NAMES: Record<string, string> = {
  'left': '左',
  'right': '右'
};

export default function Report() {
  const { savedMeasurements, deleteSavedMeasurement } = useMeasurementStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [annotatingImage, setAnnotatingImage] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleManualSave = (annotatedImage: string) => {
    // Create a download link for the annotated image
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
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('导出PDF失败，请重试');
    }
  };

  if (savedMeasurements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-gray-50 p-8 rounded-[3rem] border border-dashed border-gray-200">
          <Edit3 className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">暂无测量报告</h2>
          <p className="text-gray-500">完成测量并保存后，报告将出现在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">测量报告历史</h1>
        <p className="text-gray-500 mt-2">回顾和分析您的历史测量记录</p>
      </div>
      
      <div className="space-y-6">
        {savedMeasurements.map((session) => (
          <div key={session.id} className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100 transition-all hover:shadow-xl hover:shadow-gray-200/50">
            <div 
              className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => toggleExpand(session.id)}
            >
              <div className="flex items-center space-x-6">
                <div className={cn(
                  "p-4 rounded-2xl transition-all",
                  expandedId === session.id ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-100 text-gray-500"
                )}>
                  {expandedId === session.id ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    测量记录
                    <span className="ml-3 px-3 py-1 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider">
                      {session.measurements.length} 项分析
                    </span>
                  </h3>
                  <p className="text-sm font-medium text-gray-400 mt-1 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    {new Date(session.date).toLocaleString('zh-CN', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSavedMeasurement(session.id); }}
                  className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  title="删除记录"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {expandedId === session.id && (
              <div id={`report-${session.id}`} className="p-8 border-t border-gray-50 bg-white space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                  <div>
                    <h4 className="text-2xl font-black text-gray-900">详细分析报告</h4>
                    <p className="text-sm font-medium text-gray-500 mt-1">ID: {session.id}</p>
                  </div>
                  <button
                    onClick={() => exportPDF(session.id)}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    导出报告 PDF
                  </button>
                </div>

                <div className="space-y-12">
                  {session.measurements.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <h5 className="text-xl font-black text-gray-900">
                          {JOINT_NAMES[item.joint] || item.joint} 
                          {item.side ? <span className="mx-2 text-gray-300 font-light">|</span> : ''}
                          <span className="text-blue-600">
                            {item.side ? `${SIDE_NAMES[item.side] || item.side}侧` : ''} 
                            {DIRECTION_NAMES[item.direction] || item.direction}
                          </span>
                        </h5>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-blue-100 transition-colors">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">最小角度</p>
                          <p className="text-3xl font-black text-gray-900">{item.minAngle === Infinity ? '-' : item.minAngle.toFixed(1)}<span className="text-lg ml-1 text-gray-400">°</span></p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-blue-100 transition-colors">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">最大角度</p>
                          <p className="text-3xl font-black text-gray-900">{item.maxAngle === -Infinity ? '-' : item.maxAngle.toFixed(1)}<span className="text-lg ml-1 text-gray-400">°</span></p>
                        </div>
                        <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-500/20 text-white">
                          <p className="text-xs font-black text-blue-100 uppercase tracking-widest mb-2">活动范围 (ROM)</p>
                          <p className="text-3xl font-black">
                             {(item.maxAngle !== -Infinity && item.minAngle !== Infinity) ? (item.maxAngle - item.minAngle).toFixed(1) : '-'}
                             <span className="text-lg ml-1 opacity-60">°</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                          <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={item.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis 
                                  dataKey="timestamp" 
                                  type="number" 
                                  tickFormatter={(val) => val.toFixed(1) + 's'}
                                  tick={{ fontSize: 11, fontWeight: 700, fill: '#9ca3af' }}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <YAxis 
                                  domain={[0, 180]} 
                                  tick={{ fontSize: 11, fontWeight: 700, fill: '#9ca3af' }}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#ffffff', 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    padding: '12px'
                                  }}
                                  itemStyle={{ fontSize: '12px', fontWeight: 800, color: '#1f2937' }}
                                  labelStyle={{ fontSize: '10px', fontWeight: 800, color: '#9ca3af', marginBottom: '4px' }}
                                  formatter={(value: number) => [value.toFixed(1) + '°', '角度']} 
                                  labelFormatter={(label: number) => label.toFixed(2) + 's'}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="angle" 
                                  stroke={item.color || "#2563eb"} 
                                  strokeWidth={4} 
                                  dot={false} 
                                  activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: item.color || "#2563eb" }}
                                  animationDuration={1500}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {item.maxAngleImage && (
                          <div className="lg:col-span-4 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">最大角度瞬间</p>
                              <button
                                onClick={() => setAnnotatingImage(item.maxAngleImage!)}
                                className="flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                手动标注
                              </button>
                            </div>
                            <div className="relative flex-1 rounded-2xl overflow-hidden border border-gray-200 group">
                              <img src={item.maxAngleImage} alt="Max Angle Frame" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <button 
                                  onClick={() => setAnnotatingImage(item.maxAngleImage!)}
                                  className="bg-white text-gray-900 px-6 py-2.5 rounded-xl text-sm font-black shadow-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                  点击标注
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 pt-8 border-t border-gray-50 text-center">
                  <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                    生成时间: {new Date(session.date).toLocaleString()} | Vision3 智能评估系统
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {annotatingImage && (
        <ManualAnalysis
          imageUrl={annotatingImage}
          onClose={() => setAnnotatingImage(null)}
          onSave={handleManualSave}
        />
      )}
    </div>
  );
}
