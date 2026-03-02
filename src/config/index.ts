// 全局配置文件
export const CONFIG = {
  // WebSocket 配置
  websocket: {
    url: 'ws://localhost:8002/ws/analyze',
  },
  
  // 视频配置
  video: {
    defaultWidth: 640,
    defaultHeight: 480,
  },
  
  // 分析配置
  analysis: {
    timeout: 60000, // 60秒
    confidenceThreshold: 0.5,
  },
  
  // 姿态分析阈值
  postureThresholds: {
    // 头前倾阈值
    headForward: {
      moderate: 0.25,
      severe: 0.45
    },
    // 圆肩/含胸阈值
    shoulderRounded: {
      mild: 0.15
    },
    // 头部侧倾阈值
    headTilt: {
      mild: 0.03,
      moderate: 0.08
    },
    // 高低肩阈值
    unevenShoulders: {
      mild: 0.03,
      moderate: 0.08
    },
    // 骨盆侧倾阈值
    unevenHips: {
      mild: 0.03,
      moderate: 0.08
    },
    // 身体中线偏移阈值
    midlineShift: {
      moderate: 0.08
    }
  },
  
  // API 配置
  api: {
    baseUrl: 'http://localhost:8002',
  },
  
  // 存储配置
  storage: {
    sessionKey: 'rehab_session',
    patientKey: 'rehab_patient',
  },
};

export default CONFIG;