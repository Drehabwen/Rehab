# Rehab Main

康复评估工作台，包含以下核心能力：

- `Vision3` 体态分析
- `ROM` 关节活动度评估
- `MedVoice` 语音接诊与结构化病历
- 报告中心、数据中心、前后对比

当前前端入口是 [src/App.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/App.tsx)，实际应用壳子是 [src/hub/NexusHub.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/hub/NexusHub.tsx)。当前后端入口是 [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py)。

## 技术栈

前端：

- Vite
- React 18
- TypeScript
- Zustand
- Dexie
- Tailwind CSS
- Vitest
- MediaPipe Pose / Holistic

后端：

- FastAPI
- Pydantic
- MediaPipe
- NumPy
- OpenAI 兼容 LLM 接口

## 本地运行

### 前端

```bash
npm install
npm run dev
```

默认前端开发地址：

- `http://localhost:5173`

### 后端

```bash
cd backend
pip install -r requirements.txt
python main.py
```

默认后端地址：

- HTTP: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws/analyze`

## 常用命令

```bash
npm run dev
npm run build
npm run check
npm run test -- --run
```

## 目录速览

```text
src/
  hub/                应用壳子、患者工作台、报告/数据中心
  plugins/
    vision3/          体态分析
    rom/              ROM 评估
    medvoice/         语音接诊
  store/              Zustand 状态管理
  api/                HTTP API client
  hooks/              通用 hooks
  components/         通用组件
  lib/                底层工具与 Dexie 数据库

backend/
  main.py             FastAPI 入口
  models.py           Pydantic 协议模型
  utils/              分析、报告、LLM、会话服务
  tests/              后端测试
```

## 当前接口概况

后端主要暴露：

- `GET /health`
- `GET /video_feed`
- `POST /camera/start`
- `POST /camera/stop`
- `POST /api/treatment-plan/generate`
- `POST /api/treatment-plan/generate/stream`
- `POST /api/treatment-plan/generate-from-session-report`
- `POST /api/treatment-plan/generate-from-session-report/stream`
- `POST /api/session-report/generate`
- `POST /api/integration/sync-screening`
- `GET /api/integration/synced-screenings`
- `POST /api/integration/intake/{session_id}/confirm`
- `POST /api/integration/family/login`
- `GET /api/integration/family/access/{patient_id}`
- `POST /api/integration/family/access/{patient_id}/rotate`
- `POST /api/integration/family/access-link/{link_id}/extend`
- `POST /api/integration/family/access-link/{link_id}/revoke`
- `POST /api/integration/scale/push`
- `GET /api/integration/scale/pending/{patient_id}`
- `POST /api/integration/scale/submit`
- `GET /api/integration/scale/results/{session_id}`
- `WS /ws/analyze`

## 文档索引

- 项目总盘点：[PROJECT_INFO_MAP.md](C:/Users/DORAT/Desktop/Rehab-main/PROJECT_INFO_MAP.md)
- 闭环工作流：[docs/CLOSED_LOOP_WORKFLOW.md](docs/CLOSED_LOOP_WORKFLOW.md)
- 患者身份契约：[docs/IDENTITY_CONTRACT.md](docs/IDENTITY_CONTRACT.md)
- API 规范：[docs/API_SPECIFICATION.md](C:/Users/DORAT/Desktop/Rehab-main/docs/API_SPECIFICATION.md)
- 开发规范：[docs/DEVELOPMENT_STANDARDS.md](C:/Users/DORAT/Desktop/Rehab-main/docs/DEVELOPMENT_STANDARDS.md)
- 设计系统：[DESIGN_SYSTEM.md](C:/Users/DORAT/Desktop/Rehab-main/DESIGN_SYSTEM.md)
- UI 设计指南：[docs/UI_DESIGN_GUIDE.md](C:/Users/DORAT/Desktop/Rehab-main/docs/UI_DESIGN_GUIDE.md)

## 当前状态

前端单测当前为全绿：

- Vitest `114` suites
- `241` tests
- `0` failures

## 注意事项

- 仓库内包含一个嵌入式子项目 `Deeprehab-MedVoice-AI--/`，它不是主前后端壳子，但当前后端会在可用时把它挂载到 `/medvoice`。
- 历史文档较多，如出现冲突，以代码和配置为准。
