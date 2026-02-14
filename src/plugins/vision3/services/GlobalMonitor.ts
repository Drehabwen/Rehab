import { usePostureAssessmentStore, PostureFrame, Landmark } from '../store/usePostureAssessmentStore';
import { DataProcessor } from './DataProcessor';

/**
 * GlobalMonitor: 评估流程的核心调度器
 * 负责：ROI 检查、运动稳定性监测 (A+B)、采样控制、状态流转
 */
class GlobalMonitor {
  private static instance: GlobalMonitor;
  private onAnalysisReady: ((data: ReturnType<typeof DataProcessor.prepareAnalysisData>) => void) | null = null;

  private constructor() {}

  public static getInstance(): GlobalMonitor {
    if (!GlobalMonitor.instance) {
      GlobalMonitor.instance = new GlobalMonitor();
    }
    return GlobalMonitor.instance;
  }

  /**
   * 注册分析就绪回调
   */
  public registerAnalysisCallback(callback: (data: ReturnType<typeof DataProcessor.prepareAnalysisData>) => void) {
    this.onAnalysisReady = callback;
  }

  private stabilityBuffer: Landmark[][] = [];
  private readonly STABILITY_WINDOW = 15; // 15帧滑动窗口
  private readonly STABILITY_THRESHOLD = 0.008; // 稳定性阈值（归一化坐标标准差）
  
  private captureStartTime: number = 0;
  private readonly CAPTURE_DURATION = 2000; // 采样持续时间 2s
  
  private stabilityTimer: NodeJS.Timeout | null = null;
  private isStabilizing: boolean = false;

  /**
   * 外部入口：每帧 Mediapipe 结果泵入
   */
  public onFrame(landmarks: Landmark[]) {
    const { step } = usePostureAssessmentStore.getState();

    switch (step) {
      case 'prep_upper':
        this.handlePreparation(landmarks, 'upper');
        break;
      case 'capturing_upper':
        this.handleCapture(landmarks, 'upper');
        break;
      case 'prep_lower':
        this.handlePreparation(landmarks, 'lower');
        break;
      case 'capturing_lower':
        this.handleCapture(landmarks, 'lower');
        break;
      default:
        // 其他阶段不处理帧数据
        break;
    }
  }

  /**
   * 处理准备阶段：ROI 检查 + 稳定性监测
   */
  private handlePreparation(landmarks: Landmark[], side: 'upper' | 'lower') {
    const { setStabilityProgress } = usePostureAssessmentStore.getState();

    // 1. A 方案：ROI 检查 (关键点必须可见且在合理区域)
    if (!this.checkROI(landmarks, side)) {
      this.resetStability();
      return;
    }

    // 2. B 方案：稳定性监测
    this.stabilityBuffer.push(landmarks);
    if (this.stabilityBuffer.length > this.STABILITY_WINDOW) {
      this.stabilityBuffer.shift();
    }

    if (this.stabilityBuffer.length === this.STABILITY_WINDOW) {
      const stabilityScore = this.calculateStability(this.stabilityBuffer);
      
      // 映射稳定性得分到进度条 (0-100)
      const progress = Math.min(100, Math.max(0, (1 - stabilityScore / this.STABILITY_THRESHOLD) * 100));
      setStabilityProgress(progress);

      if (stabilityScore < this.STABILITY_THRESHOLD) {
        if (!this.isStabilizing) {
          this.startStabilityCountdown(side);
        }
      } else {
        this.resetStability();
      }
    }
  }

  /**
   * 启动稳定性倒计时（只有持续稳定 1s 才会触发采样）
   */
  private startStabilityCountdown(side: 'upper' | 'lower') {
    this.isStabilizing = true;
    this.stabilityTimer = setTimeout(() => {
      const { setStep } = usePostureAssessmentStore.getState();
      setStep(side === 'upper' ? 'capturing_upper' : 'capturing_lower');
      this.captureStartTime = Date.now();
      this.isStabilizing = false;
    }, 1000); // 持续稳定 1 秒
  }

  private resetStability() {
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }
    this.isStabilizing = false;
    usePostureAssessmentStore.getState().setStabilityProgress(0);
  }

  /**
   * 处理采样阶段：记录 2s 数据
   */
  private handleCapture(landmarks: Landmark[], side: 'upper' | 'lower') {
    const { addUpperFrame, addLowerFrame, setCaptureProgress, setStep, setResult } = usePostureAssessmentStore.getState();
    
    const elapsed = Date.now() - this.captureStartTime;
    const progress = Math.min(100, (elapsed / this.CAPTURE_DURATION) * 100);
    setCaptureProgress(progress);

    const frame: PostureFrame = {
      timestamp: Date.now(),
      landmarks
    };

    if (side === 'upper') addUpperFrame(frame);
    else addLowerFrame(frame);

    if (elapsed >= this.CAPTURE_DURATION) {
      if (side === 'upper') {
        setStep('prep_lower');
        this.stabilityBuffer = [];
      } else {
        setStep('stitching');
        // 异步执行计算密集型任务
        setTimeout(() => {
          const { upperFrames, lowerFrames } = usePostureAssessmentStore.getState();
          
          // 1. 生成对齐结果 (用于前端展示骨骼)
          const result = DataProcessor.process(upperFrames, lowerFrames);
          setResult(result);

          // 2. 生成语义分析数据并发送给 LLM
          if (this.onAnalysisReady) {
            setStep('analyzing');
            const analysisData = DataProcessor.prepareAnalysisData(upperFrames, lowerFrames);
            this.onAnalysisReady(analysisData);
          }
        }, 100);
      }
    }
  }

  /**
   * ROI 校验逻辑
   * 上半身：肩部 (11, 12) 和 胯部 (23, 24) 必须可见
   * 下半身：胯部 (23, 24) 必须可见，且膝盖 (25, 26) 或 踝部 (27, 28) 至少有一组可见
   */
  private checkROI(landmarks: Landmark[], side: 'upper' | 'lower'): boolean {
    if (side === 'upper') {
      const upperPoints = [11, 12, 23, 24];
      return upperPoints.every(idx => 
        landmarks[idx] && (landmarks[idx].visibility || 0) > 0.75
      );
    } else {
      // 下半身 ROI 优化：
      // 1. 胯部 (23, 24) 是对齐桥梁，必须极其清晰
      const hipsVisible = [23, 24].every(idx => 
        landmarks[idx] && (landmarks[idx].visibility || 0) > 0.8
      );
      
      // 2. 膝盖或踝部至少有一对可见，增加容错性（防止脚部超出画面）
      const kneesVisible = [25, 26].every(idx => 
        landmarks[idx] && (landmarks[idx].visibility || 0) > 0.6
      );
      const anklesVisible = [27, 28].every(idx => 
        landmarks[idx] && (landmarks[idx].visibility || 0) > 0.5
      );

      return hipsVisible && (kneesVisible || anklesVisible);
    }
  }

  /**
   * 计算稳定性（核心点坐标的标准差均值）
   */
  private calculateStability(buffer: Landmark[][]): number {
    const keyPoints = [11, 12, 23, 24]; // 使用躯干关键点判断稳定性
    let totalVar = 0;

    keyPoints.forEach(idx => {
      const xValues = buffer.map(f => f[idx].x);
      const yValues = buffer.map(f => f[idx].y);
      totalVar += this.getStandardDeviation(xValues) + this.getStandardDeviation(yValues);
    });

    return totalVar / (keyPoints.length * 2);
  }

  private getStandardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  public start() {
    const { reset, setStep } = usePostureAssessmentStore.getState();
    reset();
    
    // 重置内部状态
    this.stabilityBuffer = [];
    this.isStabilizing = false;
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }
    this.captureStartTime = 0;

    setStep('prep_upper');
  }

  public stop() {
    this.resetStability();
    usePostureAssessmentStore.getState().reset();
  }
}

export const globalMonitor = GlobalMonitor.getInstance();
