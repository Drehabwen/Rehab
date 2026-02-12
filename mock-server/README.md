# Rehab-Hub Mock Server

模拟后端 API 服务器，用于前端开发和测试。

## 快速开始

```bash
cd mock-server
npm install
npm start
```

服务器将在 `http://localhost:8000` 启动。

## API 端点

### REST API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/medvoice/api/structure` | POST | 语音病历结构化 |
| `/medvoice/api/export` | POST | 导出病历报告 |
| `/api/health` | GET | 健康检查 |

### WebSocket

| 端点 | 描述 |
|------|------|
| `/ws/analyze` | 体态分析 WebSocket |
| `/medvoice/ws/record` | 语音录制 WebSocket |

## 测试数据

测试数据位于 `src/data/` 目录，可自定义修改。

## 环境变量

```bash
PORT=8000  # 服务器端口 (默认 8000)
```
