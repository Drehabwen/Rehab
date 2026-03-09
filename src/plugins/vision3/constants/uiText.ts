/**
 * Vision3 文案常量
 */

export const ASSESSMENT_TEXTS = {
  standard: {
    label: '标准评估',
    description: '前/侧/后三视角完整评估',
    fullDescription: '覆盖前侧后 3 个视角，适合首诊与完整复评，输出更全面。',
    features: ['数据完整', '诊断更准', '支持深度报告'],
    estimatedTime: '3-5 分钟',
    badge: '推荐',
  },
  quick: {
    label: '快速评估',
    description: '单视角快速筛查',
    fullDescription: '快速完成关键指标筛查，适合门诊高频场景与训练前后检查。',
    features: ['响应快', '流程短', '可快速复测'],
    estimatedTime: '1-2 分钟',
    badge: '快速',
  },
};

export const VIEW_TEXTS = {
  front: {
    label: '正视位',
    description: '评估高低肩、骨盆倾斜',
  },
  side: {
    label: '侧视位',
    description: '评估头前引、圆肩驼背与骨盆前倾',
  },
  back: {
    label: '背视位',
    description: '评估脊柱侧偏与肩胛对称性',
  },
};

export const CAPTURE_STATUS_TEXTS = {
  idle: '准备拍摄',
  scanning: {
    notInPosition: '请正对摄像头并保持全身可见',
    ready: '已就绪，准备拍摄',
  },
  countdown: (count: number) => `${count}`,
  recording: '正在采集时序数据...',
  completed: (viewLabel: string) => `${viewLabel}拍摄完成`,
  analyzing: '分析中...',
};

export const BUTTON_TEXTS = {
  startAutoCapture: '开始自动拍摄',
  capturing: '自动拍摄中...',
  retake: '重新拍摄',
  generateReport: '生成报告',
  generateReportNow: '立即生成报告',
  nextStep: (viewLabel: string) => `下一步：${viewLabel}`,
  backToEntry: '返回入口',
  startScan: '开始扫描',
  preparing: '准备中...',
};

export const PANEL_TEXTS = {
  dataPanel: '基础数据',
  aiReport: '智能报告',
  auxiliaryDiagnosis: '辅助诊断',
  deepAnalysis: '深度分析',
  progress: {
    standard: '分步拍摄进度',
    quick: '快速评估进度',
  },
};

export const REPORT_TEXTS = {
  generating: 'AI 报告生成中',
  generatingDescription: '正在基于当前体态数据生成结构化分析，请稍候。',
  intelligentReport: '智能诊断报告',
  generatePDF: '导出 PDF',
};

export const DATA_QUALITY_TEXTS = {
  excellent: '数据质量较高，可用于临床级参考分析。',
  suggestion: '建议保持更稳定站姿后复测，以提高报告可靠性。',
};

export const DATA_CAPTURE_TEXTS = {
  captured: 'Data Captured',
  description: '2秒时序骨架关键点已成功保存，共采集约60帧数据。',
};

export const POSITION_TEXTS = {
  scanning: 'Scanning for Body Landmarks...',
  locked: 'Position Locked - Ready',
};

export const RECORDING_TEXTS = {
  label: 'Recording',
};

export const VIEW_LABEL_TEXTS = {
  front: '正面视角',
  side: '侧面视角',
  back: '背面视角',
};

export const CAMERA_TEXTS = {
  close: '关闭',
  open: '开启',
  mockTest: '模拟测试数据',
};

export const MEASUREMENT_TEXTS = {
  start: '开始测量',
  stop: '停止测量',
  reset: '重置',
  switchView: '切换视图',
  back: '返回',
};

export const ROM_REPORT_TEXTS = {
  title: '关节活动度报告',
};

export const SYSTEM_TEXTS = {
  ready: '系统就绪',
  reevaluate: '重新评估',
};
