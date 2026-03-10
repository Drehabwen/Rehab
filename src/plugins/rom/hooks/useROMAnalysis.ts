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
    case 'shoulder':
      return calculateShoulderAngle(landmarks, side);
    case 'elbow':
      return calculateElbowAngle(landmarks, side);
    case 'wrist':
      return calculateWristAngle(landmarks, side);
    case 'hip':
      return calculateHipAngle(landmarks, side);
    case 'knee':
      return calculateKneeAngle(landmarks, side);
    case 'ankle':
      return calculateAnkleAngle(landmarks, side);
    case 'cervical':
      return calculateCervicalAngle(landmarks, direction);
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
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (!nose || !leftEar || !rightEar || !leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return 0;
  }

  const earMid = midpoint3D(leftEar, rightEar);
  const shoulderMid = midpoint3D(leftShoulder, rightShoulder);
  const hipMid = midpoint3D(leftHip, rightHip);

  const torsoVector = vector3D(hipMid, shoulderMid);
  const headVector = vector3D(shoulderMid, earMid);

  if (direction === 'flexion' || direction === 'extension') {
    return deviationFromSameLine(torsoVector, headVector);
  }

  if (direction === 'internal_rotation' || direction === 'external_rotation') {
    const shoulderLine = vector3D(leftShoulder, rightShoulder);
    const earLine = vector3D(leftEar, rightEar);
    const transverseRotation = deviationFromSameLine(shoulderLine, earLine);
    const noseOffset = Math.abs((nose.x || 0) - earMid.x) * 180;
    return Math.max(transverseRotation, noseOffset);
  }

  return deviationFromSameLine(torsoVector, headVector);
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

function calculateShoulderAngle(landmarks: any[], side: 'left' | 'right'): number {
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
  return deviationFromSameLine(torsoVector, armVector);
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

function calculateAnkleAngle(landmarks: any[], side: 'left' | 'right'): number {
  const kneeIndex = side === 'left' ? 25 : 26;
  const ankleIndex = side === 'left' ? 27 : 28;
  const footIndex = side === 'left' ? 31 : 32;

  if (!landmarks[kneeIndex] || !landmarks[ankleIndex] || !landmarks[footIndex]) {
    return 0;
  }

  const knee = landmarks[kneeIndex];
  const ankle = landmarks[ankleIndex];
  const foot = landmarks[footIndex];

  return deviationFromSameLine(vector3D(ankle, knee), vector3D(ankle, foot));
}
