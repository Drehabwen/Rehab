import { Landmark, PostureMetrics } from '@/hooks/usePostureWS';

export interface StabilityMetrics {
  swayArea: number;
  maxDeviation: number;
  sd: number;
  velocity: number;
}

export interface TemporalAnalysis {
  view: 'front' | 'side' | 'back';
  averages: PostureMetrics;
  stability: StabilityMetrics;
  timeSeries: {
    timestamp: number;
    metrics: PostureMetrics;
  }[];
  frameCount: number;
  duration: number;
}

/**
 * PostureProcessor - Handles temporal analysis of posture data.
 * Focuses on stability and filtered metric extraction.
 */
export class PostureProcessor {
  private static ALPHA = 0.3; // Smoothing factor for EMA

  /**
   * Processes a buffer of landmarks collected over time.
   */
  static process(
    buffer: Landmark[][],
    view: 'front' | 'side' | 'back',
    durationMs: number
  ): TemporalAnalysis {
    if (buffer.length === 0) {
      throw new Error('Empty buffer provided for analysis');
    }

    // 1. Filter out low-visibility frames
    const validFrames = buffer.filter(frame => 
      frame.length >= 33 && (frame[0].visibility ?? 0) > 0.5
    );

    // 2. Sample frames to ~10fps to reduce data size (20 frames for 2s)
    const targetFps = 10;
    const totalFramesNeeded = Math.round((durationMs / 1000) * targetFps);
    const step = Math.max(1, Math.floor(validFrames.length / totalFramesNeeded));
    
    const sampledFrames: Landmark[][] = [];
    for (let i = 0; i < validFrames.length; i += step) {
      sampledFrames.push(validFrames[i]);
      if (sampledFrames.length >= totalFramesNeeded) break;
    }

    // 3. Calculate stability once to get average CoM
    const stability = this.calculateStability(sampledFrames, durationMs);
    const comPath = sampledFrames.map(frame => ({
      x: (frame[23].x + frame[24].x) / 2,
      y: (frame[23].y + frame[24].y) / 2
    }));
    const avgX = comPath.reduce((a, b) => a + b.x, 0) / comPath.length;
    const avgY = comPath.reduce((a, b) => a + b.y, 0) / comPath.length;

    // 4. Extract metrics with EMA Smoothing
    let smoothedMetrics: PostureMetrics | null = null;
    const frameMetrics = sampledFrames.map((frame, index) => {
      const raw = this.extractFrameMetrics(frame, view);
      
      // Add sway offset for this frame
      const currentCom = comPath[index];
      const swayOffset = Math.sqrt(Math.pow(currentCom.x - avgX, 2) + Math.pow(currentCom.y - avgY, 2)) * 100;
      raw.swayOffset = swayOffset;

      if (!smoothedMetrics) {
        smoothedMetrics = { ...raw };
      } else {
        // Apply EMA: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
        Object.keys(raw).forEach(key => {
          const k = key as keyof PostureMetrics;
          if (typeof raw[k] === 'number') {
            (smoothedMetrics![k] as number) = 
              this.ALPHA * (raw[k] as number) + (1 - this.ALPHA) * (smoothedMetrics![k] as number);
          }
        });
      }
      return {
        timestamp: (index / sampledFrames.length) * durationMs,
        metrics: { ...smoothedMetrics }
      };
    });

    // 5. Calculate Averages (Static State)
    const averages = this.calculateAverages(frameMetrics.map(f => f.metrics));

    return {
      view,
      averages,
      stability,
      timeSeries: frameMetrics,
      frameCount: sampledFrames.length,
      duration: durationMs
    };
  }

  /**
   * Extracts posture metrics for a single frame based on the view.
   */
  private static extractFrameMetrics(landmarks: Landmark[], view: 'front' | 'side' | 'back'): PostureMetrics {
    const metrics: PostureMetrics = {};

    if (view === 'front' || view === 'back') {
      // Shoulder Angle (Horizontal)
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      metrics.shoulderAngle = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x) * (180 / Math.PI);

      // Hip Angle (Horizontal)
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      metrics.hipAngle = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x) * (180 / Math.PI);

      // Head Deviation
      const nose = landmarks[0];
      const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
      metrics.headDeviation = (nose.x - midShoulderX) * 100; // Normalized deviation
    } else if (view === 'side') {
      // Forward Head (Ear to Shoulder)
      const ear = landmarks[7]; // Left ear for side view
      const shoulder = landmarks[11];
      metrics.headForward = (ear.x - shoulder.x) * 100;

      // Shoulder Roundedness
      // Approximate using distance between shoulder and ear in Z-plane if available, 
      // or just X-offset in side view
      metrics.shoulderRounded = Math.abs(landmarks[11].x - landmarks[12].x) * 100;
    }

    return metrics;
  }

  /**
   * Calculates the average of each metric over time.
   */
  private static calculateAverages(metricsArray: PostureMetrics[]): PostureMetrics {
    const count = metricsArray.length;
    const sum: Record<string, number> = {};

    metricsArray.forEach(m => {
      Object.entries(m).forEach(([key, value]) => {
        if (typeof value === 'number') {
          sum[key] = (sum[key] || 0) + value;
        }
      });
    });

    const averages: PostureMetrics = {};
    Object.entries(sum).forEach(([key, value]) => {
      const k = key as keyof PostureMetrics;
      // Use type assertion to set the value safely
      (averages[k] as number) = value / count;
    });

    return averages;
  }

  /**
   * Calculates stability metrics based on Center of Mass (CoM) sway.
   */
  private static calculateStability(buffer: Landmark[][], durationMs: number): StabilityMetrics {
    // We use the midpoint of hips as a proxy for Center of Mass (CoM)
    const comPath = buffer.map(frame => {
      const leftHip = frame[23];
      const rightHip = frame[24];
      return {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2
      };
    });

    const avgX = comPath.reduce((a, b) => a + b.x, 0) / comPath.length;
    const avgY = comPath.reduce((a, b) => a + b.y, 0) / comPath.length;

    // Standard Deviation
    const sqDiffs = comPath.map(p => Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2));
    const variance = sqDiffs.reduce((a, b) => a + b, 0) / sqDiffs.length;
    const sd = Math.sqrt(variance);

    // Max Deviation
    const maxDev = Math.sqrt(Math.max(...sqDiffs));

    // Velocity (Total distance / time)
    let totalDist = 0;
    for (let i = 1; i < comPath.length; i++) {
      totalDist += Math.sqrt(
        Math.pow(comPath[i].x - comPath[i-1].x, 2) + 
        Math.pow(comPath[i].y - comPath[i-1].y, 2)
      );
    }
    const velocity = totalDist / (durationMs / 1000);

    return {
      swayArea: variance * Math.PI, // Approximation
      maxDeviation: maxDev,
      sd: sd,
      velocity: velocity
    };
  }
}
