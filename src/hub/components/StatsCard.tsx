import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { StatCard, type StatTone } from '@/components/ui/StatCard';

/**
 * @deprecated 使用 `StatCard`（components/ui）。此文件仅为兼容旧引用保留。
 */
interface StatsCardProps {
  count: number;
  label: string;
  icon: LucideIcon;
  variant?: 'primary' | 'blue' | 'amber' | 'emerald';
  onClick?: () => void;
}

const TONE_BY_VARIANT: Record<NonNullable<StatsCardProps['variant']>, StatTone> = {
  primary: 'brand',
  blue: 'info',
  amber: 'warn',
  emerald: 'success',
};

export const StatsCard: React.FC<StatsCardProps> = ({ count, label, icon, variant = 'primary', onClick }) => (
  <StatCard value={count} label={label} icon={icon} tone={TONE_BY_VARIANT[variant]} onClick={onClick} />
);
