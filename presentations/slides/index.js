export { default as Slide01 } from "./01_封面.js";
export { default as Slide02 } from "./02_痛点与目标.js";
export { default as Slide03 } from "./03_方案总览.js";
export { default as Slide04 } from "./04_系统架构图.js";
export { default as Slide05 } from "./05_采集流程（三视角）.js";
export { default as Slide06 } from "./06_指标与可解释性.js";
export { default as Slide07 } from "./07_深度报告（LLM流式）.js";
export { default as Slide08 } from "./08_报告中心与导出.js";
export { default as Slide09 } from "./09_治疗计划生成.js";
export { default as Slide10 } from "./10_语音MedVoice.js";
export { default as Slide11 } from "./11_工程与测试.js";
export { default as Slide12 } from "./12_结果与展望.js";
export { default as Slide13 } from "./13_致谢与问答.js";

const slides = [
  { id: "01", component: () => import("./01_封面.js") },
  { id: "02", component: () => import("./02_痛点与目标.js") },
  { id: "03", component: () => import("./03_方案总览.js") },
  { id: "04", component: () => import("./04_系统架构图.js") },
  { id: "05", component: () => import("./05_采集流程（三视角）.js") },
  { id: "06", component: () => import("./06_指标与可解释性.js") },
  { id: "07", component: () => import("./07_深度报告（LLM流式）.js") },
  { id: "08", component: () => import("./08_报告中心与导出.js") },
  { id: "09", component: () => import("./09_治疗计划生成.js") },
  { id: "10", component: () => import("./10_语音MedVoice.js") },
  { id: "11", component: () => import("./11_工程与测试.js") },
  { id: "12", component: () => import("./12_结果与展望.js") },
  { id: "13", component: () => import("./13_致谢与问答.js") },
];

export default slides;
