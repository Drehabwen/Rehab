# Vision3 API 接口规范文档

本文档定义了 Vision3 前端（React）与后端（Python FastAPI）之间的通信协议，包括 WebSocket 实时分析和 RESTful API 接口。

## 1. 通信架构概述
*   **实时分析 (WebSocket)**：用于传输高频关键点坐标流，获取实时体态评估结果。
*   **业务逻辑 (HTTP)**：用于处理病历生成、历史数据查询、MedVoice AI 语音结构化等低频交互。

---

## 2. WebSocket 实时分析协议

### 2.1 连接地址
`ws://localhost:8000/ws/analyze`

### 2.2 前端发送：关键点数据流
每帧检测到 Landmarks 后发送。
```json
{
  "type": "POSTURE_SYNC",
  "view": "side", // front, back, side
  "width": 1280,
  "height": 720,
  "landmarks": [
    {"x": 0.5, "y": 0.2, "z": -0.1, "visibility": 0.99},
    ... // 33个 Mediapipe 关键点
  ]
}
```

### 2.3 后端返回：实时评估结果
```json
{
  "type": "ANALYSIS_RESULT",
  "metrics": {
    "headForward": 0.28,
    "shoulderAngle": 3.5,
    "hipAngle": 1.2
  },
  "issues": [
    {
      "id": "head-forward",
      "severity": "moderate",
      "title": "头前倾",
      "description": "耳垂位于肩峰前方...",
      "recommendation": "建议进行收下巴训练..."
    }
  ],
  "timestamp": 1707293400000
}
```

---

## 3. RESTful API 接口

### 3.1 基础信息
*   **Base URL**: `http://localhost:8000/api`
*   **Content-Type**: `application/json`

### 3.2 静态分析 (Snapshot Analysis)
将单张图片的分析请求发送至后端。
*   **Endpoint**: `POST /analyze/static`
*   **Request**:
    ```json
    {
      "view": "front",
      "landmarks": [...],
      "image_metadata": { "width": 1920, "height": 1080 }
    }
    ```
*   **Response**: 同 WebSocket 返回的 `ANALYSIS_RESULT`。

### 3.3 MedVoice AI 集成接口
调用 MedVoice 模块处理语音或结构化病历。
*   **Endpoint**: `POST /medvoice/structure`
*   **Description**: 将体态分析结果与语音转录文本结合，生成结构化医疗报告。
*   **Request**:
    ```json
    {
      "transcript": "患者主诉颈部酸痛...",
      "analysis_data": { ... }
    }
    ```

---

## 4. 错误处理规范
所有接口出错时应返回标准错误格式：
```json
{
  "error": {
    "code": "MODEL_LOADING_FAILED",
    "message": "AI 模型初始化失败，请检查资源路径",
    "detail": "..."
  }
}
```
