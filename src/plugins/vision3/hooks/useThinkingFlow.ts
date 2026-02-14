import { useState, useEffect } from 'react';

export const THINKING_STEPS = [
  "正在提取人体关键点特征...",
  "计算生物力学偏离值...",
  "正在比对康复医学常模...",
  "AI 引擎正在生成个性化建议...",
  "构建多维评估报告..."
];

export function useThinkingFlow(step: string) {
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [fakeProgress, setFakeProgress] = useState(0);

  useEffect(() => {
    if (step === 'analyzing') {
      const interval = setInterval(() => {
        setThinkingIdx(prev => (prev + 1) % THINKING_STEPS.length);
      }, 1500);
      
      const progressInterval = setInterval(() => {
        setFakeProgress(prev => {
          if (prev >= 95) return prev; 
          return prev + Math.random() * 5;
        });
      }, 300);

      return () => {
        clearInterval(interval);
        clearInterval(progressInterval);
      };
    } else if (step === 'completed') {
      setFakeProgress(100);
    } else {
      setFakeProgress(0);
      setThinkingIdx(0);
    }
  }, [step]);

  return { thinkingIdx, fakeProgress };
}
