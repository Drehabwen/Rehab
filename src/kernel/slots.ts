/**
 * 插槽注册表。
 *
 * list 插槽：按 order 升序渲染全部条目。
 * keyed 插槽：按注册时的 key 匹配，同一 key 下也按 order 排序。
 *
 * 不依赖 React，方便单测。
 */
import type { SlotName, SlotComponent } from './types';
import { KEYED_SLOTS } from './types';

export interface SlotEntry<N extends SlotName = SlotName> {
  slot: N;
  id: string;
  key?: string;
  order: number;
  component: SlotComponent<N>;
}

type Listener = () => void;

export class SlotRegistry {
  private readonly entries = new Map<string, SlotEntry[]>();
  private readonly listeners = new Set<Listener>();

  /** 注册一个插槽条目，返回反注册函数（幂等）。 */
  register<N extends SlotName>(
    slot: N,
    id: string,
    component: SlotComponent<N>,
    options: { order?: number; key?: string } = {},
  ): () => void {
    if (KEYED_SLOTS.has(slot) && (options.key === undefined || options.key === '')) {
      throw new Error(`slot "${slot}" 是 keyed 插槽，注册时必须提供 key`);
    }
    const entry: SlotEntry = {
      slot,
      id,
      key: options.key,
      order: options.order ?? 100,
      component: component as SlotComponent<SlotName>,
    };
    const list = this.entries.get(slot) ?? [];
    const next = [...list.filter((item) => item.id !== id), entry].sort(
      (a, b) => a.order - b.order || a.id.localeCompare(b.id),
    );
    this.entries.set(slot, next);
    this.emit();
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      const current = this.entries.get(slot) ?? [];
      this.entries.set(slot, current.filter((item) => item.id !== id));
      this.emit();
    };
  }

  /** list 插槽的全部条目。 */
  list<N extends SlotName>(slot: N): SlotEntry<N>[] {
    return (this.entries.get(slot) ?? []) as SlotEntry<N>[];
  }

  /** keyed 插槽中匹配 key 的条目。 */
  forKey<N extends SlotName>(slot: N, key: string): SlotEntry<N>[] {
    return this.list(slot).filter((entry) => entry.key === key);
  }

  /** 某插件注册过的所有条目（卸载与设置页展示用）。 */
  byOwner(idPrefix: string): SlotEntry[] {
    const result: SlotEntry[] = [];
    for (const list of this.entries.values()) {
      for (const entry of list) {
        if (entry.id === idPrefix || entry.id.startsWith(`${idPrefix}/`)) result.push(entry);
      }
    }
    return result;
  }

  /** 订阅变化（React 外部 store 用）。 */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
