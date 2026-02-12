import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Scan, Activity, Zap, Dna, Settings2, ArrowRight, LucideIcon 
} from 'lucide-react';

interface AssessmentCardProps {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  tag: string;
  disabled?: boolean;
  onSelect: (id: 'front' | 'side' | 'back') => void;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  id,
  title,
  desc,
  icon: Icon,
  color,
  tag,
  disabled = false,
  onSelect,
}) => {
  const handleClick = () => {
    if (!disabled && (id === 'front' || id === 'side' || id === 'back')) {
      onSelect(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${title}: ${desc}${disabled ? ' (即将上线)' : ''}`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "group relative bento-card-glass p-10 flex flex-col items-start text-left transition-all duration-500 hover:translate-y-[-8px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2",
        disabled ? "opacity-40 grayscale cursor-not-allowed" : "hover:shadow-[0_40px_80px_rgba(13,148,136,0.15)] hover:ring-2 hover:ring-antey-primary/20 bg-white/40 border-white/60"
      )}
    >
      <div 
        className={cn(
          "w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br text-white",
          color
        )}
        aria-hidden="true"
      >
        <Icon size={32} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/60">{tag}</span>
          {disabled && (
            <span className="px-2 py-0.5 bg-slate-200/50 text-[8px] font-black text-slate-500 rounded-md uppercase tracking-widest">
              即将上线
            </span>
          )}
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-antey-primary transition-colors">
          {title}
        </h3>
        <p className="text-[13px] font-medium text-slate-600/80 leading-relaxed max-w-[240px]">
          {desc}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-2 text-antey-primary font-black text-[11px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
        立即启动评估
        <ArrowRight size={16} className="animate-pulse" aria-hidden="true" />
      </div>

      <div 
        className={cn(
          "absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br opacity-[0.05] rounded-full blur-2xl transition-all group-hover:opacity-[0.15] group-hover:scale-150",
          color
        )}
        aria-hidden="true"
      />
    </button>
  );
};

export const assessmentCards: Array<Omit<AssessmentCardProps, 'onSelect'>> = [
  { id: 'front', title: '正面体态扫描', desc: '评估 O/X 型腿、高低肩、骨盆侧倾', icon: Scan, color: 'from-blue-500 to-cyan-400', tag: '基础评估' },
  { id: 'side', title: '侧面体态分析', desc: '诊断圆肩驼背、头颈前倾、骨盆前倾', icon: Activity, color: 'from-emerald-500 to-teal-400', tag: '关键指标' },
  { id: 'back', title: '背面平衡测试', desc: '监测脊柱侧弯风险、足跟轴线', icon: Activity, color: 'from-purple-500 to-indigo-400', tag: '结构对称' },
  { id: 'squat', title: '深蹲功能检测', desc: '评估下肢稳定性与关节联动', icon: Zap, color: 'from-orange-500 to-amber-400', tag: '动态进阶', disabled: true },
  { id: 'scoliosis', title: '脊柱侧弯筛查', desc: '深度 3D 脊柱曲率建模与评估', icon: Dna, color: 'from-rose-500 to-pink-400', tag: '专项检测', disabled: true },
  { id: 'custom', title: '自定义评估', desc: '灵活配置您的个性化检测流程', icon: Settings2, color: 'from-slate-500 to-slate-400', tag: '实验室', disabled: true },
];
