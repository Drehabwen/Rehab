import React, { useEffect, useRef, useState } from 'react';

/**
 * RawCameraTest - 终极诊断页面
 * 包含：设备枚举、多种分辨率尝试、实时轨道状态监测
 */
export default function RawCameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<string>('等待启动...');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [trackInfo, setTrackInfo] = useState<any>(null);
  const [resolution, setResolution] = useState<string>('未知');

  const checkDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error('Enumerate devices failed:', err);
      return [];
    }
  };

  const startCamera = async (deviceId?: string) => {
    setStatus('正在请求权限...');
    setError(null);
    
    // 尝试不同的约束
    const constraints = [
      { video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }, audio: false },
      { video: true, audio: false }, // 最基本约束
      { video: { width: 640, height: 480 }, audio: false } // 低分辨率尝试
    ];

    let lastErr = null;
    for (const constraint of constraints) {
      try {
        console.log('Trying constraint:', constraint);
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          const track = stream.getVideoTracks()[0];
          
          // 实时监测轨道状态
          const updateTrackInfo = () => {
            setTrackInfo({
              label: track.label,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              settings: track.getSettings()
            });
            setResolution(`${track.getSettings().width}x${track.getSettings().height}`);
          };

          track.onmute = updateTrackInfo;
          track.onunmute = updateTrackInfo;
          updateTrackInfo();

          setStatus('摄像头已连接');
          return;
        }
      } catch (err: any) {
        lastErr = err;
        console.warn('Constraint failed:', constraint, err);
      }
    }

    setError(`${lastErr?.name}: ${lastErr?.message}`);
    setStatus('所有尝试均失败');
  };

  useEffect(() => {
    checkDevices().then(() => startCamera());
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="p-10 flex flex-col items-center gap-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-slate-900">摄像头深度诊断 (V2 Step 1)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* 左侧：视频预览 */}
        <div className="space-y-4">
          <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover bg-red-900/10" // 浅红色背景，如果视频透明能看出来
            />
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
              LIVE
            </div>
            {trackInfo?.muted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <p className="text-white font-bold">硬件轨道被静音 (Muted)</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => startCamera()}
              className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              重新连接默认
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-300 transition-all"
            >
              刷新整个页面
            </button>
          </div>
        </div>

        {/* 右侧：诊断数据 */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              当前状态
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-slate-500">连接状态:</div>
              <div className={error ? 'text-red-500 font-bold' : 'text-blue-600 font-bold'}>{status}</div>
              
              <div className="text-slate-500">分辨率:</div>
              <div className="font-mono">{resolution}</div>

              <div className="text-slate-500">轨道状态:</div>
              <div className="font-mono">{trackInfo?.readyState || '无'}</div>

              <div className="text-slate-500">静音状态 (Muted):</div>
              <div className={trackInfo?.muted ? 'text-orange-500 font-bold' : 'text-green-600'}>
                {trackInfo?.muted ? '已静音 (硬件锁)' : '正常'}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-xs border border-red-100 font-mono">
                {error}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              检测到的设备 ({devices.length})
            </h2>
            <div className="space-y-2">
              {devices.map((device, i) => (
                <button
                  key={device.deviceId}
                  onClick={() => startCamera(device.deviceId)}
                  className="w-full text-left px-4 py-2 rounded-xl text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-transparent hover:border-indigo-100"
                >
                  {i + 1}. {device.label || `摄像头 ${device.deviceId.slice(0, 5)}...`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-blue-50 p-6 rounded-3xl border border-blue-100">
        <h3 className="text-blue-800 font-bold mb-2">排查指南：</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>如果显示 <b>“已静音 (硬件锁)”</b>，请检查笔记本侧边的物理隐私开关。</li>
          <li>如果显示 <b>“NotReadableError”</b>，说明摄像头被其他程序（如微信、腾讯会议）占用。</li>
          <li>尝试点击右侧列表中的不同摄像头设备（如果有多个）。</li>
        </ul>
      </div>
    </div>
  );
}
