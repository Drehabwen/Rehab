# Rehab API Specification

本文档描述当前代码中的实际接口，而不是历史版本设想。

当前后端入口见 [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py)，协议模型见 [backend/models.py](C:/Users/DORAT/Desktop/Rehab-main/backend/models.py)。

## 1. Base Addresses

- HTTP base: `http://localhost:8002`
- WebSocket: `ws://localhost:8002/ws/analyze`

前端默认配置来源：

- [src/config/index.ts](C:/Users/DORAT/Desktop/Rehab-main/src/config/index.ts)

## 2. HTTP Endpoints

### 2.1 Health

- Method: `GET`
- Path: `/health`
- Purpose: health check and integration flags

Example response:

```json
{
  "status": "healthy",
  "services": {
    "llm_key_configured": true,
    "medvoice_integrated": true
  }
}
```

### 2.2 Camera Stream

- Method: `GET`
- Path: `/video_feed`
- Purpose: MJPEG camera stream

### 2.3 Camera Control

- Method: `POST`
- Path: `/camera/start`
- Purpose: start backend camera manager

- Method: `POST`
- Path: `/camera/stop`
- Purpose: stop backend camera manager

### 2.4 Treatment Plan

#### Generate

- Method: `POST`
- Path: `/api/treatment-plan/generate`

Request body:

```json
{
  "patientId": "patient_001",
  "assessmentId": "assessment_001",
  "createdBy": "system"
}
```

Response shape:

```json
{
  "id": 1,
  "patientId": "patient_001",
  "assessmentId": "assessment_001",
  "sessionId": null,
  "sessionReportId": null,
  "version": 1,
  "content": "treatment plan markdown or plain text",
  "isCurrent": true,
  "createdAt": "2026-03-10T10:00:00",
  "updatedAt": "2026-03-10T10:00:00",
  "createdBy": "system"
}
```

#### Generate Stream

- Method: `POST`
- Path: `/api/treatment-plan/generate/stream`
- Response: `text/plain` streaming chunks

#### Generate From Session Report

- Method: `POST`
- Path: `/api/treatment-plan/generate-from-session-report`

Request body:

```json
{
  "patientId": "patient_001",
  "sessionId": "session_001",
  "sessionReportId": "report_001",
  "sessionReportMarkdown": "# Session Report",
  "insights": ["insight 1"],
  "recommendations": ["recommendation 1"],
  "createdBy": "system"
}
```

#### Generate From Session Report Stream

- Method: `POST`
- Path: `/api/treatment-plan/generate-from-session-report/stream`
- Response: `text/plain` streaming chunks

### 2.5 Session Report

- Method: `POST`
- Path: `/api/session-report/generate`

Request body:

```json
{
  "sessionId": "session_001",
  "patientId": "patient_001",
  "patientName": "Test Patient",
  "sourceAssessmentIds": ["a1", "a2"],
  "readiness": {
    "readyCount": 2,
    "partialCount": 0,
    "missingTypes": [],
    "availableTypes": ["posture", "rom"]
  },
  "posture": {
    "title": "Posture",
    "status": "ready",
    "preview": "preview text",
    "evidenceCount": 3
  },
  "rom": {
    "title": "ROM",
    "status": "ready",
    "preview": "preview text",
    "evidenceCount": 2
  },
  "medvoice": null
}
```

Response shape:

```json
{
  "id": "session-report-001",
  "sessionId": "session_001",
  "patientId": "patient_001",
  "markdown": "# Session Report",
  "insights": ["insight 1"],
  "recommendations": ["recommendation 1"],
  "createdAt": 1773111556699,
  "sourceAssessmentIds": ["a1", "a2"]
}
```

## 3. WebSocket Endpoint

- Path: `/ws/analyze`
- Purpose: real-time posture analysis, joint analysis, batch report generation, stepped analysis, deep analysis streaming

## 4. WebSocket Messages

### 4.1 Frontend to Backend

#### `POSTURE_SYNC`

Used for real-time posture analysis.

```json
{
  "type": "POSTURE_SYNC",
  "view": "front",
  "width": 1280,
  "height": 720,
  "timeSeriesLandmarks": [
    [
      { "x": 0.5, "y": 0.2, "z": -0.1, "visibility": 0.99 }
    ]
  ],
  "requestId": "optional-id"
}
```

#### `JOINT_ANALYSIS`

Used for ROM / joint angle measurement.

```json
{
  "type": "JOINT_ANALYSIS",
  "width": 1280,
  "height": 720,
  "landmarks": [],
  "worldLandmarks": [],
  "measurements": [
    {
      "id": "m1",
      "jointType": "shoulder",
      "direction": "flexion",
      "side": "left"
    }
  ]
}
```

#### `POSTURE_BATCH_ANALYSIS`

Used for batch posture report generation from temporal data.

#### `POSTURE_STEPPED_ANALYSIS`

Used for multi-view stepped posture capture.

```json
{
  "type": "POSTURE_STEPPED_ANALYSIS",
  "assessmentType": "standard",
  "frames": [
    {
      "view": "front",
      "width": 1280,
      "height": 720,
      "timeSeriesLandmarks": [],
      "timestamp": 1773111556699
    }
  ],
  "requestId": "optional-id"
}
```

#### `POSTURE_DEEP_ANALYSIS`

Used to request streamed deep-report output from LLM logic.

```json
{
  "type": "POSTURE_DEEP_ANALYSIS",
  "assessmentType": "quick",
  "frames": [],
  "auxiliaryDiagnosis": "basic report text",
  "requestId": "deep-optional-id"
}
```

### 4.2 Backend to Frontend

#### `ANALYSIS_RESULT`

Real-time posture result.

```json
{
  "type": "ANALYSIS_RESULT",
  "metrics": {
    "headForward": 0.28,
    "shoulderAngle": 3.5,
    "hipAngle": 1.2
  },
  "issues": [],
  "annotations": [],
  "timestamp": 1773111556699
}
```

#### `JOINT_RESULT`

Joint measurement result.

```json
{
  "type": "JOINT_RESULT",
  "results": [
    { "id": "m1", "angle": 135.2 }
  ],
  "timestamp": 1773111556699
}
```

#### `POSTURE_ACK`

Acknowledges a deep-analysis request has started.

```json
{
  "type": "POSTURE_ACK",
  "status": "processing",
  "requestId": "deep-optional-id"
}
```

#### `DEEP_REPORT_STREAM`

Chunked LLM report output.

```json
{
  "type": "DEEP_REPORT_STREAM",
  "content": "partial markdown chunk"
}
```

#### `POSTURE_REPORT`

Returned for stepped/batch/deep report flows.

```json
{
  "type": "POSTURE_REPORT",
  "markdown": "# Report",
  "reportId": "uuid",
  "timeSeries": [],
  "metrics": {},
  "auxiliaryDiagnosis": "basic report",
  "issues": [],
  "timestamp": 1773111556699,
  "assessmentType": "standard",
  "isDeepReport": false
}
```

## 5. Frontend Client Mapping

Current frontend API clients:

- [src/api/treatmentPlanApi.ts](C:/Users/DORAT/Desktop/Rehab-main/src/api/treatmentPlanApi.ts)
- [src/api/sessionReportApi.ts](C:/Users/DORAT/Desktop/Rehab-main/src/api/sessionReportApi.ts)
- [src/hooks/usePostureWS.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/usePostureWS.ts)

## 6. Access Control Mapping

接口权限落地基线见：

- [docs/ROLE_PERMISSION_EXECUTION_SPEC.md](C:/Users/DORAT/Desktop/Rehab-main/docs/ROLE_PERMISSION_EXECUTION_SPEC.md)
- [docs/API_PERMISSION_MAPPING_DRAFT.md](C:/Users/DORAT/Desktop/Rehab-main/docs/API_PERMISSION_MAPPING_DRAFT.md)

建议实现规则：

- 后端接口必须绑定 `required_permission`
- 查询接口必须绑定 `scope_strategy`
- 高危动作必须启用审计日志

## 7. Error Handling

HTTP routes use FastAPI `HTTPException`. Typical cases:

- `503`: config unavailable, such as treatment-plan config missing
- `501`: upstream assessment/session data unavailable
- `500`: unexpected internal failure

WebSocket failures are not normalized into one global envelope yet; callers should treat malformed payloads, disconnects, or missing acks as transport failures and handle retry/reconnect on the frontend.

## 8. Drift Warning

If this document conflicts with older notes or screenshots, trust the following first:

1. [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py)
2. [backend/models.py](C:/Users/DORAT/Desktop/Rehab-main/backend/models.py)
3. [src/config/index.ts](C:/Users/DORAT/Desktop/Rehab-main/src/config/index.ts)
