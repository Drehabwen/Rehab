import { useEffect, useRef, useCallback, useState } from 'react';
import { Pose, Results, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Video, VideoOff } from 'lucide-react';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { useCameraStream } from '@/hooks/useCameraStream';
import { usePostureWS } from '@/hooks/usePostureWS';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(() => {
    const saved = localStorage.getItem('vision3_camera_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const { stream, isLoading, error: cameraError } = useCameraStream(isCameraOn);
  const { analyzeJoint, jointResult } = usePostureWS();
  const { activeMeasurements, updateMeasurementData, isMeasuring } = useMeasurementStore();

  useEffect(() => {
    localStorage.setItem('vision3_camera_enabled', String(isCameraOn));
    
    // Cleanup canvas when camera is turned off
    if (!isCameraOn && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [isCameraOn]);

  // Sync video source with our shared stream
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        console.log("WebcamView: Syncing shared stream to video element");
        videoRef.current.srcObject = stream;
        
        // Ensure video plays after stream is set
        videoRef.current.play().catch(err => {
          console.error("WebcamView: Failed to play synced video:", err);
        });
      }
    }
  }, [stream]);

  // Handle results from backend
  useEffect(() => {
    if (jointResult && jointResult.results) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      jointResult.results.forEach(res => {
        const measurement = activeMeasurements.find(m => m.id === res.id);
        if (measurement && res.angle !== null) {
          // If this is a new max angle, capture it
          let imageUrl: string | undefined;
          if (isMeasuring && res.angle > measurement.maxAngle) {
            imageUrl = canvas.toDataURL('image/jpeg', 0.8);
          }
          updateMeasurementData(res.id, res.angle, imageUrl);
        }
      });
    }
  }, [jointResult, activeMeasurements, isMeasuring, updateMeasurementData]);

  const onResults = useCallback((results: Results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video || !results.poseLandmarks) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    
    // Draw video frame
    // Since we are mirroring, we scale the x-axis by -1 and translate by width
    // But drawImage(img, x, y, w, h)
    // To mirror: translate(width, 0) scale(-1, 1) drawImage(img, 0, 0, width, height)
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, width, height);
    
    // Restore context to draw landmarks normally (since landmarks are already mirrored manually below)
    // Wait, if we restore, we are back to normal coordinates.
    // The manual mirroring logic is: x = 1 - x.
    // This assumes 0..1 range.
    // If we draw landmarks on normal context, x=0 is left.
    // Mirrored landmark x=0 (was right in camera frame) should be drawn at left.
    // So yes, we restore context and draw manually mirrored landmarks.
    ctx.restore();
    
    ctx.save(); // Save again for potential other transforms or just to be safe
    // ctx.clearRect(0, 0, width, height); // No longer needed as we draw image over it

    // Create mirrored landmarks for display to match mirrored video
    const mirroredLandmarks = results.poseLandmarks.map(lm => ({
      ...lm,
      x: 1 - lm.x
    }));

    // Create mirrored World Landmarks (if available)
    let mirroredWorldLandmarks: any[] | undefined;
    if (results.poseWorldLandmarks) {
        mirroredWorldLandmarks = results.poseWorldLandmarks.map(lm => ({
            ...lm,
            x: -lm.x // Mirror X axis for world coordinates
        }));
    }
    
    // Draw landmarks
    drawConnectors(ctx, mirroredLandmarks, POSE_CONNECTIONS,
                   { color: '#00FF00', lineWidth: 4 });
    drawLandmarks(ctx, mirroredLandmarks,
                  { color: '#FF0000', lineWidth: 2 });

    // Send ORIGINAL landmarks to backend for analysis (not mirrored)
    if (activeMeasurements.length > 0) {
      analyzeJoint(
        activeMeasurements.map(m => ({
          id: m.id,
          jointType: m.joint,
          direction: m.direction,
          side: m.side || undefined
        })),
        results.poseLandmarks, // Use original landmarks
        width,
        height,
        results.poseWorldLandmarks // Use original world landmarks
      );
    }

    ctx.restore();
  }, [updateMeasurementData, activeMeasurements, analyzeJoint]);

  useEffect(() => {
    console.log("Initializing Pose model in WebcamView...");
    const pose = new Pose({locateFile: (file) => {
      const url = `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      console.log(`Loading Pose file: ${url}`);
      return url;
    }});

    pose.setOptions({
      modelComplexity: 2,
      smoothLandmarks: true,
      enableSegmentation: true,
      smoothSegmentation: true,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.75
    });

    pose.onResults(onResults);
    poseRef.current = pose;
    console.log("Pose model initialized in WebcamView");

    console.log("Starting frame processing loop in WebcamView...");
    let requestRef: number;

    const processFrame = async () => {
      if (videoRef.current && poseRef.current) {
        const video = videoRef.current;
        if (video.readyState >= 2) {
          try {
            await poseRef.current.send({ image: video });
          } catch (err) {
            console.error("Error sending frame to Pose:", err);
          }
        }
      }
      requestRef = requestAnimationFrame(processFrame);
    };

    requestRef = requestAnimationFrame(processFrame);

    return () => {
      console.log("Cleaning up camera loop in WebcamView...");
      cancelAnimationFrame(requestRef);
      pose.close();
    };
  }, [onResults]);

  return (
    <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] max-h-[75vh] mx-auto ring-1 ring-white/10 group">
      {isCameraOn ? (
        <div className="absolute inset-0 w-full h-full">
          {isLoading && !stream && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-30">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white z-30 p-6 text-center">
              <VideoOff className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">摄像头启动失败</h3>
              <p className="text-gray-400 max-w-xs mb-6">
                {cameraError.message.includes("NotReadableError") || cameraError.message.includes("Device in use") 
                  ? "摄像头被占用。请确保其他应用已关闭摄像头。" 
                  : "无法访问摄像头，请检查权限设置。"}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                刷新页面
              </button>
            </div>
          )}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain bg-gray-950 scale-x-[-1]"
            autoPlay
            playsInline
            muted
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white z-10">
            <div className="bg-white/5 p-8 rounded-full mb-6 border border-white/10 backdrop-blur-sm">
              <VideoOff className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-gray-400 text-lg font-medium">摄像头已关闭</p>
            <button 
                onClick={() => setIsCameraOn(true)}
                className="mt-8 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-base font-bold transition-all shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95"
            >
                开启摄像头
            </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
      />
      
      {/* Overlay info - Loop through active measurements */}
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

      <button
        onClick={() => setIsCameraOn(!isCameraOn)}
        className="absolute top-6 right-6 p-3 rounded-2xl bg-black/40 text-white hover:bg-black/60 transition-all backdrop-blur-xl border border-white/10 pointer-events-auto z-40 cursor-pointer opacity-0 group-hover:opacity-100 shadow-xl"
        title={isCameraOn ? "关闭摄像头" : "打开摄像头"}
      >
        {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </button>
    </div>
  );
}
