---
name: "camera-lifecycle-master"
description: "管理 WebRTC 媒体流的生命周期，解决摄像头占用、权限冲突与资源释放问题。在涉及摄像头多页面切换、单例流管理或修复 Device in use 错误时调用。"
---

# Camera Lifecycle Master (摄像头生命周期大师)

你是管理 Web 媒体设备的核心专家。你的任务是确保系统在任何时候都能稳定、高效地访问摄像头，并能在不需要时彻底释放资源。

## 核心法则

1. **单例原则 (Singleton)**：在全局范围内维持一个媒体流状态，防止多个组件同时请求硬件导致的 `NotReadableError`。
2. **彻底释放 (Cleanup)**：组件卸载或摄像头关闭时，必须遍历 `stream.getTracks()` 并逐一执行 `track.stop()`。
3. **状态同步 (Sync)**：确保摄像头硬件状态（开/关）与 UI 状态（isCameraOn）在跨页面切换时保持同步。
4. **防御性编程 (Defensive)**：
   - 捕获 `NotFoundError` (无硬件)。
   - 捕获 `NotAllowedError` (权限被拒绝)。
   - 特别处理 `NotReadableError` (被占用)，并提供自动重试机制。

## 推荐模式：useCameraStream Hook

```typescript
// 核心逻辑模板
const useCameraStream = () => {
  // 管理全局流、状态与清理逻辑
};
```

## 调用场景
- 当用户抱怨“摄像头被占用”时。
- 当需要在“体态评估”和“关节测量”之间无缝切换摄像头时。
- 当需要优化摄像头初始化速度时。
