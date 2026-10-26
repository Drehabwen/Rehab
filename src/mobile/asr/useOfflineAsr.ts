import { useCallback, useEffect, useRef, useState } from 'react';

export type AsrStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

/**
 * 端侧 ASR 客户端：懒加载 worker，资源缺失时状态为 unavailable（调用方降级）。
 */
export function useOfflineAsr() {
  const workerRef = useRef<Worker | null>(null);
  const [status, setStatus] = useState<AsrStatus>('idle');

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      setStatus('unavailable');
      return undefined;
    }
    const worker = new Worker(new URL('./asrWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<{ type: string; available?: boolean }>) => {
      if (event.data.type === 'ready') setStatus(event.data.available ? 'ready' : 'unavailable');
    };
    setStatus('loading');
    worker.postMessage({ type: 'init' });
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const transcribe = useCallback(async (samples: Float32Array): Promise<{ text: string; available: boolean }> => {
    const worker = workerRef.current;
    if (!worker || status === 'unavailable') return { text: '', available: false };
    return new Promise((resolve) => {
      const onMessage = (event: MessageEvent<{ type: string; text?: string; available?: boolean }>) => {
        if (event.data.type !== 'result') return;
        worker.removeEventListener('message', onMessage);
        resolve({ text: event.data.text ?? '', available: Boolean(event.data.available) });
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'transcribe', samples });
    });
  }, [status]);

  return { status, transcribe };
}

/** 把录音 Blob 解码为 16kHz 单声道 Float32 采样（sherpa-onnx 需要）。 */
export async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContext({ sampleRate: 16000 });
  const audio = await context.decodeAudioData(arrayBuffer.slice(0));
  const channel = audio.getChannelData(0);
  await context.close();
  return channel;
}
