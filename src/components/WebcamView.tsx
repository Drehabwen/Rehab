import { useState, useRef, useCallback, useEffect } from 'react';
import { Results } from '@mediapipe/holistic';
import { Video, VideoOff } from 'lucide-react';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { usePostureWS } from '@/hooks/usePostureWS';
import BaseWebcamView from './shared/BaseWebcamView';

const JOINT_NAMES: Record<string, string> = {
  'cervical': '颈椎',
  'shoulder': '肩关节',
  'thoracolumbar': '胸腰椎',
  'wrist': '腕关节',
  'ankle': '踝关节',
  'hip': '髋关节',
  'knee': '膝关节',
  'elbow': '肘关节'
};

const DIRECTION_NAMES: Record<string, string> = {
  'flexion': '前屈',
  'extension': '后伸',
  'abduction': '外展',
  'adduction': '内收',
  'internal-rotation': '内旋',
  'external-rotation': '外旋',
  'left-rotation': '左旋',
  'right-rotation': '右旋',
  'left-lateral-flexion': '左侧屈',
  'right-lateral-flexion': '右侧屈',
  'ulnar-deviation': '尺偏',
  'radial-deviation': '桡偏',
  'dorsiflexion': '背伸',
  'plantarflexion': '跖屈'
};

const SIDE_NAMES: Record<string, string> = {
  'left': '左',
  'right': '右'
};

export default function WebcamView() {
  const [isCameraOn, setIsCameraOn] = useState(() => {
    const saved = localStorage.getItem('vision3_camera_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const { analyzeJoint, jointResult } = usePostureWS();
  const { activeMeasurements, updateMeasurementData, isMeasuring } = useMeasurementStore();

  // Use refs to store state needed in onResults to avoid re-initializing
  const activeMeasurementsRef = useRef(activeMeasurements);
  const isMeasuringRef = useRef(isMeasuring);
  
  useEffect(() => {
    activeMeasurementsRef.current = activeMeasurements;
    isMeasuringRef.current = isMeasuring;
  }, [activeMeasurements, isMeasuring]);

  useEffect(() => {
    localStorage.setItem('vision3_camera_enabled', String(isCameraOn));
  }, [isCameraOn]);

  // Handle results from backend
  useEffect(() => {
    if (jointResult && jointResult.results) {
      jointResult.results.forEach(res => {
        const measurement = activeMeasurementsRef.current.find(m => m.id === res.id);
        if (measurement && res.angle !== null) {
          updateMeasurementData(res.id, res.angle);
        }
      });
    }
  }, [jointResult, updateMeasurementData]);

  const onResults = useCallback((results: Results, video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (!results.poseLandmarks) return;

    // Send ORIGINAL landmarks to backend for analysis
    if (activeMeasurementsRef.current.length > 0) {
      analyzeJoint(
        activeMeasurementsRef.current.map(m => ({
          id: m.id,
          jointType: m.joint,
          direction: m.direction,
          side: m.side || undefined
        })),
        results.poseLandmarks,
        video.videoWidth,
        video.videoHeight,
        (results as any).poseWorldLandmarks
      );
    }

    // Capture image if measuring and angle increased significantly (simplified for now)
    // In a real scenario, we might want to capture the max angle image
  }, [analyzeJoint]);

  return (
    <BaseWebcamView
      isCameraOn={isCameraOn}
      onCameraToggle={setIsCameraOn}
      onResults={onResults}
      isMirrored={true}
    >
      {/* Measurement Overlays */}
      <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none z-30">
        {activeMeasurements.map((m) => (
          <div 
            key={m.id}
            className="bg-black/60 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-md border border-white/10 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-1">
              {JOINT_NAMES[m.joint] || m.joint} {m.side ? `(${SIDE_NAMES[m.side] || m.side})` : ''} • {DIRECTION_NAMES[m.direction] || m.direction}
            </p>
            <p className="text-3xl font-black text-white tabular-nums">
              {m.currentAngle.toFixed(1)}°
            </p>
          </div>
        ))}
        {activeMeasurements.length === 0 && (
          <div className="bg-white/10 px-4 py-2 rounded-xl shadow backdrop-blur-md border border-white/10">
            <p className="text-xs font-bold text-gray-300">请添加测量项</p>
          </div>
        )}
      </div>
    </BaseWebcamView>
  );
}
