import * as mpPose from '@mediapipe/pose';

/**
 * Robustly resolve constants and constructors from @mediapipe/pose.
 * MediaPipe's UMD/ESM dual-packaging often causes missing export issues in Vite/HMR.
 */

// Resolve the main Pose constructor
type PoseModule = {
  Pose?: typeof mpPose.Pose;
  POSE_CONNECTIONS?: Connection[];
  default?: {
    Pose?: typeof mpPose.Pose;
    POSE_CONNECTIONS?: Connection[];
  };
};

const globalWindow = (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {});
const poseModule = mpPose as PoseModule;

export const Pose = poseModule.Pose || poseModule.default?.Pose || (globalWindow.Pose as typeof mpPose.Pose | undefined) || (typeof mpPose === 'function' ? mpPose : null);

// Resolve POSE_CONNECTIONS
export const POSE_CONNECTIONS = poseModule.POSE_CONNECTIONS || poseModule.default?.POSE_CONNECTIONS || (globalWindow.POSE_CONNECTIONS as Connection[] | undefined) || [
  [24, 26], [26, 28], [23, 25], [25, 27], [12, 24], [11, 23], [24, 23], [12, 11], [12, 14], [14, 16], [11, 13], [13, 15],
  [16, 18], [16, 20], [16, 22], [18, 20], [15, 17], [15, 19], [15, 21], [17, 19], [2, 0], [5, 0], [0, 1], [0, 4], [1, 2],
  [2, 3], [3, 7], [4, 5], [5, 6], [6, 8], [9, 10]
];

// Types
export type Results = mpPose.Results;
export type Options = mpPose.Options;
export type Landmark = mpPose.Landmark;
export type Connection = [number, number];
