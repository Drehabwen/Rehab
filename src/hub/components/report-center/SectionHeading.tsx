import React from 'react';

const sectionEyebrowClass = 'text-[11px] font-semibold tracking-[0.14em] text-slate-400';

export const SectionHeading: React.FC<{
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = ({ eyebrow, title, description, icon }) => (
  <div className="flex min-w-0 items-start justify-between gap-3">
    <div className="min-w-0">
      <div className={sectionEyebrowClass}>{eyebrow}</div>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
      {icon}
    </div>
  </div>
);
