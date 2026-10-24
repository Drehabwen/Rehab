/**
 * 内核契约：插件清单、插件接口、插槽类型、服务类型。
 *
 * 纪律（见 docs/PLUGIN_ARCHITECTURE.md）：
 * - 插件之间零直接 import，只能通过 ctx.services 与 <Slot> 协作
 * - 插件不直连数据库 / IndexedDB，持久化一律走内核服务
 * - apply() 必须返回可逆的 disposer
 */
import type { ComponentType } from 'react';

/** 报告中心的模块结果视图模型（与 hub 侧 assessmentOutputs 结构对齐，内核不依赖 hub 类型）。 */
export interface ReportModuleLike {
  type: string;
  output?: unknown;
  presentation: { title: string; description: string; icon: unknown; accentClassName: string };
  summaryText: string;
  evidenceText: string;
}

/** 首批插槽目录。keyed 插槽（记录渲染器 / 时间线事件）按 key 匹配。 */
export interface SlotMap {
  'sidebar.entries': { order?: number };
  'today.panels': { order?: number };
  'patient.overview.cards': { patientId: string; order?: number };
  'assessment.tools': { order?: number; onOpenTool?: (toolId: string) => void };
  'assessment.workspace': {
    order?: number;
    patientId?: string;
    sessionId?: string;
    onBack?: () => void;
  };
  'assessment.result.renderers': {
    assessmentType: string;
    order?: number;
    module?: ReportModuleLike;
    assessment?: unknown;
    onViewDetails?: (assessment: unknown) => void;
  };
  'report.sections': {
    reportId?: string;
    assessmentType?: string;
    order?: number;
    modules?: ReportModuleLike[];
  };
  'timeline.kinds': { eventKind: string; order?: number };
  'patient.toolbox.actions': { patientId: string; order?: number };
}

export type SlotName = keyof SlotMap;

/** 这些插槽按 key 分发（同一种数据、不同插件各自渲染）。 */
export const KEYED_SLOTS: ReadonlySet<SlotName> = new Set<SlotName>([
  'assessment.workspace',
  'assessment.result.renderers',
  'timeline.kinds',
]);

/** 插槽组件收到的 props = 插槽声明 + 注册时写入的 slotId。 */
export type SlotComponent<N extends SlotName> = ComponentType<
  SlotMap[N] & { slotId: string }
>;

/** 插件清单。apiVersion 与内核契约版本不一致时拒绝加载。 */
export interface PluginManifest {
  /** 全局唯一，小写短横线，例如 'vision3'。 */
  id: string;
  version: string;
  /** 内核契约版本；内核升级破坏兼容时 +1。 */
  apiVersion: number;
  displayName: string;
  description?: string;
  /** 依赖的服务名，缺失时插件停在 pending，不阻塞其它插件。 */
  inject?: string[];
  /** 本插件提供的服务名（用于依赖排序）。 */
  provides?: string[];
  /** 声明式能力，供设置页展示与权限检查。 */
  capabilities?: string[];
  permissions?: string[];
  /** 是否内置（内置插件随包发布，外部插件从用户目录加载）。 */
  builtin?: boolean;
}

/** 插件可用的内核上下文。 */
export interface PluginContext {
  manifest: PluginManifest;
  services: {
    get<T = unknown>(name: string): T;
    has(name: string): boolean;
  };
  slots: {
    register<N extends SlotName>(
      slot: N,
      id: string,
      component: SlotComponent<N>,
      options?: { order?: number; key?: string },
    ): () => void;
  };
  log: (message: string, detail?: unknown) => void;
}

/** 一个插件模块。 */
export interface Plugin {
  manifest: PluginManifest;
  apply(ctx: PluginContext): void | (() => void);
}

/** 内核服务接口：插件只认这些名字，不认具体实现。 */
export interface KernelServices {
  /** 患者读写（迁移期先包 Dexie，后端化后换 API，插件无感）。 */
  patientStore?: {
    list(query?: string): Promise<unknown[]>;
    get(id: string): Promise<unknown | undefined>;
  };
  /** 事件流（时间线的唯一来源）。 */
  eventStore?: {
    append(event: unknown): Promise<void>;
    list(patientId: string): Promise<unknown[]>;
  };
  /** LLM 调用。 */
  llm?: {
    complete(prompt: string, options?: unknown): Promise<string>;
  };
  /** 审计。 */
  audit?: {
    log(action: string, target: unknown, before?: unknown, after?: unknown): void;
  };
  /** 权限。 */
  permissions?: {
    has(scope: string): boolean;
    require(scope: string): void;
  };
  [name: string]: unknown;
}

/** 插件运行状态：设置页与演示页据此展示。 */
export type PluginStatus = 'registered' | 'pending' | 'active' | 'disabled' | 'error';

export interface PluginRuntimeState {
  manifest: PluginManifest;
  status: PluginStatus;
  error?: string;
  /** 已注册的插槽贡献，卸载时用于展示/清理。 */
  contributions: { slot: SlotName; id: string }[];
}
