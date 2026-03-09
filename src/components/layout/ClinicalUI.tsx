import React from 'react';
import { ChevronLeft, MoreHorizontal, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UnifiedStatus = 'success' | 'processing' | 'warning' | 'error' | 'disabled';

const statusClassMap: Record<UnifiedStatus, string> = {
  success: 'status-success',
  processing: 'status-processing',
  warning: 'status-warning',
  error: 'status-error',
  disabled: 'status-disabled',
};

interface StatusBadgeProps {
  status: UnifiedStatus;
  text: string;
  className?: string;
}

export const UnifiedStatusBadge: React.FC<StatusBadgeProps> = ({ status, text, className }) => (
  <span className={cn('status-badge', statusClassMap[status], className)}>{text}</span>
);

interface PageTitleSectionProps {
  title: string;
  description: string;
  right?: React.ReactNode;
  className?: string;
}

export const PageTitleSection: React.FC<PageTitleSectionProps> = ({
  title,
  description,
  right,
  className,
}) => {
  return (
    <section className={cn('rehab-page-title flex items-end justify-between gap-4', className)}>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {right ? <div className="flex items-center gap-3">{right}</div> : null}
    </section>
  );
};

interface PatientHeaderBarProps {
  name: string;
  meta: string;
  avatar: string;
  onBack?: () => void;
  onSettings?: () => void;
  onMore?: () => void;
  className?: string;
}

export const PatientHeaderBar: React.FC<PatientHeaderBarProps> = ({
  name,
  meta,
  avatar,
  onBack,
  onSettings,
  onMore,
  className,
}) => {
  return (
    <div className={cn('patient-header-bar px-6 md:px-8', className)}>
      <div className="h-full max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <button onClick={onBack} className="btn-icon" aria-label="back">
              <ChevronLeft size={18} />
            </button>
          ) : null}
          <div className="w-10 h-10 rounded-xl bg-antey-primary text-white flex items-center justify-center text-sm font-semibold">
            {avatar}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
            <div className="text-xs text-slate-500 truncate">{meta}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSettings ? (
            <button onClick={onSettings} className="btn-icon" aria-label="settings">
              <Settings size={16} />
            </button>
          ) : null}
          {onMore ? (
            <button onClick={onMore} className="btn-icon" aria-label="more">
              <MoreHorizontal size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

interface StatePanelProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export const StatePanel: React.FC<StatePanelProps> = ({ title, description, actions }) => {
  return (
    <section className="state-panel">
      <h3>{title}</h3>
      <p>{description}</p>
      {actions ? <div className="mt-4 flex items-center justify-center gap-3">{actions}</div> : null}
    </section>
  );
};
