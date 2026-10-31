import { joinEndpoint, isLlmReady, loadAiConfig, type AiConfig } from './config';

/** 与现有 StructuredCase 对齐的六个字段（另支持 SOAP 由模型自行补齐）。 */
export interface StructuredCaseResult {
  主诉?: string;
  现病史?: string;
  既往史?: string;
  体格检查?: string;
  诊断?: string;
  处理意见?: string;
}

export type StructureResult =
  | { ok: true; data: StructuredCaseResult }
  | { ok: false; reason: string };

const FIELDS = ['主诉', '现病史', '既往史', '体格检查', '诊断', '处理意见'] as const;

const SYSTEM_PROMPT = [
  '你是康复科病历结构化助手。',
  '输入是康复师与患者的问诊转写文本（可能口语化、有错别字、不完整）。',
  '请提取并输出严格 JSON，键固定为：主诉、现病史、既往史、体格检查、诊断、处理意见。',
  '要求：',
  '1. 只输出 JSON，不要 markdown 代码块、不要解释；',
  '2. 每个值为简洁的中文医学表述，未提及的字段用空字符串 ""；',
  '3. 不臆造未出现的信息，不写患者姓名。',
].join('\n');

function extractJson(raw: string): string | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/u, '').replace(/```$/u, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return trimmed.slice(start, end + 1);
}

function normalize(parsed: Record<string, unknown>): StructuredCaseResult {
  const result: StructuredCaseResult = {};
  for (const field of FIELDS) {
    const value = parsed[field];
    result[field] = typeof value === 'string' ? value.trim() : '';
  }
  return result;
}

/**
 * 把转写文本交给 LLM 结构化为病历字段。
 * 失败重试 1 次；仍失败返回原因，调用方保留原始转写让康复师手动整理。
 */
export async function structureTranscript(transcript: string, config: AiConfig = loadAiConfig(), timeoutMs = 30000): Promise<StructureResult> {
  if (!isLlmReady(config)) return { ok: false, reason: 'llm-not-configured' };
  const text = transcript.trim();
  if (text.length === 0) return { ok: false, reason: 'empty-transcript' };

  const attempt = async (): Promise<StructureResult> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(joinEndpoint(config.llm.baseUrl, '/chat/completions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.llm.apiKey}` },
        body: JSON.stringify({
          model: config.llm.model,
          temperature: config.llm.temperature,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) return { ok: false, reason: `http-${response.status}` };
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content ?? '';
      const json = extractJson(content);
      if (!json) return { ok: false, reason: 'invalid-json' };
      return { ok: true, data: normalize(JSON.parse(json) as Record<string, unknown>) };
    } catch (error) {
      return { ok: false, reason: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network-error' };
    } finally {
      window.clearTimeout(timer);
    }
  };

  const first = await attempt();
  if (first.ok) return first;
  return attempt();
}

export function summarizeStructured(data: StructuredCaseResult): string {
  return FIELDS.map((field) => data[field]).filter((value) => value && value.length > 0).join('；');
}
