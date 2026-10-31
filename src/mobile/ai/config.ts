/**
 * 移动端 AI 配置（A 方案：手机直连云 ASR + LLM）。
 *
 * 安全约定：
 * - key 只保存在本机 localStorage，绝不写进仓库、不写进构建产物
 * - 提供"清除配置"入口；key 可随时在服务商侧吊销
 */

export type AsrProviderId = 'iflytek' | 'openai-compatible';

export interface IflytekConfig {
  appId: string;
  apiKey: string;
  apiSecret: string;
  domain: string;
}

export interface AsrConfig {
  provider: AsrProviderId;
  /** OpenAI 兼容端点（provider = openai-compatible 时使用） */
  baseUrl: string;
  apiKey: string;
  model: string;
  language: string;
  iflytek: IflytekConfig;
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
}

export interface AiConfig {
  asr: AsrConfig;
  llm: LlmConfig;
}

const STORAGE_KEY = 'qingyue.ai.config.v2';

export const DEFAULT_AI_CONFIG: AiConfig = {
  asr: {
    provider: 'iflytek',
    baseUrl: '',
    apiKey: '',
    model: 'whisper-1',
    language: 'zh',
    iflytek: { appId: '', apiKey: '', apiSecret: '', domain: 'medical' },
  },
  llm: {
    baseUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.2,
  },
};

export function loadAiConfig(): AiConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem('qingyue.ai.config.v1');
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return {
      asr: {
        ...DEFAULT_AI_CONFIG.asr,
        ...(parsed.asr ?? {}),
        iflytek: { ...DEFAULT_AI_CONFIG.asr.iflytek, ...(parsed.asr?.iflytek ?? {}) },
      },
      llm: { ...DEFAULT_AI_CONFIG.llm, ...(parsed.llm ?? {}) },
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAiConfig(config: AiConfig): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearAiConfig(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem('qingyue.ai.config.v1');
}

export function isAsrReady(config: AiConfig): boolean {
  if (config.asr.provider === 'iflytek') {
    const { appId, apiKey, apiSecret } = config.asr.iflytek;
    return Boolean(appId && apiKey && apiSecret);
  }
  return Boolean(config.asr.baseUrl && config.asr.apiKey && config.asr.model);
}

export function isLlmReady(config: AiConfig): boolean {
  return Boolean(config.llm.baseUrl && config.llm.apiKey && config.llm.model);
}

/** 拼接 OpenAI 兼容端点，容忍 baseUrl 末尾斜杠与是否已含 /v1。 */
export function joinEndpoint(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/u, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
