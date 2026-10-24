/**
 * React 绑定层：Provider / useKernel / <Slot> / 插件错误边界。
 *
 * <Slot> 在没有 Provider 时渲染 null，保证既有页面与单测不受影响。
 */
import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { Kernel } from './kernel';
import type { SlotMap, SlotName } from './types';
import { KEYED_SLOTS } from './types';

const KernelContext = createContext<Kernel | null>(null);

export const KernelProvider: React.FC<{ kernel: Kernel; children: React.ReactNode }> = ({
  kernel,
  children,
}) => {
  useEffect(() => {
    void kernel.start();
    return () => {
      void kernel.stop();
    };
  }, [kernel]);
  return <KernelContext.Provider value={kernel}>{children}</KernelContext.Provider>;
};

export function useKernel(): Kernel | null {
  return useContext(KernelContext);
}

/** 订阅插件状态（设置页/演示页）。 */
export function usePluginStates(): ReturnType<Kernel['states']> {
  const kernel = useKernel();
  const subscribe = useMemo(
    () => (listener: () => void) => (kernel === null ? () => {} : kernel.subscribe(listener)),
    [kernel],
  );
  // 快照必须是稳定值，否则 useSyncExternalStore 会无限重渲染
  const revision = useSyncExternalStore(
    subscribe,
    () => (kernel === null ? 0 : kernel.revision()),
    () => (kernel === null ? 0 : kernel.revision()),
  );
  return useMemo(() => (kernel === null ? [] : kernel.states()), [kernel, revision]);
}

/** 单个插件的错误边界：坏插件只停用自己。 */
export class PluginBoundary extends React.Component<
  { pluginId: string; children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown): void {
    console.error(`[plugin:${this.props.pluginId}] 渲染失败`, error);
  }

  render(): React.ReactNode {
    if (this.state.error !== null) {
      return (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          插件 {this.props.pluginId} 渲染失败（已隔离）：{this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

type SlotProps<N extends SlotName> = {
  name: N;
  /** keyed 插槽的匹配键（如评估类型、事件类型）。 */
  keyValue?: string;
} & SlotMap[N];

/**
 * 渲染一个插槽。
 * - list 插槽：按 order 渲染全部贡献
 * - keyed 插槽：只渲染 key === keyValue 的贡献
 */
export function Slot<N extends SlotName>(props: SlotProps<N>): React.ReactElement | null {
  const kernel = useKernel();
  const { name, keyValue, ...rest } = props as SlotProps<N> & { keyValue?: string };

  const subscribe = useMemo(
    () => (listener: () => void) => (kernel === null ? () => {} : kernel.slots.subscribe(listener)),
    [kernel],
  );
  // 快照必须实时读取注册表（返回稳定字符串），不能用渲染期冻结的值
  const getSnapshot = useMemo(
    () => () => {
      if (kernel === null) return '';
      const entries = KEYED_SLOTS.has(name)
        ? kernel.slots.forKey(name, keyValue ?? '')
        : kernel.slots.list(name);
      return entries.map((entry) => entry.id).join('|');
    },
    [kernel, name, keyValue],
  );
  const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (kernel === null || ids === '') return null;
  const entries = KEYED_SLOTS.has(name)
    ? kernel.slots.forKey(name, keyValue ?? '')
    : kernel.slots.list(name);

  return (
    <>
      {entries.map((entry) => {
        const Component = entry.component as unknown as React.ComponentType<Record<string, unknown>>;
        return (
          <PluginBoundary key={`${entry.slot}/${entry.id}`} pluginId={entry.id}>
            <Component {...(rest as Record<string, unknown>)} slotId={entry.id} />
          </PluginBoundary>
        );
      })}
    </>
  );
}

/** keyed 插槽是否有任何匹配条目（决定是否渲染外层容器）。 */
export function useSlotHasEntries(name: SlotName, keyValue?: string): boolean {
  const kernel = useKernel();
  const subscribe = useMemo(
    () => (listener: () => void) => (kernel === null ? () => {} : kernel.slots.subscribe(listener)),
    [kernel],
  );
  const snapshot = useMemo(
    () => () => {
      // 实时读取，保证插件启停后立刻反映
      if (kernel === null) return false;
      return KEYED_SLOTS.has(name)
        ? kernel.slots.forKey(name, keyValue ?? '').length > 0
        : kernel.slots.list(name).length > 0;
    },
    [kernel, name, keyValue],
  );
  return useSyncExternalStore(subscribe, snapshot, snapshot);}
