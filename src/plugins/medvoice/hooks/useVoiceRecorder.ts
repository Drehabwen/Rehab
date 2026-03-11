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

  // 保持 ref 与最新录音状态同步。
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // 建立后端驱动的录音 WebSocket 连接，并避免重复创建。
  const connectWS = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return wsRef.current;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(CONFIG.medvoice.wsRecordUrl);

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
        } else if (data.status === 'started') {
          console.log('Recording started successfully');
          setIsRecording(true);
          setRecordTime(0);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setRecordTime((prev) => prev + 1);
          }, 1000);
        } else if (data.status === 'power') {
          onWaveformUpdate(data.power || 0);
        } else if (data.status === 'error') {
          console.error('ASR Error:', data.message);
          alert(`语音识别异常: ${data.message}`);
          setIsRecording(false);
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setIsRecording(false);
    };

    ws.onclose = (event) => {
      console.log('Backend-driven WebSocket closed', event.code, event.reason);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    wsRef.current = ws;
    return ws;
  }, [onTranscriptUpdate, onTranscriptComplete, onWaveformUpdate]);

  const startRecording = async () => {
    const ws = connectWS();
    let retryCount = 0;
    const maxRetries = 50; // 最多等待 5 秒。

    const sendStart = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command: 'start' }));
      } else if (ws.readyState === WebSocket.CONNECTING && retryCount < maxRetries) {
        retryCount += 1;
        setTimeout(sendStart, 100);
      } else {
        console.error('Failed to start recording: WebSocket not open', ws.readyState);
        setIsRecording(false);
      }
    };

    sendStart();
  };

  const stopRecording = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'stop' }));
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }, []);

  // 组件卸载时主动停止录音并关闭连接。
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ command: 'stop' }));
        }
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isRecording,
    recordTime,
    startRecording,
    stopRecording,
  };
};
