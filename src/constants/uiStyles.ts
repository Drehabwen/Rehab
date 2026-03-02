// UI样式常量
export const COLORS = {
  // 主题颜色
  primary: {
    blue: 'bg-blue-500',
    blueLight: 'bg-blue-400',
    blueHover: 'hover:bg-blue-600',
    blueText: 'text-blue-400',
    blueBg: 'bg-blue-500/20',
    blueBorder: 'border-blue-500/20',
    blueShadow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
  },
  secondary: {
    purple: 'bg-purple-600',
    purpleLight: 'bg-purple-400',
    purpleHover: 'hover:bg-purple-700',
    purpleText: 'text-purple-400',
    purpleBg: 'bg-purple-500/20',
    purpleBorder: 'border-purple-500/20',
    purpleShadow: 'shadow-[0_0_15px_rgba(168,85,247,0.1)]',
  },
  success: {
    emerald: 'bg-emerald-500',
    emeraldLight: 'bg-emerald-400',
    emeraldHover: 'hover:bg-emerald-600',
    emeraldText: 'text-emerald-400',
    emeraldBg: 'bg-emerald-500/20',
    emeraldBorder: 'border-emerald-500/30',
    emeraldShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
  },
  info: {
    cyan: 'bg-cyan-500',
    cyanLight: 'bg-cyan-400',
    cyanText: 'text-cyan-400',
    cyanBg: 'bg-cyan-500/10',
    cyanBorder: 'border-cyan-500/20',
  },
  warning: {
    amber: 'bg-amber-500',
    amberText: 'text-amber-500',
    amberBg: 'bg-amber-500/20',
    amberBorder: 'border-amber-500/30',
  },
  danger: {
    rose: 'bg-rose-500',
    roseText: 'text-rose-500',
    roseBg: 'bg-rose-500/20',
    roseBorder: 'border-rose-500/30',
  },
  neutral: {
    white: 'bg-white',
    whiteText: 'text-white',
    whiteBg: 'bg-white/5',
    whiteBorder: 'border-white/10',
    whiteBorder20: 'border-white/20',
    slate: 'bg-slate-900',
    slateText: 'text-slate-400',
    slateBg: 'bg-slate-900/40',
    slateBg80: 'bg-slate-900/80',
    slateBorder: 'border-slate-800/50',
    slateBorder30: 'border-slate-800/30',
    slate100: 'bg-slate-100',
    slate200: 'bg-slate-200',
    slate500: 'text-slate-500',
    slate600: 'text-slate-600',
  },
  antey: {
    primary: 'bg-antey-primary',
    primaryText: 'text-antey-primary',
    primaryBg: 'bg-antey-primary/20',
    primaryBorder: 'border-antey-primary/30',
    primaryShadow: 'shadow-antey-primary/40',
    accent: 'bg-antey-accent',
    accentText: 'text-antey-accent',
    accentBg: 'bg-antey-accent/20',
    accentBorder: 'border-antey-accent/30',
    accentShadow: 'shadow-antey-accent/40',
  },
};

export const SIZES = {
  // 间距
  gap: {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6',
    xxl: 'gap-8',
  },
  // 内边距
  padding: {
    xs: 'px-2 py-0.5',
    sm: 'px-3 py-1',
    md: 'px-4 py-1.5',
    lg: 'px-6 py-3',
    xl: 'px-8 py-4',
    xxl: 'px-10 py-5',
  },
  // 圆角
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    full: 'rounded-full',
    pill: 'rounded-[2rem]',
    pillLg: 'rounded-[2.5rem]',
    pillXl: 'rounded-[3.5rem]',
  },
  // 字体大小
  font: {
    xs: 'text-[8px]',
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-[11px]',
    xl: 'text-sm',
    xxl: 'text-lg',
    xxxl: 'text-2xl',
    xxxxl: 'text-4xl',
    xxxxxl: 'text-5xl',
    xxxxxxl: 'text-7xl',
  },
  // 尺寸
  size: {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-10 h-10',
    lg: 'w-48 h-48',
    xl: 'w-64 h-96',
    xxl: 'w-80',
    xxxl: 'w-16 h-16',
  },
};

export const ANIMATIONS = {
  fadeIn: 'animate-in fade-in duration-500',
  slideInTop: 'animate-in slide-in-from-top-8 duration-700',
  slideInRight: 'animate-in slide-in-from-right-4 duration-500',
  slideInLeft: 'animate-in slide-in-from-left-4 duration-500',
  slideInBottom: 'animate-in slide-in-from-bottom-12 duration-1000',
  zoomIn: 'animate-in zoom-in-95 duration-500',
  pulse: 'animate-pulse',
  pulseSubtle: 'animate-pulse-subtle',
  ping: 'animate-ping',
  spin: 'animate-spin',
  spinSlow: 'animate-spin duration-[3000ms]',
  scan: 'animate-scan',
};

export const TRANSITIONS = {
  default: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  medium: 'transition-all duration-500',
};

export const SHADOWS = {
  sm: 'shadow-sm',
  md: 'shadow-xl',
  lg: 'shadow-2xl',
  inner: 'shadow-inner',
};

export const BACKDROP = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-xl',
  lg: 'backdrop-blur-3xl',
};

export default {
  COLORS,
  SIZES,
  ANIMATIONS,
  TRANSITIONS,
  SHADOWS,
  BACKDROP,
};