/**
 * Vision3 文案常量
 */

export const ASSESSMENT_TEXTS = {
  standard: {
    label: '标准评估',
    description: '前 / 侧 / 后三视角完整评估',
    fullDescription: '覆盖三个标准视角，适合首次筛查、完整复核和正式归档。',
    features: ['数据更完整', '结果更稳定', '支持深度报告'],
    estimatedTime: '3-5 分钟',
    badge: '推荐',
  },
  quick: {
    label: '快速评估',
    description: '单视角快速筛查',
    fullDescription: '快速完成关键指标筛查，适合高频监控、课前课后检查和复测。',
    features: ['响应更快', '流程更短', '适合快速复测'],
    estimatedTime: '1-2 分钟',
    badge: '快速',
  },
};

export const VIEW_TEXTS = {
  front: {
    label: '正视位',
    description: '分析高低肩、骨盆倾斜等前视指标',
  },
  side: {
    label: '侧视位',
    description: '分析头前伸、圆肩驼背与骨盆前倾',
  },
  back: {
    label: '背视位',
    description: '分析脊柱侧偏与肩胛对称情况',
  },
};

export const CAPTURE_STATUS_TEXTS = {
  idle: '准备拍摄',
  scanning: {
    notInPosition: '请正对摄像头并保持全身可见',
    ready: '姿态已就绪，准备拍摄',
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
  startScan: '开始筛查',
  preparing: '准备中...',
};

export const PANEL_TEXTS = {
  dataPanel: '基础数据',
  aiReport: '智能报告',
  performanceAnalysis: '表现分析',
  deepAnalysis: '深度分析',
  progress: {
    standard: '分步拍摄进度',
    quick: '快速评估进度',
  },
};

export const REPORT_TEXTS = {
  generating: 'AI 报告生成中',
  generatingDescription: '系统正在基于当前筛查数据生成结构化分析，请稍候。',
  intelligentReport: '智能筛查报告',
  generatePDF: '导出 PDF',
};

export const DATA_QUALITY_TEXTS = {
  excellent: '当前数据质量较高，可用于正式筛查归档。',
  suggestion: '建议保持更稳定姿态后重新采集，以提高报告可靠性。',
};

export const DATA_CAPTURE_TEXTS = {
  captured: '数据已采集',
  description: '2 秒时序关键点已成功保存，本次采集可用于后续分析。',
};

export const POSITION_TEXTS = {
  scanning: '正在识别人体关键点...',
  locked: '姿态锁定，可开始采集',
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
