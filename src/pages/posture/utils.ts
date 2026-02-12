import { Landmark } from '@/hooks/usePostureWS';

export const BOX = {
  xMin: 0.25,
  xMax: 0.75,
  yMin: 0.1,
  yMax: 0.9
};

export const checkUserPosition = (landmarks: Landmark[]) => {
  if (!landmarks || landmarks.length < 33) return false;

  // Check visibility of key points (Nose, Shoulders, Hips, Ankles)
  const keyPointsIndices = [0, 11, 12, 23, 24, 27, 28];
  const visible = keyPointsIndices.every(idx => (landmarks[idx].visibility ?? 0) > 0.5);
  if (!visible) return false;

  // Check bounds
  const nose = landmarks[0];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const inX = 
    nose.x > BOX.xMin && nose.x < BOX.xMax &&
    leftShoulder.x > (BOX.xMin - 0.05) && rightShoulder.x < (BOX.xMax + 0.05);
    
  const inY = 
    nose.y > (BOX.yMin - 0.05) && nose.y < 0.45 && // Head in upper section
    (leftAnkle.y > 0.55 || rightAnkle.y > 0.55) && // At least one foot in lower section
    (leftAnkle.y < BOX.yMax || rightAnkle.y < BOX.yMax);

  return inX && inY;
};
