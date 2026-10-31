import { joinEndpoint, isAsrReady, loadAiConfig, type AiConfig } from './config';
import { transcribeWithIflytek } from './providers/asr-iflytek';

export type AsrResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

/**
 * ASR 分发器：按配置选择讯飞实时转写或 OpenAI 兼容端点。
 * 失败一律返回原因，调用方降级为「关键要点点选」。
 */
export async function transcribeAudio(
  blob: Blob,
  config: AiConfig = loadAiConfig(),
  timeoutMs = 120000,
): Promise<AsrResult> {
  if (!isAsrReady(config)) return { ok: false, reason: 'asr-not-configured' };
  if (blob.size === 0) return { ok: false, reason: 'empty-audio' };

  if (config.asr.provider === 'iflytek') {
    const result = await transcribeWithIflytek(blob, config.asr.iflytek, { timeoutMs });
    if (result.ok && result.text.trim().length === 0) return { ok: false, reason: 'empty-transcript' };
    return result;
  }
  return transcribeOpenAiCompatible(blob, config, timeoutMs);
}

async function transcribeOpenAiCompatible(blob: Blob, config: AiConfig, timeoutMs: number): Promise<AsrResult> {
  const form = new FormData();
  const extension = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'm4a' : 'wav';
  form.append('file', blob, `visit-audio.${extension}`);
  form.append('model', config.asr.model);
  if (config.asr.language) form.append('language', config.asr.language);

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(joinEndpoint(config.asr.baseUrl, '/audio/transcriptions'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.asr.apiKey}` },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, reason: `http-${response.status}` };
    const payload = (await response.json()) as { text?: string };
    const text = (payload.text ?? '').trim();
    return text.length > 0 ? { ok: true, text } : { ok: false, reason: 'empty-transcript' };
  } catch (error) {
    return { ok: false, reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network-error' };
  } finally {
    window.clearTimeout(timer);
  }
}
