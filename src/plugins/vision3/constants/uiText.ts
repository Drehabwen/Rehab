/**
 * UI 文本常量
 * 统一管理系统中的所有 UI 文本，避免硬编码
 */

// 评估模式相关文本
export const ASSESSMENT_TEXTS = {
  standard: {
    label: '标准评估',
    description: '前-侧-后三视角完整评估',
    fullDescription: '前-侧-后三视角完整评估，数据完整、诊断准确、全面分析。适合需要详细诊断的场景。',
    features: ['数据完整', '诊断准确', '全面分析'],
    estimatedTime: '3-5 分钟',
    badge: '推荐',
  },
  quick: {
    label: '快速评估',
    description: '单视角快速筛查',
    fullDescription: '单视角快速筛查，即时反馈、快速筛查、初步检查。适合快速筛查和初步检查。',
    features: ['即时反馈', '快速筛查', '初步检查'],
    estimatedTime: '1-2 分钟',
    badge: '快速',
  },
};

// 视角配置文本
export const VIEW_TEXTS = {
  front: {
    label: '正视位',
    description: '评估高低肩、骨盆倾斜',
  },
  side: {
    label: '侧视位',
    description: '评估圆肩驼背、骨盆前倾',
  },
  back: {
    label: '背视位',
    description: '评估脊柱侧弯风险',
  },
};

// 拍摄状态文本
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

// 按钮文本
export const BUTTON_TEXTS = {
  startAutoCapture: '开始自动拍摄',
  capturing: '自动拍摄中...',
  retake: '重新拍摄',
  generateReport: '生成报告',
  generateReportNow: '立即生成报告',
  nextStep: (viewLabel: string) => `下一步：${viewLabel}`,
  backToEntry: '返回入口',
  startScan: '开始全维度扫描',
  preparing: '准备拍照...',
};

// 面板文本
export const PANEL_TEXTS = {
  dataPanel: '基础报告',
  aiReport: '深度报告',
  auxiliaryDiagnosis: '辅助诊断',
  deepAnalysis: '深度分析',
  progress: {
    standard: '分步拍摄进度',
    quick: '快速评估',
  },
};

// 报告相关文本
export const REPORT_TEXTS = {
  generating: 'AI 报告生成中',
  generatingDescription: '正在通过 LLM 深度分析您的生物力学数据，请稍候...',
  intelligentReport: '智能诊断报告',
  generatePDF: '生成 PDF 报告',
};

// 数据质量文本
export const DATA_QUALITY_TEXTS = {
  excellent: '数据采集质量极高，已达到临床级分析标准。',
  suggestion: '建议保持更稳定的站姿，以获得更精准的关节受力分析。',
};

// 数据捕获文本
export const DATA_CAPTURE_TEXTS = {
  captured: 'Data Captured',
  description: '2秒时序骨架关键点已成功保存，共采集约60帧数据。',
};

// 位置检测文本
export const POSITION_TEXTS = {
  scanning: 'Scanning for Body Landmarks...',
  locked: 'Position Locked - Ready',
};

// 录制进度文本
export const RECORDING_TEXTS = {
  label: 'Recording Skeletal Data',
};

// 视角标签文本
export const VIEW_LABEL_TEXTS = {
  front: '正面视角',
  side: '侧面视角',
  back: '背面视角',
};

// 摄像头控制文本
export const CAMERA_TEXTS = {
  close: '关闭',
  open: '开启',
  mockTest: '模拟测试数据',
};

// 测量任务文本
export const MEASUREMENT_TEXTS = {
  start: '启动关节采集',
  stop: '结束测量任务',
  reset: '重置',
  switchView: '切换视图',
  back: '返回',
};

// ROM 报告文本
export const ROM_REPORT_TEXTS = {
  title: '关节活动度报告',
};

// 系统状态文本
export const SYSTEM_TEXTS = {
  ready: '系统就绪',
  reevaluate: '重新评估',
};
