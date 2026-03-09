import { useState, useCallback } from 'react';
import { usePostureWS } from '@/hooks/usePostureWS';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { calculateAngle, calculateAngle3D, Point3D } from '@/utils/math';
import type { JointType, MovementDirection } from '../types';

export function useROMAnalysis() {
  const { analyze } = usePostureWS();
  const { 
    activeMeasurements, 
    isMeasuring, 
    startMeasurement, 
    stopMeasurement, 
    resetMeasurement, 
    addMeasurement, 
    removeMeasurement, 
    updateMeasurementData 
  } = useMeasurementStore();
  
  const [selectedJoint, setSelectedJoint] = useState<JointType>('shoulder');
  const [selectedDirection, setSelectedDirection] = useState<MovementDirection>('flexion');
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>('left');
  
  const configureAssessment = useCallback(
    (joint: JointType, direction: MovementDirection, side: 'left' | 'right') => {
      setSelectedJoint(joint);
      setSelectedDirection(direction);
      setSelectedSide(side);
    },
    [],
  );
  
  const startROMAssessment = useCallback(() => {
    // 清除现有测量
    resetMeasurement();
    
    // 转换方向格式以匹配 posture 类型
    const convertedDirection = selectedDirection.replace('_', '-') as any;
    
    // 添加新的测量
    addMeasurement(selectedJoint as any, convertedDirection, selectedSide);
    
    // 开始测量
    startMeasurement();
  }, [selectedJoint, selectedDirection, selectedSide, resetMeasurement, addMeasurement, startMeasurement]);
  
  const stopROMAssessment = useCallback(() => {
    stopMeasurement();
  }, [stopMeasurement]);
  
  const handleResults = useCallback((results: any, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
    // 处理 ROM 分析结果
    if (isMeasuring && activeMeasurements.length > 0) {
      const measurement = activeMeasurements[0];
      // 从 results 中提取角度数据
      const angle = extractAngleFromResults(results, measurement.joint as any, measurement.direction as any, measurement.side);
      updateMeasurementData(measurement.id, angle);
    }
  }, [isMeasuring, activeMeasurements, updateMeasurementData]);
  
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

// 从结果中提取角度数据
function extractAngleFromResults(results: any, joint: JointType, direction: MovementDirection, side: 'left' | 'right'): number {
  // 检查是否有 poseLandmarks
  if (!results || !results.poseLandmarks || results.poseLandmarks.length === 0) {
    return 0;
  }
  
  const landmarks = results.poseLandmarks;
  
  switch (joint) {
    case 'shoulder':
      return calculateShoulderAngle(landmarks, direction, side);
    case 'elbow':
      return calculateElbowAngle(landmarks, direction, side);
    case 'wrist':
      return calculateWristAngle(landmarks, direction, side);
    case 'hip':
      return calculateHipAngle(landmarks, direction, side);
    case 'knee':
      return calculateKneeAngle(landmarks, direction, side);
    case 'ankle':
      return calculateAnkleAngle(landmarks, direction, side);
    case 'cervical':
      return calculateCervicalAngle(landmarks, direction);
    default:
      return 0;
  }
}

// 计算肩关节角度
function calculateShoulderAngle(landmarks: any[], direction: MovementDirection, side: 'left' | 'right'): number {
  const shoulderIndex = side === 'left' ? 11 : 12;
  const elbowIndex = side === 'left' ? 13 : 14;
  const hipIndex = side === 'left' ? 23 : 24;
  
  if (!landmarks[shoulderIndex] || !landmarks[elbowIndex] || !landmarks[hipIndex]) {
    return 0;
  }
  
  const shoulder = landmarks[shoulderIndex];
  const elbow = landmarks[elbowIndex];
  const hip = landmarks[hipIndex];
  
  // 计算向量
  const vector1 = { x: shoulder.x - hip.x, y: shoulder.y - hip.y, z: (shoulder.z || 0) - (hip.z || 0) };
  const vector2 = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y, z: (elbow.z || 0) - (shoulder.z || 0) };
  
  return calculateAngle3D(vector1, vector2);
}

// 计算肘关节角度
function calculateElbowAngle(landmarks: any[], direction: MovementDirection, side: 'left' | 'right'): number {
  const shoulderIndex = side === 'left' ? 11 : 12;
  const elbowIndex = side === 'left' ? 13 : 14;
  const wristIndex = side === 'left' ? 15 : 16;
  
  if (!landmarks[shoulderIndex] || !landmarks[elbowIndex] || !landmarks[wristIndex]) {
    return 0;
  }
  
  const shoulder = landmarks[shoulderIndex];
  const elbow = landmarks[elbowIndex];
  const wrist = landmarks[wristIndex];
  
  // 计算向量
  const vector1 = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y, z: (elbow.z || 0) - (shoulder.z || 0) };
  const vector2 = { x: wrist.x - elbow.x, y: wrist.y - elbow.y, z: (wrist.z || 0) - (elbow.z || 0) };
  
  return calculateAngle3D(vector1, vector2);
}

// 计算腕关节角度
function calculateWristAngle(landmarks: any[], direction: MovementDirection, side: 'left' | 'right'): number {
  const elbowIndex = side === 'left' ? 13 : 14;
  const wristIndex = side === 'left' ? 15 : 16;
  const handIndex = side === 'left' ? 17 : 18;
  
  if (!landmarks[elbowIndex] || !landmarks[wristIndex] || !landmarks[handIndex]) {
    return 0;
  }
  
  const elbow = landmarks[elbowIndex];
  const wrist = landmarks[wristIndex];
  const hand = landmarks[handIndex];
  
  // 计算向量
  const vector1 = { x: wrist.x - elbow.x, y: wrist.y - elbow.y, z: (wrist.z || 0) - (elbow.z || 0) };
  const vector2 = { x: hand.x - wrist.x, y: hand.y - wrist.y, z: (hand.z || 0) - (wrist.z || 0) };
  
  return calculateAngle3D(vector1, vector2);
}

// 计算髋关节角度
function calculateHipAngle(landmarks: any[], direction: MovementDirection, side: 'left' | 'right'): number {
  const hipIndex = side === 'left' ? 23 : 24;
  const kneeIndex = side === 'left' ? 25 : 26;
  const spineIndex = 11; // 胸椎
  
  if (!landmarks[hipIndex] || !landmarks[kneeIndex] || !landmarks[spineIndex]) {
    return 0;
  }
  
  const hip = landmarks[hipIndex];
  const knee = landmarks[kneeIndex];
  const spine = landmarks[spineIndex];
  
  // 计算向量
  const vector1 = { x: hip.x - spine.x, y: hip.y - spine.y, z: (hip.z || 0) - (spine.z || 0) };
  const vector2 = { x: knee.x - hip.x, y: knee.y - hip.y, z: (knee.z || 0) - (hip.z || 0) };
  
  return calculateAngle3D(vector1, vector2);
}

// 计算膝关节角度
function calculateKneeAngle(landmarks: any[], direction: MovementDirection, side: 'left' | 'right'): number {
  const hipIndex = side === 'left' ? 23 : 24;
  const kneeIndex = side === 'left' ? 25 : 26;
  const ankleIndex = side === 'left' ? 27 : 28;
  
  if (!landmarks[hipIndex] || !landmarks[kneeIndex] || !landmarks[ankleIndex]) {
    return 0;
  }
  
  const hip = landmarks[hipIndex];
  const knee = landmarks[kneeIndex];
  const ankle = landmarks[ankleIndex];
  
  // 计算向量
  const vector1 = { x: knee.x - hip.x, y: knee.y - hip.y, z: (knee.z || 0) - (hip.z || 0) };
  const vector2 = { x: ankle.x - knee.x, y: ankle.y - knee.y, z: (ankle.z || 0) - (knee.z || 0) };
  
  return calculateAngle3D(vector1, vector2);
}

// 计算踝关节角度
function calculateAnkleAngle(landmarks: any[], direction: MovementDirection, side: 'left' | 'right'): number {
  const kneeIndex = side === 'left' ? 25 : 26;
  const ankleIndex = side === 'left' ? 27 : 28;
  const footIndex = side === 'left' ? 31 : 32;
  
  if (!landmarks[kneeIndex] || !landmarks[ankleIndex] || !landmarks[footIndex]) {
    return 0;
  }
  
  const knee = landmarks[kneeIndex];
  const ankle = landmarks[ankleIndex];
  const foot = landmarks[footIndex];
  
  // 计算向量
  const vector1 = { x: ankle.x - knee.x, y: ankle.y - knee.y, z: (ankle.z || 0) - (knee.z || 0) };
  const vector2 = { x: foot.x - ankle.x, y: foot.y - ankle.y, z: (foot.z || 0) - (ankle.z || 0) };
  
  return calculateAngle3D(vector1, vector2);
}

// 计算颈椎角度
function calculateCervicalAngle(landmarks: any[], direction: MovementDirection): number {
  const headIndex = 0;
  const neckIndex = 1;
  const spineIndex = 2;
  
  if (!landmarks[headIndex] || !landmarks[neckIndex] || !landmarks[spineIndex]) {
    return 0;
  }
  
  const head = landmarks[headIndex];
  const neck = landmarks[neckIndex];
  const spine = landmarks[spineIndex];
  
  // 计算向量
  const vector1 = { x: neck.x - spine.x, y: neck.y - spine.y, z: (neck.z || 0) - (spine.z || 0) };
  const vector2 = { x: head.x - neck.x, y: head.y - neck.y, z: (head.z || 0) - (neck.z || 0) };
  
  return calculateAngle3D(vector1, vector2);
}
