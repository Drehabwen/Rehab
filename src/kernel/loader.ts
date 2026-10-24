/**
 * 内置插件加载器。
 *
 * 构建期用 import.meta.glob 静态收集 src/plugins 下每个插件的 index.ts（可 tree-shake）；
 * Electron 外部插件走 loadExternal（后续阶段实现，见 docs/PLUGIN_ARCHITECTURE.md）。
 */
import type { Plugin } from './types';

const modules = import.meta.glob('../plugins/*/{index,plugin}.{ts,tsx}', { eager: true }) as Record<
  string,
  { plugin?: Plugin }
>;

/** 收集 src/plugins 下声明的插件，按 manifest.id 去重。 */
export function loadBuiltinPlugins(): Plugin[] {
  const result: Plugin[] = [];
  const seen = new Set<string>();
  for (const [path, module] of Object.entries(modules)) {
    const plugin = module.plugin;
    // 既有功能目录（rom/vision3/medvoice）不是内核插件，静默跳过
    if (plugin === undefined) continue;
    if (seen.has(plugin.manifest.id)) {
      console.warn(`[kernel] 插件 id 重复：${plugin.manifest.id}（${path} 被跳过）`);
      continue;
    }
    seen.add(plugin.manifest.id);
    result.push(plugin);
  }
  return result.sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
}
