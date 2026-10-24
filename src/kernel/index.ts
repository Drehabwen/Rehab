/**
 * 应用内核：注册 core 服务 + 装载内置插件。
 *
 * core 服务在 P-A 阶段先给最小实现（console 审计 / 全放行权限 / 占位 LLM）；
 * P0 后端化时把 patientStore/eventStore 换成 API 实现，插件无需改动。
 */
import { createKernel, type Kernel } from './kernel';
import { loadBuiltinPlugins } from './loader';
import type { KernelServices } from './types';

const API_VERSION = 1;

/** 当前登录者（后端鉴权上线前先用固定占位）。 */
export interface Principal {
  userId: string;
  displayName: string;
  role: 'admin' | 'therapist' | 'assistant';
}

const principal: Principal = { userId: 'local', displayName: '本机康复师', role: 'therapist' };

const coreServices: KernelServices = {
  audit: {
    log(action, target, before, after) {
      // 先落 console；接入 backend 后改为 POST /api/audit
      console.info('[audit]', { actor: principal.userId, action, target, before, after });
    },
  },
  permissions: {
    has: () => true,
    require(scope: string) {
      if (!this.has(scope)) throw new Error(`缺少权限：${scope}`);
    },
  },
  llm: {
    async complete(prompt: string) {
      throw new Error(`LLM 服务尚未接线（收到 prompt 长度 ${prompt.length}）`);
    },
  },
  patientStore: {
    async list() {
      return [];
    },
    async get() {
      return undefined;
    },
  },
  eventStore: {
    async append() {
      return;
    },
    async list() {
      return [];
    },
  },
  principal,
};

let kernel: Kernel | null = null;

/** 单例：整个应用共用一份内核。 */
export function getAppKernel(): Kernel {
  if (kernel === null) {
    kernel = createKernel({
      apiVersion: API_VERSION,
      plugins: loadBuiltinPlugins(),
      services: coreServices as Record<string, unknown>,
    });
  }
  return kernel;
}

export { API_VERSION };
