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

  // 鍚屾 ref
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // 鍒濆鍖?WebSocket 杩炴帴锛堝悗绔富瀵兼ā寮忥級
  const connectWS = useCallback(() => {
    // 濡傛灉宸叉湁杩炴帴涓旂姸鎬佹甯革紝鐩存帴杩斿洖
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return wsRef.current;
    }

    // 濡傛灉宸叉湁杩炴帴浣嗗凡鍏抽棴锛屽厛娓呯悊
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Use backend-driven recording endpoint
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
            setRecordTime(prev => prev + 1);
          }, 1000);
        } else if (data.status === 'power') {
          onWaveformUpdate(data.power || 0);
        } else if (data.status === 'error') {
          console.error('ASR Error:', data.message);
          alert(`褰曢煶閿欒: ${data.message}`);
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
    const maxRetries = 50; // 5绉掕秴鏃?
    
    // 绛夊緟杩炴帴寤虹珛鍚庡彂閫佹寚浠?
    const sendStart = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command: 'start' }));
      } else if (ws.readyState === WebSocket.CONNECTING && retryCount < maxRetries) {
        retryCount++;
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

  // 缁勪欢鍗歌浇鏃舵竻鐞嗚祫婧?
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
