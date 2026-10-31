/**
 * 讯飞「实时语音转写大模型」WebSocket 客户端（浏览器端）。
 *
 * 协议要点（官方文档 /doc/spark/asr_llm/rtasr_llm.html）：
 * - wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1?{query}
 * - 鉴权：参数剔除 signature 后按 key 升序、urlencode、& 拼接 → HmacSHA1(secret) → Base64
 * - 音频：16k / 16bit / 单声道 PCM，建议每 40ms 发 1280 字节
 * - 结束：发送 {"end":true,"sessionId":"..."}
 * - 结果：msg_type=result，词在 data.cn.st.rt.ws.cw.w，type=0 为确定结果
 */

export interface IflytekConfig {
  appId: string;
  apiKey: string;    // accessKeyId
  apiSecret: string; // accessKeySecret
  /** 领域个性化：medical 更适合康复问诊 */
  domain?: string;
}

export type IflytekResult = { ok: true; text: string } | { ok: false; reason: string };

const WS_ENDPOINT = 'wss://office-api-ast-dx.iflyaisol.com/ast/communicate/v1';
const FRAME_BYTES = 1280;
const SAMPLE_RATE = 16000;

const utf8 = (input: string): Uint8Array => new TextEncoder().encode(input);

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const hmacSha1Base64 = async (message: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, utf8(message));
  return toBase64(new Uint8Array(signature));
};

/** 按讯飞规则生成签名：参数排序 → urlencode → & 拼接 → HmacSHA1 → Base64 */
export async function buildIflytekSignature(params: Record<string, string>, secret: string): Promise<string> {
  const base = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  return hmacSha1Base64(base, secret);
}

function formatUtc(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offset = `${pad(Math.floor(Math.abs(offsetMinutes) / 60))}${pad(Math.abs(offsetMinutes) % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${offset}`;
}

/** 把任意音频 Blob 解码成 16k 单声道 Int16 PCM */
export async function decodeToPcm16k(blob: Blob): Promise<Int16Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  const audio = await context.decodeAudioData(arrayBuffer.slice(0));
  const channel = audio.getChannelData(0);
  await context.close();
  const pcm = new Int16Array(channel.length);
  for (let i = 0; i < channel.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, channel[i]));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return pcm;
}

/** 建立连接并上传音频，收集确定结果 */
export async function transcribeWithIflytek(
  blob: Blob,
  config: IflytekConfig,
  options: { timeoutMs?: number } = {},
): Promise<IflytekResult> {
  if (!config.appId || !config.apiKey || !config.apiSecret) return { ok: false, reason: 'iflytek-not-configured' };
  if (blob.size === 0) return { ok: false, reason: 'empty-audio' };

  let pcm: Int16Array;
  try {
    pcm = await decodeToPcm16k(blob);
  } catch {
    return { ok: false, reason: 'decode-failed' };
  }

  const sessionId = crypto.randomUUID();
  const params: Record<string, string> = {
    appId: config.appId,
    accessKeyId: config.apiKey,
    uuid: sessionId,
    utc: formatUtc(),
    audio_encode: 'pcm_s16le',
    lang: 'autodialect',
    samplerate: String(SAMPLE_RATE),
    role_type: '0',
  };
  if (config.domain) params.pd = config.domain;

  const signature = await buildIflytekSignature(params, config.apiSecret);
  const query = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const timeoutMs = options.timeoutMs ?? 120000;
  return new Promise<IflytekResult>((resolve) => {
    let settled = false;
    let text = '';
    let ws: WebSocket | null = null;
    const finish = (result: IflytekResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try { ws?.close(); } catch { /* ignore */ }
      resolve(result);
    };
    const timer = window.setTimeout(() => finish({ ok: false, reason: 'timeout' }), timeoutMs);

    try {
      ws = new WebSocket(`${WS_ENDPOINT}?${query}&signature=${encodeURIComponent(signature)}`);
    } catch {
      finish({ ok: false, reason: 'ws-open-failed' });
      return;
    }
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      const bytes = new Uint8Array(pcm.buffer);
      let offset = 0;
      const pump = () => {
        if (settled || !ws || ws.readyState !== WebSocket.OPEN) return;
        if (offset >= bytes.length) {
          ws.send(JSON.stringify({ end: true, sessionId }));
          return;
        }
        ws.send(bytes.slice(offset, offset + FRAME_BYTES));
        offset += FRAME_BYTES;
        window.setTimeout(pump, 40);
      };
      pump();
    };

    ws.onmessage = (event) => {
      let payload: unknown;
      try { payload = JSON.parse(String(event.data)); } catch { return; }
      const message = payload as {
        msg_type?: string;
        action?: string;
        code?: string;
        desc?: string;
        data?: { ls?: boolean; cn?: { st?: { type?: string; rt?: Array<{ ws?: Array<{ cw?: Array<{ w?: string }> }> }> } } };
      };
      if (message.action === 'error' || (message.code && message.code !== '0')) {
        finish({ ok: false, reason: `iflytek-${message.code ?? 'error'}:${message.desc ?? ''}` });
        return;
      }
      const st = message.data?.cn?.st;
      if (st?.rt) {
        let frame = '';
        for (const segment of st.rt) {
          for (const word of segment.ws ?? []) {
            for (const cw of word.cw ?? []) frame += cw.w ?? '';
          }
        }
        if (frame) {
          if (st.type === '0') text += frame;
          else text = text + frame;
        }
      }
      if (message.data?.ls === true) {
        finish({ ok: true, text: text.trim() });
      }
    };

    ws.onerror = () => finish({ ok: false, reason: 'ws-error' });
    ws.onclose = (event) => {
      if (!settled) {
        if (text.trim()) finish({ ok: true, text: text.trim() });
        else finish({ ok: false, reason: `ws-closed-${event.code}` });
      }
    };
  });
}
