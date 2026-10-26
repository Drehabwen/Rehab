/// <reference lib="webworker" />
/**
 * 端侧 ASR worker（sherpa-onnx WASM）。
 * 资源未就绪时返回 { available: false }，由主线程降级为要点点选。
 */

type InitMessage = { type: 'init' };
type TranscribeMessage = { type: 'transcribe'; samples: Float32Array };
type Incoming = InitMessage | TranscribeMessage;

type SherpaRuntime = {
  init: (assets: string, model: string) => Promise<void>;
  transcribe: (samples: Float32Array) => Promise<string>;
};

declare const self: DedicatedWorkerGlobalScope;
let runtime: SherpaRuntime | null = null;
let unavailableReason: string | null = null;

async function loadRuntime(): Promise<SherpaRuntime | null> {
  try {
    const response = await fetch('/asr/sherpa-onnx-wasm-main.js', { method: 'HEAD' });
    if (!response.ok) {
      unavailableReason = 'model-not-deployed';
      return null;
    }
    const module = await import(/* @vite-ignore */ '/asr/sherpa-onnx-wasm-main.js' as string);
    const factory = (module as { default?: unknown }).default;
    if (typeof factory !== 'function') {
      unavailableReason = 'runtime-invalid';
      return null;
    }
    const instance = await (factory as (config: unknown) => Promise<{ init?: unknown; transcribe?: unknown }>)({
      locateFile: (file: string) => '/asr/' + file,
    });
    if (typeof instance.init !== 'function' || typeof instance.transcribe !== 'function') {
      unavailableReason = 'runtime-invalid';
      return null;
    }
    await (instance.init as (a: string, b: string) => Promise<void>)('/asr/', '/asr/model/model.onnx');
    return { init: instance.init as SherpaRuntime['init'], transcribe: instance.transcribe as SherpaRuntime['transcribe'] };
  } catch {
    unavailableReason = 'load-failed';
    return null;
  }
}

self.onmessage = async (event: MessageEvent<Incoming>) => {
  const message = event.data;
  if (message.type === 'init') {
    runtime = await loadRuntime();
    self.postMessage({ type: 'ready', available: runtime !== null, reason: unavailableReason });
    return;
  }
  if (message.type === 'transcribe') {
    if (!runtime) {
      self.postMessage({ type: 'result', text: '', available: false, reason: unavailableReason ?? 'not-initialized' });
      return;
    }
    try {
      const text = await runtime.transcribe(message.samples);
      self.postMessage({ type: 'result', text, available: true });
    } catch {
      self.postMessage({ type: 'result', text: '', available: false, reason: 'transcribe-failed' });
    }
  }
};
