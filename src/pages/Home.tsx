import { Link } from 'react-router-dom';
import { Activity, LayoutDashboard, FileText, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  return (
    <div className="space-y-20 py-16 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

      <div className="relative text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 border border-blue-100">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse" />
          基于 AI 视觉技术的全新体验
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-7xl mb-6">
          <span className="block mb-2">精准关节活动度测量</span>
          <span className="block text-gradient">开启数字化康复时代</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed">
          Vision3 融合先进的计算机视觉算法，为您提供实时的关节活动范围(ROM)评估。
          <span className="hidden md:inline"> 无需昂贵设备，仅需一个摄像头，即可获得专业的体态健康分析报告。</span>
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/measure"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-2xl text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95"
          >
            开始测量
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link
            to="/posture"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-2xl text-blue-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            体态评估
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6 relative">
        {[
          {
            title: '关节ROM测量',
            desc: '支持全身主要关节活动度测量，实时显示角度变化趋势与最大活动范围。',
            icon: Activity,
            color: 'blue',
            bg: 'bg-blue-50',
            iconColor: 'text-blue-600'
          },
          {
            title: '静态体态评估',
            desc: '多维度分析头前倾、高低肩、骨盆倾斜等体态问题，提供针对性改善方案。',
            icon: LayoutDashboard,
            color: 'green',
            bg: 'bg-green-50',
            iconColor: 'text-green-600'
          },
          {
            title: '专业报告导出',
            desc: '自动生成深度分析报告，支持 PDF 导出与历史记录对比，科学追踪进度。',
            icon: FileText,
            color: 'purple',
            bg: 'bg-purple-50',
            iconColor: 'text-purple-600'
          }
        ].map((feature, idx) => (
          <div key={idx} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 card-hover group">
            <div className={cn(feature.bg, "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform")}>
              <feature.icon className={cn("h-7 w-7", feature.iconColor)} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
            <p className="text-gray-600 leading-relaxed">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
