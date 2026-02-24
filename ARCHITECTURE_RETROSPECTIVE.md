# Rehab-Vision3 架构演进与技术复盘报告
## 日期：2026-02-24
## 核心主题：突破 AI 辅助开发的能力天花板

### 1. 项目背景与痛点
在 Rehab-Vision3 进入深度优化阶段时，系统面临了以下“灵异”现象：
- **逻辑塌陷**：每次修改采集逻辑，骨骼渲染层就会随机失效。
- **状态竞争**：MediaPipe 的高频异步流与 React 的组件生命周期产生冲突。
- **AI 疲态**：随着 `usePostureCapture` 等 Hook 复杂度超过 300 行，AI 开始出现理解偏差，重构引入的 Bug 多于修复的 Bug。

### 2. 核心技术解构

#### A. 实时流处理：单例订阅者模式
为了优化性能和稳定性，我们重构了 [useMediaPipe.ts](file:///c:/Users/DORAT/Desktop/Rehab-main/src/hooks/useMediaPipe.ts)：
- **单例模型**：通过全局 `globalHolistic` 避免 WebGL 上下文冲突。
- **多路复用**：建立 `activeListeners` 订阅者队列，实现“一次推断，多处消费”。
- **异步环**：利用 `requestAnimationFrame` 结合 `await holistic.send()` 确保渲染平滑。

#### B. 姿态判定算法：Vision3Geometry
我们将所有几何计算逻辑抽离至 [vision3-geometry.ts](file:///c:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/vision3-geometry.ts)：
- **位置检测**：定义核心关键点集（鼻尖、双肩、双胯），基于 `visibility > 0.3` 的加权可见度判定。
- **稳定性判定**：基于核心点位移的均方根位移（RMSD）算法，判定用户是否处于“静止准备”状态（阈值 $< 0.01$）。

#### C. 状态机重构：useCaptureStateMachine
废弃基于 `useEffect` 的命令式流转，引入有限状态机（FSM）：
- **状态链路**：`idle` -> `scanning` -> `countdown` -> `recording` -> `analyzing` -> `completed`。
- **优势**：逻辑与 UI 完全解耦。UI 仅根据 `status` 渲染视图，不再参与逻辑决策。

### 3. 方法论总结：Nexus Architecture Contract
为了防止 AI 推理失效，我们建立了三条契约：
1. **隔离式进化**：禁止在 View 层写数学公式，强制抽离 `Pure Logic`。
2. **契约驱动**：先定义状态机接口，再写实现逻辑。
3. **逻辑锚点**：核心算法必须具备单元测试，作为 AI 的“真理来源”。

---
*文档由 AI 辅助撰写，凝结自 Rehab-Vision3 分支开发过程中的实际教训。*
