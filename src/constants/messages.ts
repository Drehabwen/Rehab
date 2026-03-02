// 错误消息和日志信息常量
export const MESSAGES = {
  // WebSocket 错误
  websocket: {
    connectionError: 'WebSocket连接失败，请检查服务器是否运行',
    connectionClosed: 'WebSocket连接已关闭',
    messageError: 'WebSocket消息处理失败',
  },
  
  // 摄像头错误
  camera: {
    accessDenied: '摄像头访问被拒绝，请检查权限设置',
    notFound: '未检测到摄像头设备',
    error: '摄像头初始化失败',
  },
  
  // 分析错误
  analysis: {
    timeout: '分析超时，请重试',
    noPerson: '未检测到人物，请调整摄像头位置',
    lowConfidence: '检测置信度低，请保持清晰可见',
    error: '分析失败，请重试',
  },
  
  // 存储错误
  storage: {
    saveError: '保存失败，请重试',
    loadError: '加载失败，请重试',
    clearError: '清除失败，请重试',
  },
  
  // 通用错误
  common: {
    unknownError: '未知错误，请联系管理员',
    networkError: '网络错误，请检查网络连接',
    validationError: '数据验证失败，请检查输入',
  },
  
  // 成功消息
  success: {
    saved: '保存成功',
    loaded: '加载成功',
    cleared: '清除成功',
    analyzed: '分析完成',
  },
  
  // 日志信息
  log: {
    websocketConnected: 'WebSocket连接成功',
    websocketDisconnected: 'WebSocket连接断开',
    analysisStarted: '开始分析',
    analysisCompleted: '分析完成',
    cameraStarted: '摄像头启动成功',
    cameraStopped: '摄像头已停止',
  },
};

export default MESSAGES;