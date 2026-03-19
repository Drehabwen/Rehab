import { useState, useRef, useCallback, useEffect } from 'react';
import { CONFIG } from '@/config';

interface UseVoiceRecorderProps {
  onTranscriptUpdate: (text: string) => void;
  onTranscriptComplete: (text: string) => void;
  onWaveformUpdate: (power: number) => void;
}

export const useVoiceRecorder = ({
  onTranscriptUpdate,
  onTranscriptComplete,
  onWaveformUpdate,
}: UseVoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const isRecordingRef = useRef(false);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    setRecordTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordTime((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 保持 ref 与最新录音状态同步。
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const resolveWsCandidates = useCallback(() => {
    const set = new Set<string>();
    const push = (value?: string | null) => {
      if (!value) return;
      const normalized = value.trim();
      if (!normalized) return;
      set.add(normalized);
    };

    if (typeof window !== 'undefined' && window.location.host) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      push(`${wsProtocol}//${window.location.host}/medvoice/ws/record`);
    }
    push(CONFIG.medvoice.wsRecordUrl);

    return Array.from(set);
  }, []);

  const bindSocketHandlers = useCallback((ws: WebSocket) => {

    ws.onopen = () => {
      console.log('Backend-driven WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'update') {
          onTranscriptUpdate(data.text || '');
        } else if (data.status === 'complete') {
          onTranscriptComplete(data.text || '');
          setIsRecording(false);
          stopTimer();
        } else if (data.status === 'started') {
          console.log('Recording started successfully');
          if (!isRecordingRef.current) {
            setIsRecording(true);
            startTimer();
          }
        } else if (data.status === 'power') {
          onWaveformUpdate(data.power || 0);
        } else if (data.status === 'error') {
          console.error('ASR Error:', data.message);
          alert(`语音识别异常: ${data.message}`);
          setIsRecording(false);
          stopTimer();
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setIsRecording(false);
      stopTimer();
    };

    ws.onclose = (event) => {
      console.log('Backend-driven WebSocket closed', event.code, event.reason);
      setIsRecording(false);
      stopTimer();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };

    wsRef.current = ws;
    return ws;
  }, [onTranscriptUpdate, onTranscriptComplete, onWaveformUpdate, startTimer, stopTimer]);

  const startRecording = async () => {
    if (isRecordingRef.current) {
      return;
    }

    const candidates = resolveWsCandidates();
    let lastErrorMessage = '';

    for (const url of candidates) {
      try {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }

        const ws = await new Promise<WebSocket>((resolve, reject) => {
          const socket = new WebSocket(url);
          const timeout = setTimeout(() => {
            socket.close();
            reject(new Error(`连接超时: ${url}`));
          }, 5000);

          socket.onopen = () => {
            clearTimeout(timeout);
            resolve(socket);
          };
          socket.onerror = () => {
            clearTimeout(timeout);
            reject(new Error(`连接失败: ${url}`));
          };
        });

        bindSocketHandlers(ws);
        ws.send(JSON.stringify({ command: 'start' }));
        setIsRecording(true);
        startTimer();
        return;
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to connect medvoice recorder:', lastErrorMessage);
      }
    }

    setIsRecording(false);
    stopTimer();
    alert(`开始录音失败：${lastErrorMessage || '无法连接录音服务，请检查后端服务是否启动。'}\n尝试地址: ${candidates.join(' | ')}`);
  };

  const stopRecording = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'stop' }));
    }
    setIsRecording(false);
    stopTimer();
  }, [stopTimer]);

  // 组件卸载时主动停止录音并关闭连接。
  useEffect(() => {
    return () => {
      stopTimer();
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ command: 'stop' }));
        }
        wsRef.current.close();
      }
    };
  }, [stopTimer]);

  return {
    isRecording,
    recordTime,
    startRecording,
    stopRecording,
  };
};
