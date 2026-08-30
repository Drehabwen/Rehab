import { useCallback, useState } from 'react';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { calculateAngle3D, Point3D } from '@/utils/math';
import type { JointType, MovementDirection } from '../types';

const midpoint3D = (left: Point3D, right: Point3D): Point3D => ({
  x: (left.x + right.x) / 2,
  y: (left.y + right.y) / 2,
  z: ((left.z || 0) + (right.z || 0)) / 2,
});

const vector3D = (from: Point3D, to: Point3D): Point3D => ({
  x: to.x - from.x,
  y: to.y - from.y,
  z: (to.z || 0) - (from.z || 0),
});

const safeAngleBetween = (v1: Point3D, v2: Point3D): number => {
  const angle = calculateAngle3D(v1, v2);
  return Number.isFinite(angle) ? angle : 0;
};

const deviationFromSameLine = (v1: Point3D, v2: Point3D): number => {
  const angle = safeAngleBetween(v1, v2);
  return Math.min(angle, Math.abs(180 - angle));
};

const deviationFromStraight = (v1: Point3D, v2: Point3D): number => {
  return Math.abs(180 - safeAngleBetween(v1, v2));
};

export function extractAngleFromResults(
  results: any,
  joint: JointType,
  direction: MovementDirection,
  side: 'left' | 'right',
): number {
  if (!results?.poseLandmarks?.length) {
    return 0;
  }

  const landmarks = results.poseLandmarks;

  switch (joint) {
    case 'cervical':
      return calculateCervicalAngle(landmarks, direction);
    case 'shoulder':
      return calculateShoulderAngle(landmarks, side, direction);
    case 'elbow':
      return calculateElbowAngle(landmarks, side);
    // @deprecated 以下关节需要特写或全身视角，单摄像头无法可靠测量
    // case 'wrist':     return calculateWristAngle(landmarks, side);
    // case 'hip':       return calculateHipAngle(landmarks, side);
    // case 'knee':      return calculateKneeAngle(landmarks, side);
    // case 'ankle':     return calculateAnkleAngle(landmarks, side, direction);
    default:
      return 0;
  }
}

export function calculateCervicalAngle(landmarks: any[], direction: MovementDirection): number {
  const nose = landmarks[0];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (!nose || !leftEar || !rightEar || !leftShoulder || !rightShoulder) {
    return 0;
  }

  const earMid = midpoint3D(leftEar, rightEar);
  const shoulderMid = midpoint3D(leftShoulder, rightShoulder);

  // ── 前屈 / 后伸（flexion / extension）──
  // 在正面摄像头视图中，前屈时耳中相对肩中下移、后伸时上移。
  // 测耳中→肩中连线与垂直方向的夹角，角度越大表示前屈/后伸幅度越大。
  if (direction === 'flexion' || direction === 'extension') {
    const earToShoulder: Point3D = {
      x: earMid.x - shoulderMid.x,
      y: earMid.y - shoulderMid.y,
      z: 0,
    };
    const vertical: Point3D = { x: 0, y: -1, z: 0 };
    return safeAngleBetween(earToShoulder, vertical);
  }

  // ── 左右侧屈（lateral_flexion）──
  // 兼容旧版 abduction/adduction 标签，新版统一使用 lateral_flexion。
  // 正面投影中，侧屈时鼻尖偏离躯干中线。
  // 测鼻子→肩中连线与垂直方向的夹角，角度越大表示侧屈幅度越大。
  if (direction === 'lateral_flexion' || direction === 'abduction' || direction === 'adduction') {
    const noseToMidShoulder: Point3D = {
      x: nose.x - shoulderMid.x,
      y: nose.y - shoulderMid.y,
      z: 0,
    };
    const vertical: Point3D = { x: 0, y: -1, z: 0 };
    return safeAngleBetween(noseToMidShoulder, vertical);
  }

  // ── 左右旋转（internal_rotation / external_rotation → rotation）──
  // 测双耳连线与双肩连线的三维夹角，去除 deviationFromSameLine 的
  // min(angle, 180-angle) 翻转，让旋转角度如实反映颈部转动幅度。
  if (direction === 'internal_rotation' || direction === 'external_rotation' || direction === 'rotation') {
    const shoulderLine = vector3D(leftShoulder, rightShoulder);
    const earLine = vector3D(leftEar, rightEar);
    return safeAngleBetween(shoulderLine, earLine);
  }

  return 0;
}

export function useROMAnalysis() {
  const {
    activeMeasurements,
    isMeasuring,
    startMeasurement,
    stopMeasurement,
    resetMeasurement,
    setSingleMeasurement,
    updateMeasurementData,
  } = useMeasurementStore();

  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [selectedDirection, setSelectedDirection] = useState<MovementDirection>('flexion');
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');

  const configureAssessment = useCallback(
    (joint: JointType, direction: MovementDirection, side: 'left' | 'right') => {
      setSelectedJoint(joint);
      setSelectedDirection(direction);
      setSelectedSide(side);
      setSingleMeasurement(joint as any, direction.replace('_', '-') as any, side);
    },
    [setSingleMeasurement],
  );

  const startROMAssessment = useCallback(() => {
    const convertedDirection = selectedDirection.replace('_', '-') as any;
    setSingleMeasurement(selectedJoint as any, convertedDirection, selectedSide);
    resetMeasurement();
    startMeasurement();
  }, [selectedDirection, selectedJoint, selectedSide, resetMeasurement, setSingleMeasurement, startMeasurement]);

  const stopROMAssessment = useCallback(() => {
    stopMeasurement();
  }, [stopMeasurement]);

  const handleResults = useCallback((results: any) => {
    if (isMeasuring && activeMeasurements.length > 0) {
      const convertedDirection = selectedDirection.replace('_', '-') as any;
      const measurement = activeMeasurements.find((item) => (
        item.joint === selectedJoint &&
        item.direction === convertedDirection &&
        item.side === selectedSide
      )) ?? activeMeasurements[0];
      const measurementSide = measurement.side === 'right' ? 'right' : 'left';
      const angle = extractAngleFromResults(
        results,
        measurement.joint as any,
        measurement.direction as any,
        measurementSide,
      );
      updateMeasurementData(measurement.id, angle);
    }
  }, [activeMeasurements, isMeasuring, selectedDirection, selectedJoint, selectedSide, updateMeasurementData]);

  return {
    activeMeasurements,
    isMeasuring,
    selectedJoint,
    selectedDirection,
    selectedSide,
    setSelectedJoint,
    setSelectedDirection,
    setSelectedSide,
    configureAssessment,
    startROMAssessment,
    stopROMAssessment,
    handleResults,
  };
}

function calculateShoulderAngle(landmarks: any[], side: 'left' | 'right', _direction: MovementDirection): number {
  const shoulderIndex = side === 'left' ? 11 : 12;
  const elbowIndex = side === 'left' ? 13 : 14;
  const hipIndex = side === 'left' ? 23 : 24;

  if (!landmarks[shoulderIndex] || !landmarks[elbowIndex] || !landmarks[hipIndex]) {
    return 0;
  }

  const shoulder = landmarks[shoulderIndex];
  const elbow = landmarks[elbowIndex];
  const hip = landmarks[hipIndex];

  const torsoVector = vector3D(shoulder, hip);
  const armVector = vector3D(shoulder, elbow);
  // 使用 safeAngleBetween 而非 deviationFromSameLine:
  // deviationFromSameLine 在手臂过头(180°)时返回 0°，因为 min(180, |180-180|)=0
  // 肩关节屈曲/外展范围 0-180°，应直接用原始3D夹角
  return safeAngleBetween(torsoVector, armVector);
}

function calculateElbowAngle(landmarks: any[], side: 'left' | 'right'): number {
  const shoulderIndex = side === 'left' ? 11 : 12;
  const elbowIndex = side === 'left' ? 13 : 14;
  const wristIndex = side === 'left' ? 15 : 16;

  if (!landmarks[shoulderIndex] || !landmarks[elbowIndex] || !landmarks[wristIndex]) {
    return 0;
  }

  const shoulder = landmarks[shoulderIndex];
  const elbow = landmarks[elbowIndex];
  const wrist = landmarks[wristIndex];

  return deviationFromStraight(vector3D(elbow, shoulder), vector3D(elbow, wrist));
}

/** @deprecated 腕关节角度计算 — 摄像头无法精确捕捉手腕小关节动作，保留代码以便后续硬件升级后恢复 */
function calculateWristAngle(landmarks: any[], side: 'left' | 'right'): number {
  const elbowIndex = side === 'left' ? 13 : 14;
  const wristIndex = side === 'left' ? 15 : 16;
  const handIndex = side === 'left' ? 19 : 20;

  if (!landmarks[elbowIndex] || !landmarks[wristIndex] || !landmarks[handIndex]) {
    return 0;
  }

  const elbow = landmarks[elbowIndex];
  const wrist = landmarks[wristIndex];
  const hand = landmarks[handIndex];

  return deviationFromStraight(vector3D(wrist, elbow), vector3D(wrist, hand));
}

/** @deprecated 髋关节角度计算 — 需要全身视角，单摄像头实际使用率低，保留代码以便后续恢复 */
function calculateHipAngle(landmarks: any[], side: 'left' | 'right'): number {
  const shoulderIndex = side === 'left' ? 11 : 12;
  const hipIndex = side === 'left' ? 23 : 24;
  const kneeIndex = side === 'left' ? 25 : 26;

  if (!landmarks[shoulderIndex] || !landmarks[hipIndex] || !landmarks[kneeIndex]) {
    return 0;
  }

  const shoulder = landmarks[shoulderIndex];
  const hip = landmarks[hipIndex];
  const knee = landmarks[kneeIndex];

  return deviationFromStraight(vector3D(hip, shoulder), vector3D(hip, knee));
}

/** @deprecated 膝关节角度计算 — 需要全身视角，单摄像头实际使用率低，保留代码以便后续恢复 */
function calculateKneeAngle(landmarks: any[], side: 'left' | 'right'): number {
  const hipIndex = side === 'left' ? 23 : 24;
  const kneeIndex = side === 'left' ? 25 : 26;
  const ankleIndex = side === 'left' ? 27 : 28;

  if (!landmarks[hipIndex] || !landmarks[kneeIndex] || !landmarks[ankleIndex]) {
    return 0;
  }

  const hip = landmarks[hipIndex];
  const knee = landmarks[kneeIndex];
  const ankle = landmarks[ankleIndex];

  return deviationFromStraight(vector3D(knee, hip), vector3D(knee, ankle));
}

/** @deprecated 踝关节角度计算 — 摄像头无法精确捕捉脚踝小关节动作，保留代码以便后续硬件升级后恢复 */
function calculateAnkleAngle(landmarks: any[], side: 'left' | 'right', _direction: MovementDirection): number {
  const kneeIndex = side === 'left' ? 25 : 26;
  const ankleIndex = side === 'left' ? 27 : 28;
  const footIndex = side === 'left' ? 31 : 32;

  if (!landmarks[kneeIndex] || !landmarks[ankleIndex] || !landmarks[footIndex]) {
    return 0;
  }

  const knee = landmarks[kneeIndex];
  const ankle = landmarks[ankleIndex];
  const foot = landmarks[footIndex];

  // 踝关节 ROM 从中立位(足与小腿垂直，~90°)测量
  // deviationFromSameLine 不适用，因为中立位时足与小腿垂直(~90°)，不是共线(0°或180°)
  // 正确计算: 测量实际3D夹角，再计算与中立位(90°)的偏离
  const legFootAngle = safeAngleBetween(vector3D(ankle, knee), vector3D(ankle, foot));
  return Math.abs(90 - legFootAngle);
}
