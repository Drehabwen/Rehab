import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceRecorderProps {
  onTranscriptUpdate: (text: string) => void;
  onTranscriptComplete: (text: string) => void;
  onWaveformUpdate: (power: number) => void;
}

/** 检查浏览器是否支持 Web Speech API 语音识别 */
const isSpeechSupported = (): boolean => {
  return !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);
};

export const useVoiceRecorder = ({
  onTranscriptUpdate,
  onTranscriptComplete,
  onWaveformUpdate,
}: UseVoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef('');
  const isManualStopRef = useRef(false);

  /** 挂载时检测浏览器是否支持 */
  useEffect(() => {
    setIsSupported(isSpeechSupported());
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert('您的浏览器不支持语音识别。请使用 Chrome 浏览器。');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';       // 中文普通话
    recognition.interimResults = true; // 实时中间结果
    recognition.continuous = true;     // 持续识别
    recognition.maxAlternatives = 1;

    transcriptRef.current = '';
    isManualStopRef.current = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const current = transcriptRef.current + final + interim;
      if (final) {
        transcriptRef.current += final;
      }

      onTranscriptUpdate(current);

      // 模拟音频波形（Web Speech API 不提供真实波形数据）
      onWaveformUpdate(Math.random() * 0.7 + 0.3);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message);
      if (event.error === 'no-speech') {
        // 没有说话，静默处理
      } else if (event.error === 'aborted') {
        // 用户主动停止，忽略
      } else {
        console.warn('语音识别出错:', event.error);
      }
    };

    recognition.onend = () => {
      // 如果不是主动停止，自动重启（保持连续识别）
      if (!isManualStopRef.current) {
        try {
          recognition.start();
        } catch {
          // recognition 可能已结束，忽略
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setRecordTime(0);

    // 启动计时器
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordTime((prev) => prev + 1);
    }, 1000);
  }, [onTranscriptUpdate, onWaveformUpdate]);

  const stopRecording = useCallback(() => {
    isManualStopRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // recognition 可能已经停止
      }
      recognitionRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    onTranscriptComplete(transcriptRef.current);
  }, [onTranscriptComplete]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isManualStopRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    recordTime,
    isSupported,
    startRecording,
    stopRecording,
  };
};
