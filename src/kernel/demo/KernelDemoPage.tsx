/**
 * 内核演示页（/kernel-demo）：验证装配链路与插件可逆卸载。
 *
 * 这是 P-A 阶段的自检页，不是正式 UI；P-B 起插槽会接进真实页面
 * （评估中心 / 报告中心 / 患者时间线 / 今日工作台）。
 */
import React from 'react';
import { KernelProvider, Slot, useKernel, usePluginStates, useSlotHasEntries } from '@/kernel/react';
import { getAppKernel } from '@/kernel';
import type { SlotName } from '@/kernel/types';

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    disabled: 'bg-slate-200 text-slate-600',
    pending: 'bg-amber-100 text-amber-700',
    error: 'bg-rose-100 text-rose-700',
    registered: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
};

const SlotProbe: React.FC<{ name: SlotName; keyValue?: string }> = ({ name, keyValue }) => {
  const has = useSlotHasEntries(name, keyValue);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <code className="text-xs text-slate-500">
          {name}
          {keyValue !== undefined ? ` [key=${keyValue}]` : ''}
        </code>
        <span className={`text-xs ${has ? 'text-emerald-600' : 'text-slate-400'}`}>
          {has ? '有贡献' : '空'}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {name === 'patient.overview.cards' ? (
          <Slot name="patient.overview.cards" patientId="demo-patient" />
        ) : name === 'assessment.result.renderers' ? (
          <Slot name="assessment.result.renderers" keyValue={keyValue} assessmentType={keyValue ?? ''} />
        ) : name === 'timeline.kinds' ? (
          <Slot name="timeline.kinds" keyValue={keyValue} eventKind={keyValue ?? ''} />
        ) : name === 'report.sections' ? (
          <Slot name="report.sections" />
        ) : name === 'today.panels' ? (
          <Slot name="today.panels" />
        ) : name === 'sidebar.entries' ? (
          <Slot name="sidebar.entries" />
        ) : name === 'assessment.tools' ? (
          <Slot name="assessment.tools" />
        ) : (
          <Slot name="patient.toolbox.actions" patientId="demo-patient" />
        )}
      </div>
    </div>
  );
};

const Inner: React.FC = () => {
  const kernel = useKernel();
  const states = usePluginStates();
  const [tick, setTick] = React.useState(0);

  if (kernel === null) return <div className="p-8 text-slate-500">内核未注入</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <header>
        <h1 className="text-xl font-semibold text-slate-800">内核 · 插件装配自检</h1>
        <p className="mt-1 text-sm text-slate-500">
          P-A 阶段：验证 manifest 校验、依赖排序、插槽贡献、可逆卸载。正式 UI 在 P-B 接入。
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-700">服务</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {kernel.services.names().map((name) => (
            <code key={name} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {name}
            </code>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-700">插件</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1">id</th>
              <th className="py-1">版本</th>
              <th className="py-1">状态</th>
              <th className="py-1">贡献</th>
              <th className="py-1">操作</th>
            </tr>
          </thead>
          <tbody>
            {states.map((state) => (
              <tr key={state.manifest.id} className="border-t border-slate-100">
                <td className="py-2 font-mono text-xs">{state.manifest.id}</td>
                <td className="py-2 text-xs text-slate-500">{state.manifest.version}</td>
                <td className="py-2">
                  <StatusPill status={state.status} />
                </td>
                <td className="py-2 text-xs text-slate-500">
                  {state.contributions.length === 0
                    ? '—'
                    : state.contributions.map((item) => `${item.slot}/${item.id}`).join(', ')}
                </td>
                <td className="py-2">
                  {state.status === 'active' ? (
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      onClick={() => {
                        kernel.disable(state.manifest.id);
                        setTick(tick + 1);
                      }}
                    >
                      停用
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      onClick={() => {
                        kernel.enable(state.manifest.id);
                        setTick(tick + 1);
                      }}
                    >
                      启用
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {states.some((state) => state.error !== undefined) && (
          <div className="mt-3 rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {states
              .filter((state) => state.error !== undefined)
              .map((state) => `${state.manifest.id}：${state.error}`)
              .join('；')}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SlotProbe name="sidebar.entries" />
        <SlotProbe name="today.panels" />
        <SlotProbe name="timeline.kinds" keyValue="note" />
        <SlotProbe name="timeline.kinds" keyValue="assessment" />
        <SlotProbe name="assessment.result.renderers" keyValue="posture" />
        <SlotProbe name="patient.overview.cards" />
      </section>

      <p className="text-xs text-slate-400">
        提示：点「停用」后上面的贡献应立刻消失；点「启用」恢复。刷新页面后内核重新装配。
      </p>
    </div>
  );
};

export const KernelDemoPage: React.FC = () => {
  const kernel = React.useMemo(() => getAppKernel(), []);
  return (
    <KernelProvider kernel={kernel}>
      <Inner />
    </KernelProvider>
  );
};

export default KernelDemoPage;
