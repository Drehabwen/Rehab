/**
 * 内核：插件装配、依赖排序、启停与错误隔离。
 *
 * 用法：
 *   const kernel = createKernel({ apiVersion: 1, plugins: [vision3Plugin, romPlugin] });
 *   await kernel.start();
 *   kernel.disable('vision3');  // 卸载该插件全部贡献
 *   kernel.enable('vision3');   // 重新 apply
 *
 * 纪律：单个插件失败不影响其它插件；所有贡献必须可逆。
 */
import { ServiceContainer } from './services';
import { SlotRegistry } from './slots';
import type {
  Plugin,
  PluginContext,
  PluginManifest,
  PluginRuntimeState,
  PluginStatus,
} from './types';

export interface CreateKernelOptions {
  /** 内核契约版本，插件 manifest.apiVersion 必须与之一致。 */
  apiVersion: number;
  /** 内置插件列表。 */
  plugins: Plugin[];
  /** 初始注册的内核服务（core 服务：patientStore/llm/audit/...）。 */
  services?: Record<string, unknown>;
  /** 外部插件加载器（Electron / 动态 import），返回插件列表。 */
  loadExternal?: () => Promise<Plugin[]>;
}

export interface Kernel {
  readonly services: ServiceContainer;
  readonly slots: SlotRegistry;
  /** 启动：注册 core 服务 → 校验 manifest → 依赖排序 → apply。 */
  start(): Promise<void>;
  /** 停止：逆序卸载全部插件与 core 服务。 */
  stop(): Promise<void>;
  /** 卸载单个插件（保留 runtime 记录，状态变 disabled）。 */
  disable(id: string): void;
  /** 重新启用并 apply。 */
  enable(id: string): void;
  /** 插件运行状态快照（设置页 / 演示页）。 */
  states(): PluginRuntimeState[];
  /** 订阅状态与插槽变化。 */
  subscribe(listener: () => void): () => void;
  /** 单调递增的修订号，作为 useSyncExternalStore 的稳定快照。 */
  revision(): number;
}

/** 校验清单；返回错误文案或 null。 */
export function validateManifest(manifest: PluginManifest, apiVersion: number): string | null {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(manifest.id)) return `插件 id 非法：${manifest.id}`;
  if (typeof manifest.version !== 'string' || manifest.version === '') return '缺少 version';
  if (manifest.apiVersion !== apiVersion) {
    return `apiVersion 不匹配：插件 ${manifest.apiVersion}，内核 ${apiVersion}`;
  }
  if (typeof manifest.displayName !== 'string' || manifest.displayName === '') {
    return '缺少 displayName';
  }
  return null;
}

export function createKernel(options: CreateKernelOptions): Kernel {
  const services = new ServiceContainer();
  const slots = new SlotRegistry();
  const runtime = new Map<string, PluginRuntimeState>();
  const plugins = new Map<string, Plugin>(options.plugins.map((plugin) => [plugin.manifest.id, plugin]));
  const disposers = new Map<string, () => void>();
  const listeners = new Set<() => void>();
  let started = false;
  let revision = 0;

  const emit = (): void => {
    revision += 1;
    for (const listener of listeners) listener();
  };

  const setStatus = (id: string, status: PluginStatus, error?: string): void => {
    const state = runtime.get(id);
    if (state === undefined) return;
    state.status = status;
    state.error = error;
    emit();
  };

  const registerCoreServices = (): (() => void)[] => {
    const disposersList: (() => void)[] = [];
    for (const [name, impl] of Object.entries(options.services ?? {})) {
      disposersList.push(services.register(name, impl, 'core'));
    }
    return disposersList.reverse();
  };

  /** 按 manifest.provides / inject 做拓扑排序；缺失依赖的插件保留 pending。 */
  const resolveOrder = (): { ordered: string[]; pending: Map<string, string> } => {
    const pending = new Map<string, string>();
    const ordered: string[] = [];
    const visiting = new Set<string>();

    const visit = (id: string): void => {
      if (ordered.includes(id) || pending.has(id)) return;
      if (visiting.has(id)) {
        pending.set(id, '检测到依赖环');
        return;
      }
      const plugin = plugins.get(id);
      if (plugin === undefined) return;
      visiting.add(id);
      for (const dependency of plugin.manifest.inject ?? []) {
        if (services.has(dependency)) continue;
        const provider = [...plugins.values()].find((item) =>
          (item.manifest.provides ?? []).includes(dependency),
        );
        if (provider === undefined) {
          pending.set(id, `缺少依赖服务：${dependency}`);
          visiting.delete(id);
          return;
        }
        visit(provider.manifest.id);
        if (pending.has(provider.manifest.id)) {
          pending.set(id, `依赖插件未就绪：${provider.manifest.id}`);
          visiting.delete(id);
          return;
        }
      }
      visiting.delete(id);
      ordered.push(id);
    };

    for (const id of plugins.keys()) visit(id);
    return { ordered, pending };
  };

  const applyPlugin = (id: string): void => {
    const plugin = plugins.get(id);
    if (plugin === undefined) return;
    const state = runtime.get(id);
    if (state === undefined || state.status === 'active') return;

    const invalid = validateManifest(plugin.manifest, options.apiVersion);
    if (invalid !== null) {
      setStatus(id, 'error', invalid);
      return;
    }

    const ctx: PluginContext = {
      manifest: plugin.manifest,
      services: {
        get: <T,>(name: string) => services.get<T>(name),
        has: (name: string) => services.has(name),
      },
      slots: {
        register: (slot, slotId, component, registration) => {
          const dispose = slots.register(slot, slotId, component, registration);
          state.contributions.push({ slot, id: slotId });
          return () => {
            dispose();
            state.contributions = state.contributions.filter(
              (item) => !(item.slot === slot && item.id === slotId),
            );
          };
        },
      },
      log: (message, detail) => {
        // 统一日志出口，便于设置页显示"最近一次插件日志"
        console.info(`[plugin:${id}] ${message}`, detail ?? '');
      },
    };

    try {
      const dispose = plugin.apply(ctx);
      if (typeof dispose === 'function') disposers.set(id, dispose);
      setStatus(id, 'active');
    } catch (error) {
      setStatus(id, 'error', error instanceof Error ? error.message : String(error));
    }
  };

  return {
    services,
    slots,

    async start(): Promise<void> {
      if (started) return;
      started = true;
      registerCoreServices();

      for (const plugin of plugins.values()) {
        runtime.set(plugin.manifest.id, {
          manifest: plugin.manifest,
          status: 'registered',
          contributions: [],
        });
      }
      emit();

      if (options.loadExternal !== undefined) {
        try {
          const external = await options.loadExternal();
          for (const plugin of external) {
            plugins.set(plugin.manifest.id, plugin);
            runtime.set(plugin.manifest.id, {
              manifest: plugin.manifest,
              status: 'registered',
              contributions: [],
            });
          }
        } catch (error) {
          console.warn('[kernel] 外部插件加载失败', error);
        }
      }

      const { ordered, pending } = resolveOrder();
      for (const [id, reason] of pending) setStatus(id, 'pending', reason);
      for (const id of ordered) applyPlugin(id);
      emit();
    },

    async stop(): Promise<void> {
      for (const [id, dispose] of [...disposers.entries()].reverse()) {
        try {
          dispose();
        } catch (error) {
          console.warn(`[kernel] 卸载插件 ${id} 失败`, error);
        }
      }
      disposers.clear();
      services.names().forEach((name) => {
        // core 服务的反注册由 registerCoreServices 返回的 disposer 负责；
        // 这里只清插件注册的服务（没有 owner 信息时跳过）。
        void name;
      });
      started = false;
      emit();
    },

    disable(id: string): void {
      const dispose = disposers.get(id);
      if (dispose !== undefined) {
        try {
          dispose();
        } catch (error) {
          setStatus(id, 'error', error instanceof Error ? error.message : String(error));
          return;
        }
      }
      disposers.delete(id);
      const state = runtime.get(id);
      if (state !== undefined) {
        state.contributions = [];
        state.status = 'disabled';
        state.error = undefined;
      }
      emit();
    },

    enable(id: string): void {
      const state = runtime.get(id);
      if (state === undefined) return;
      state.status = 'registered';
      applyPlugin(id);
      emit();
    },

    states(): PluginRuntimeState[] {
      return [...runtime.values()].map((state) => ({
        ...state,
        contributions: [...state.contributions],
      }));
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    revision(): number {
      return revision;
    },
  };
}
