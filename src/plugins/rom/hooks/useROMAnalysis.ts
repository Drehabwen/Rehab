import { useCallback, useState } from 'react';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { calculateAngle3D, Point3D } from '@/utils/math';
import type { JointType as StoreJointType, MovementDirection as StoreMovementDirection } from '@/types/posture';
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

type Plane = 'xy' | 'yz' | 'xz';

const projectToPlane = (v: Point3D, plane: Plane): Point3D => {
  if (plane === 'xy') {
    return { x: v.x, y: v.y, z: 0 };
  }
  if (plane === 'yz') {
    return { x: 0, y: v.y, z: v.z };
  }
  return { x: v.x, y: 0, z: v.z };
};

const deviationFromSameLine = (v1: Point3D, v2: Point3D): number => {
  const angle = safeAngleBetween(v1, v2);
  return Math.min(angle, Math.abs(180 - angle));
};

const deviationFromStraight = (v1: Point3D, v2: Point3D): number => {
  return Math.abs(180 - safeAngleBetween(v1, v2));
};

const sameLineOnPlane = (v1: Point3D, v2: Point3D, plane: Plane): number => {
  return deviationFromSameLine(projectToPlane(v1, plane), projectToPlane(v2, plane));
};

const straightOnPlane = (v1: Point3D, v2: Point3D, plane: Plane): number => {
  return deviationFromStraight(projectToPlane(v1, plane), projectToPlane(v2, plane));
};

const signedAngleOnPlane = (v1: Point3D, v2: Point3D, plane: Plane): number => {
  const p1 = projectToPlane(v1, plane);
  const p2 = projectToPlane(v2, plane);

  if (plane === 'xy') {
    const cross = p1.x * p2.y - p1.y * p2.x;
    const dot = p1.x * p2.x + p1.y * p2.y;
    return Number.isFinite(cross) && Number.isFinite(dot) ? Math.atan2(cross, dot) * (180 / Math.PI) : 0;
  }

  if (plane === 'yz') {
    const cross = p1.y * p2.z - p1.z * p2.y;
    const dot = p1.y * p2.y + p1.z * p2.z;
    return Number.isFinite(cross) && Number.isFinite(dot) ? Math.atan2(cross, dot) * (180 / Math.PI) : 0;
  }

  const cross = p1.x * p2.z - p1.z * p2.x;
  const dot = p1.x * p2.x + p1.z * p2.z;
  return Number.isFinite(cross) && Number.isFinite(dot) ? Math.atan2(cross, dot) * (180 / Math.PI) : 0;
};

const rotationMagnitudeFromSigned = (signedAngle: number, direction: MovementDirection): number => {
  if (direction === 'internal_rotation') {
    return Math.max(0, signedAngle);
  }
  if (direction === 'external_rotation') {
    return Math.max(0, -signedAngle);
  }
  return Math.abs(signedAngle);
};

const rotationOnPlane = (
  v1: Point3D,
  v2: Point3D,
  plane: Plane,
  direction: MovementDirection,
  side: 'left' | 'right',
): number => {
  const rawSigned = signedAngleOnPlane(v1, v2, plane);
  const sideNormalized = rawSigned * (side === 'left' ? 1 : -1);
  return rotationMagnitudeFromSigned(sideNormalized, direction);
};

type PoseResults = {
  poseLandmarks?: Point3D[];
};

const toStoreDirection = (direction: MovementDirection): StoreMovementDirection => {
  return direction.replace(/_/g, '-') as StoreMovementDirection;
};

const toPluginDirection = (direction: StoreMovementDirection): MovementDirection => {
  return direction.replace(/-/g, '_') as MovementDirection;
};

export function extractAngleFromResults(
  results: PoseResults,
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
      return calculateShoulderAngle(landmarks, side, direction);
    case 'elbow':
      return calculateElbowAngle(landmarks, side, direction);
    case 'wrist':
      return calculateWristAngle(landmarks, side, direction);
    case 'hip':
      return calculateHipAngle(landmarks, side, direction);
    case 'knee':
      return calculateKneeAngle(landmarks, side, direction);
    case 'ankle':
      return calculateAnkleAngle(landmarks, side, direction);
    case 'cervical':
      return calculateCervicalAngle(landmarks, direction);
    default:
      return 0;
  }
}

export function calculateCervicalAngle(landmarks: Point3D[], direction: MovementDirection): number {
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
    return sameLineOnPlane(torsoVector, headVector, 'yz');
  }

  if (direction === 'abduction' || direction === 'adduction') {
    const shoulderLine = vector3D(leftShoulder, rightShoulder);
    const earLine = vector3D(leftEar, rightEar);
    return sameLineOnPlane(shoulderLine, earLine, 'xy');
  }

  if (direction === 'internal_rotation' || direction === 'external_rotation') {
    const shoulderLine = vector3D(leftShoulder, rightShoulder);
    const earLine = vector3D(leftEar, rightEar);
    const signedTransverseRotation = signedAngleOnPlane(shoulderLine, earLine, 'xz');
    const signedNoseOffset = ((nose.x || 0) - earMid.x) * 180;
    const signedComposite = Math.abs(signedNoseOffset) > Math.abs(signedTransverseRotation)
      ? signedNoseOffset
      : signedTransverseRotation;
    return rotationMagnitudeFromSigned(signedComposite, direction);
  }

  return sameLineOnPlane(torsoVector, headVector, 'yz');
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
      setSingleMeasurement(joint as StoreJointType, toStoreDirection(direction), side);
    },
    [setSingleMeasurement],
  );

  const startROMAssessment = useCallback(() => {
    const existingMeasurement = useMeasurementStore.getState().activeMeasurements[0];
    if (existingMeasurement) {
      setSingleMeasurement(
        existingMeasurement.joint,
        existingMeasurement.direction,
        existingMeasurement.side,
      );
    } else {
      const convertedDirection = toStoreDirection(selectedDirection);
      setSingleMeasurement(selectedJoint as StoreJointType, convertedDirection, selectedSide);
    }
    resetMeasurement();
    startMeasurement();
  }, [selectedDirection, selectedJoint, selectedSide, resetMeasurement, setSingleMeasurement, startMeasurement]);

  const stopROMAssessment = useCallback(() => {
    stopMeasurement();
  }, [stopMeasurement]);

  const handleResults = useCallback((results: PoseResults) => {
    if (isMeasuring && activeMeasurements.length > 0) {
      const convertedDirection = toStoreDirection(selectedDirection);
      const measurement = activeMeasurements.find((item) => (
        item.joint === (selectedJoint as StoreJointType) &&
        item.direction === convertedDirection &&
        item.side === selectedSide
      )) ?? activeMeasurements[0];
      const measurementSide = measurement.side === 'right' ? 'right' : 'left';
      const angle = extractAngleFromResults(
        results,
        measurement.joint as JointType,
        toPluginDirection(measurement.direction),
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

function calculateShoulderAngle(landmarks: Point3D[], side: 'left' | 'right', direction: MovementDirection): number {
  const shoulderIndex = side === 'left' ? 11 : 12;
  const elbowIndex = side === 'left' ? 13 : 14;
  const hipIndex = side === 'left' ? 23 : 24;
  const contraShoulderIndex = side === 'left' ? 12 : 11;

  if (!landmarks[shoulderIndex] || !landmarks[elbowIndex] || !landmarks[hipIndex] || !landmarks[contraShoulderIndex]) {
    return 0;
  }

  const shoulder = landmarks[shoulderIndex];
  const elbow = landmarks[elbowIndex];
  const hip = landmarks[hipIndex];
  const contraShoulder = landmarks[contraShoulderIndex];

  const torsoVector = vector3D(shoulder, hip);
  const armVector = vector3D(shoulder, elbow);
  const shoulderLine = vector3D(shoulder, contraShoulder);

  if (direction === 'flexion' || direction === 'extension') {
    return sameLineOnPlane(torsoVector, armVector, 'yz');
  }
  if (direction === 'abduction' || direction === 'adduction') {
    return sameLineOnPlane(torsoVector, armVector, 'xy');
  }
  return rotationOnPlane(shoulderLine, armVector, 'xz', direction, side);
}

function calculateElbowAngle(landmarks: Point3D[], side: 'left' | 'right', direction: MovementDirection): number {
  const shoulderIndex = side === 'left' ? 11 : 12;
  const elbowIndex = side === 'left' ? 13 : 14;
  const wristIndex = side === 'left' ? 15 : 16;

  if (!landmarks[shoulderIndex] || !landmarks[elbowIndex] || !landmarks[wristIndex]) {
    return 0;
  }

  const shoulder = landmarks[shoulderIndex];
  const elbow = landmarks[elbowIndex];
  const wrist = landmarks[wristIndex];
  const upperArm = vector3D(elbow, shoulder);
  const forearm = vector3D(elbow, wrist);

  if (direction === 'flexion' || direction === 'extension') {
    return straightOnPlane(upperArm, forearm, 'yz');
  }
  if (direction === 'abduction' || direction === 'adduction') {
    return straightOnPlane(upperArm, forearm, 'xy');
  }
  return rotationOnPlane(upperArm, forearm, 'xz', direction, side);
}

function calculateWristAngle(landmarks: Point3D[], side: 'left' | 'right', direction: MovementDirection): number {
  const elbowIndex = side === 'left' ? 13 : 14;
  const wristIndex = side === 'left' ? 15 : 16;
  const handIndex = side === 'left' ? 19 : 20;

  if (!landmarks[elbowIndex] || !landmarks[wristIndex] || !landmarks[handIndex]) {
    return 0;
  }

  const elbow = landmarks[elbowIndex];
  const wrist = landmarks[wristIndex];
  const hand = landmarks[handIndex];
  const forearm = vector3D(wrist, elbow);
  const handVector = vector3D(wrist, hand);

  if (direction === 'flexion' || direction === 'extension') {
    return straightOnPlane(forearm, handVector, 'yz');
  }
  if (direction === 'abduction' || direction === 'adduction') {
    return straightOnPlane(forearm, handVector, 'xy');
  }
  return rotationOnPlane(forearm, handVector, 'xz', direction, side);
}

function calculateHipAngle(landmarks: Point3D[], side: 'left' | 'right', direction: MovementDirection): number {
  const shoulderIndex = side === 'left' ? 11 : 12;
  const hipIndex = side === 'left' ? 23 : 24;
  const kneeIndex = side === 'left' ? 25 : 26;
  const contraHipIndex = side === 'left' ? 24 : 23;

  if (!landmarks[shoulderIndex] || !landmarks[hipIndex] || !landmarks[kneeIndex] || !landmarks[contraHipIndex]) {
    return 0;
  }

  const shoulder = landmarks[shoulderIndex];
  const hip = landmarks[hipIndex];
  const knee = landmarks[kneeIndex];
  const contraHip = landmarks[contraHipIndex];
  const trunk = vector3D(hip, shoulder);
  const thigh = vector3D(hip, knee);
  const pelvisLine = vector3D(hip, contraHip);

  if (direction === 'flexion' || direction === 'extension') {
    return straightOnPlane(trunk, thigh, 'yz');
  }
  if (direction === 'abduction' || direction === 'adduction') {
    return straightOnPlane(trunk, thigh, 'xy');
  }
  return rotationOnPlane(pelvisLine, thigh, 'xz', direction, side);
}

function calculateKneeAngle(landmarks: Point3D[], side: 'left' | 'right', direction: MovementDirection): number {
  const hipIndex = side === 'left' ? 23 : 24;
  const kneeIndex = side === 'left' ? 25 : 26;
  const ankleIndex = side === 'left' ? 27 : 28;

  if (!landmarks[hipIndex] || !landmarks[kneeIndex] || !landmarks[ankleIndex]) {
    return 0;
  }

  const hip = landmarks[hipIndex];
  const knee = landmarks[kneeIndex];
  const ankle = landmarks[ankleIndex];
  const thigh = vector3D(knee, hip);
  const shank = vector3D(knee, ankle);

  if (direction === 'flexion' || direction === 'extension') {
    return straightOnPlane(thigh, shank, 'yz');
  }
  if (direction === 'abduction' || direction === 'adduction') {
    return straightOnPlane(thigh, shank, 'xy');
  }
  return rotationOnPlane(thigh, shank, 'xz', direction, side);
}

function calculateAnkleAngle(landmarks: Point3D[], side: 'left' | 'right', direction: MovementDirection): number {
  const kneeIndex = side === 'left' ? 25 : 26;
  const ankleIndex = side === 'left' ? 27 : 28;
  const footIndex = side === 'left' ? 31 : 32;

  if (!landmarks[kneeIndex] || !landmarks[ankleIndex] || !landmarks[footIndex]) {
    return 0;
  }

  const knee = landmarks[kneeIndex];
  const ankle = landmarks[ankleIndex];
  const foot = landmarks[footIndex];
  const shank = vector3D(ankle, knee);
  const footVector = vector3D(ankle, foot);

  if (direction === 'flexion' || direction === 'extension') {
    return sameLineOnPlane(shank, footVector, 'yz');
  }
  if (direction === 'abduction' || direction === 'adduction') {
    return sameLineOnPlane(shank, footVector, 'xy');
  }
  return rotationOnPlane(shank, footVector, 'xz', direction, side);
}
