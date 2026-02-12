import { Play, Square, RotateCcw, Save, Activity, FileText } from 'lucide-react';
import WebcamView from '@/components/WebcamView';
import JointSelector from '@/components/JointSelector';
import MeasurementChart from '@/components/MeasurementChart';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Measure() {
  const { 
    isMeasuring, startMeasurement, stopMeasurement, resetMeasurement, saveMeasurement, activeMeasurements
  } = useMeasurementStore();
  const navigate = useNavigate();

  const hasData = activeMeasurements.some(m => m.data.length > 0);

  const handleSave = () => {
    saveMeasurement();
    navigate('/report');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">关节活动度测量</h1>
          <p className="text-gray-500 mt-1">选择关节和方向，开始实时测量分析</p>
        </div>
        
        <div className="flex space-x-3 w-full md:w-auto">
          {!isMeasuring ? (
            <>
              <button
                onClick={startMeasurement}
                className="flex-1 md:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-2xl shadow-lg shadow-blue-100 text-white bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="h-4 w-4 mr-2 fill-current" />
                开始测量
              </button>
              
              {hasData && (
                <button
                  onClick={handleSave}
                  className="flex-1 md:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-2xl shadow-lg shadow-green-100 text-white bg-green-600 hover:bg-green-700 transition-all hover:scale-105 active:scale-95"
                >
                  <Save className="h-4 w-4 mr-2" />
                  保存数据
                </button>
              )}
            </>
          ) : (
            <button
              onClick={stopMeasurement}
              className="flex-1 md:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-2xl shadow-lg shadow-red-100 text-white bg-red-600 hover:bg-red-700 transition-all animate-pulse"
            >
              <Square className="h-4 w-4 mr-2 fill-current" />
              停止测量
            </button>
          )}
          
          <button
            onClick={resetMeasurement}
            disabled={isMeasuring}
            className={cn(
              "flex-1 md:flex-none inline-flex items-center justify-center px-6 py-3 border border-gray-200 text-sm font-semibold rounded-2xl text-gray-700 bg-white hover:bg-gray-50 transition-all",
              isMeasuring && "opacity-50 cursor-not-allowed"
            )}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10 aspect-[4/3] relative">
            <WebcamView />
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <MeasurementChart />
          </div>
        </div>
        
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <JointSelector />
          </div>
          
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="h-24 w-24" />
            </div>
            <h4 className="font-bold text-lg mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mr-3">
                <FileText className="h-4 w-4" />
              </span>
              测量指南
            </h4>
            <ul className="text-sm text-blue-50/90 space-y-4">
              <li className="flex items-start">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs mr-3 mt-0.5 shrink-0">1</span>
                请确保全身或测量部位在摄像头视野内。
              </li>
              <li className="flex items-start">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs mr-3 mt-0.5 shrink-0">2</span>
                保持光线充足，避免逆光。
              </li>
              <li className="flex items-start">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs mr-3 mt-0.5 shrink-0">3</span>
                点击"开始测量"后，缓慢进行关节活动。
              </li>
              <li className="flex items-start">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs mr-3 mt-0.5 shrink-0">4</span>
                活动至最大幅度保持1-2秒以记录峰值。
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
