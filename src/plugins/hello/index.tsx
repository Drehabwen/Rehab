/**
 * hello —— 内核示例插件（P-A 阶段用于验证装配链路）。
 *
 * 演示三件事：
 * 1. manifest 声明依赖（inject audit）与能力（provides hello.greeting）
 * 2. 向三个插槽贡献 UI（sidebar 入口 / 今日面板 / 时间线事件渲染）
 * 3. apply 返回 disposer，停用后贡献全部回收
 */
import React from 'react';
import type { Plugin } from '@/kernel/types';

const SidebarEntry: React.FC<{ slotId: string }> = () => (
  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600">
    <span className="grid h-4 w-4 place-items-center rounded border border-slate-300 text-[10px]">H</span>
    示例插件
  </div>
);

const TodayPanel: React.FC<{ slotId: string }> = () => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
    <div className="text-sm font-medium text-slate-700">来自 hello 插件的今日面板</div>
    <div className="mt-1 text-xs text-slate-500">
      这条内容由内核插槽渲染，停用插件后会消失——用来验证贡献可逆。
    </div>
  </div>
);

const TimelineKind: React.FC<{ slotId: string; eventKind: string }> = ({ eventKind }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
    示例事件渲染（kind = {eventKind}）：由 hello 插件提供
  </div>
);

export const plugin: Plugin = {
  manifest: {
    id: 'hello',
    version: '0.1.0',
    apiVersion: 1,
    displayName: '示例插件',
    description: '验证内核装配、插槽贡献与可逆卸载',
    inject: ['audit'],
    provides: ['hello.greeting'],
    capabilities: ['demo'],
    permissions: [],
    builtin: true,
  },
  apply(ctx) {
    ctx.log('apply');

    const disposeSidebar = ctx.slots.register('sidebar.entries', 'hello/sidebar', SidebarEntry, {
      order: 500,
    });
    const disposeToday = ctx.slots.register('today.panels', 'hello/today', TodayPanel, { order: 500 });
    const disposeTimeline = ctx.slots.register('timeline.kinds', 'hello/timeline-note', TimelineKind, {
      order: 500,
      key: 'note',
    });

    const audit = ctx.services.get<{ log: (action: string, target: unknown) => void }>('audit');
    audit.log('plugin.enabled', { plugin: ctx.manifest.id });

    return () => {
      disposeSidebar();
      disposeToday();
      disposeTimeline();
    };
  },
};
