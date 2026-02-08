# Vision3 项目开发规范与架构说明

本文档旨在统一 Vision3 项目（React + Python）的开发标准，确保代码的可维护性与稳定性。

## 1. 目录结构规范

### 1.1 后端 (backend/)
*   `main.py`: 服务入口，负责路由分发与中间件配置。
*   `utils/`: 工具类函数。
    *   `math_utils.py`: 通用几何运算。
    *   `posture_analysis.py`: 核心体态评估逻辑。
*   `services/`: 业务逻辑层（如对接 MedVoice AI）。
*   `models/`: Pydantic 数据模型定义。

### 1.2 前端 (src/)
*   `services/api.ts`: 所有与后端的 HTTP/WebSocket 通信逻辑。
*   `hooks/useWebsocket.ts`: 封装实时数据传输逻辑。
*   `store/`: 使用 Zustand 管理全局分析状态。

---

## 2. 后端开发规范 (Python)

### 2.1 编码风格
*   遵循 **PEP 8** 标准。
*   所有函数必须包含类型提示 (Type Hints)。
*   重要算法逻辑需附带 Docstring 说明。

### 2.2 异常处理
*   禁止使用空的 `except:`。
*   业务逻辑错误抛出 `HTTPException` 并附带明确的错误码。

### 2.3 性能优化
*   涉及大量矩阵运算时，必须使用 **NumPy**。
*   WebSocket 消息处理应保持在 30ms 以内，以确保前端 30FPS 的视觉反馈。

---

## 3. 前端开发规范 (TypeScript/React)

### 3.1 渲染性能
*   摄像头预览组件必须使用 `requestAnimationFrame` 而非 `setInterval`。
*   大对象（如 Landmarks 数组）在传递给后端前，应在前端进行必要的清洗，减少传输数据量。

### 3.2 状态管理
*   实时分析结果应存储在全局 Store 中，避免组件间层层传递。

---

## 4. 摄像头稳定性保障策略
1.  **权限重试机制**：前端在调用摄像头失败时，需提供 3 次自动重试。
2.  **状态监控**：后端 WebSocket 需心跳检测，若连接断开，前端应降级为本地简易分析模式。
3.  **负载均衡**：若计算压力过大，前端可动态调整发送给后端的坐标频率（例如从 30Hz 降至 15Hz）。
