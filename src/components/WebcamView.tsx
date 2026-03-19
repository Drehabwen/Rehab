import { useState, useRef, useCallback, useEffect } from 'react';
import { Results } from '@/lib/mediapipe-utils';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { usePostureWS } from '@/hooks/usePostureWS';
import { Landmark } from '@/types/posture';
import BaseWebcamView from './shared/BaseWebcamView';

const JOINT_NAMES: Record<string, string> = {
  cervical: '颈椎',
  shoulder: '肩关节',
  thoracolumbar: '胸腰段',
  wrist: '腕关节',
  ankle: '踝关节',
  hip: '髋关节',
  knee: '膝关节',
  elbow: '肘关节',
};

const DIRECTION_NAMES: Record<string, string> = {
  flexion: '前屈',
  extension: '后伸',
  abduction: '外展',
  adduction: '内收',
  'internal-rotation': '内旋',
  'external-rotation': '外旋',
  'left-rotation': '左旋',
  'right-rotation': '右旋',
  'left-lateral-flexion': '左侧屈',
  'right-lateral-flexion': '右侧屈',
  'ulnar-deviation': '尺偏',
  'radial-deviation': '桡偏',
  dorsiflexion: '背屈',
  plantarflexion: '跖屈',
};

const SIDE_NAMES: Record<string, string> = {
  left: '左',
  right: '右',
};

type PoseResults = Results & { poseWorldLandmarks?: Landmark[] };

export default function WebcamView() {
  const [isCameraOn, setIsCameraOn] = useState(() => {
    const saved = localStorage.getItem('vision3_camera_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const { analyzeJoint, analyze, jointResult, stabilityScore } = usePostureWS();
  const { activeMeasurements, updateMeasurementData, isMeasuring } = useMeasurementStore();

  const activeMeasurementsRef = useRef(activeMeasurements);
  const isMeasuringRef = useRef(isMeasuring);
  const landmarkBufferRef = useRef<Landmark[][]>([]);
  const lastSyncTimeRef = useRef<number>(0);
  const SYNC_INTERVAL_MS = 200;
  const MAX_BUFFER_SIZE = 30;

  useEffect(() => {
    activeMeasurementsRef.current = activeMeasurements;
    isMeasuringRef.current = isMeasuring;
  }, [activeMeasurements, isMeasuring]);

  useEffect(() => {
    localStorage.setItem('vision3_camera_enabled', String(isCameraOn));
  }, [isCameraOn]);

  useEffect(() => {
    if (jointResult && jointResult.results) {
      jointResult.results.forEach((result) => {
        const measurement = activeMeasurementsRef.current.find((item) => item.id === result.id);
        if (measurement && result.angle !== null) {
          updateMeasurementData(result.id, result.angle);
        }
      });
    }
  }, [jointResult, updateMeasurementData]);

  const onResults = useCallback(
    (results: Results, video: HTMLVideoElement) => {
      if (!results.poseLandmarks) return;

      landmarkBufferRef.current.push(results.poseLandmarks as Landmark[]);
      if (landmarkBufferRef.current.length > MAX_BUFFER_SIZE) {
        landmarkBufferRef.current.shift();
      }

      if (activeMeasurementsRef.current.length > 0) {
        const worldLandmarks = (results as PoseResults).poseWorldLandmarks;
        analyzeJoint(
          activeMeasurementsRef.current.map((measurement) => ({
            id: measurement.id,
            jointType: measurement.joint,
            direction: measurement.direction,
            side: measurement.side || undefined,
          })),
          results.poseLandmarks,
          video.videoWidth,
          video.videoHeight,
          worldLandmarks,
        );
      }

      const now = Date.now();
      if (landmarkBufferRef.current.length >= 10 && now - lastSyncTimeRef.current > SYNC_INTERVAL_MS) {
        lastSyncTimeRef.current = now;
        analyze('front', landmarkBufferRef.current, video.videoWidth, video.videoHeight);
      }
    },
    [analyzeJoint, analyze],
  );

  return (
    <BaseWebcamView isCameraOn={isCameraOn} onCameraToggle={setIsCameraOn} onResults={onResults} isMirrored={true}>
      <div className="pointer-events-none absolute left-6 top-6 z-30 flex flex-col gap-3">
        <div className="animate-in rounded-2xl border border-white/10 bg-black/60 px-5 py-3 shadow-xl backdrop-blur-md fade-in slide-in-from-left-2 duration-300">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-purple-400">动作稳定性 / 疲劳监测</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="mb-1 h-2 w-32 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all duration-300 ${
                    stabilityScore > 0.8 ? 'bg-green-500' : stabilityScore > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stabilityScore * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {stabilityScore > 0.8 ? '状态良好' : stabilityScore > 0.5 ? '轻度疲劳' : '明显疲劳 / 动作不稳'}
              </p>
            </div>
            <p className="tabular-nums text-2xl font-black text-white">{(stabilityScore * 100).toFixed(0)}%</p>
          </div>
        </div>

        {activeMeasurements.map((measurement) => (
          <div
            key={measurement.id}
            className="animate-in rounded-2xl border border-white/10 bg-black/60 px-5 py-3 shadow-xl backdrop-blur-md fade-in slide-in-from-left-2 duration-300"
          >
            <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-blue-400">
              {JOINT_NAMES[measurement.joint] || measurement.joint}{' '}
              {measurement.side ? `(${SIDE_NAMES[measurement.side] || measurement.side})` : ''} -{' '}
              {DIRECTION_NAMES[measurement.direction] || measurement.direction}
            </p>
            <p className="tabular-nums text-3xl font-black text-white">{measurement.currentAngle.toFixed(1)}°</p>
          </div>
        ))}

        {activeMeasurements.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 shadow backdrop-blur-md">
            <p className="text-xs font-bold text-gray-300">请先添加测量项</p>
          </div>
        )}
      </div>
    </BaseWebcamView>
  );
}
