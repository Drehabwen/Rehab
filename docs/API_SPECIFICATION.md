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

### 2.6 Integration Closed Loop

These routes are mounted from `backend/routers/integration.py` with the prefix `/api/integration`.
They are the current bridge between the early screening terminal, the therapist workstation, and the parent / patient chatbot.

#### Screening Sync

- Method: `POST`
- Path: `/api/integration/sync-screening`
- Purpose: receive one completed screening session from the early screening terminal.

Request body shape:

```json
{
  "session_id": "screening_session_001",
  "subject": {
    "subject_id": "student_001",
    "display_name": "Student Name",
    "sex": "male",
    "age": 14,
    "height_cm": 165.5,
    "notes": ""
  },
  "protocol_results": [
    {
      "result_id": "result_static_001",
      "protocol": "static_posture",
      "status": "completed",
      "capture_quality": "good",
      "metrics": {},
      "findings": [],
      "risk_flags": [],
      "recommendations": [],
      "psi_score": null,
      "severity_grades": null
    }
  ],
  "integrated_report": {
    "report_id": "report_001",
    "title": "Screening Summary",
    "overall_risk": "attention",
    "consistency_level": "single_protocol",
    "main_patterns": [],
    "next_action": "pending_review",
    "summary": "Screening summary text.",
    "recommendations": []
  },
  "llm_analysis": null,
  "created_at": "2026-05-30T10:00:00Z",
  "completed_at": "2026-05-30T10:05:00Z"
}
```

Response shape:

```json
{
  "status": "success",
  "action": "created",
  "session_id": "screening_session_001"
}
```

`action` can be `created` or `updated`; the route is idempotent by `session_id`.

#### Screening Intake

- `GET /api/integration/synced-screenings`
- `GET /api/integration/synced-screenings?status=pending`
- `GET /api/integration/synced-screenings/{session_id}`
- `POST /api/integration/intake/{session_id}/confirm`
- `POST /api/integration/synced-screenings/{session_id}/import`
- `DELETE /api/integration/synced-screenings/{session_id}`

These routes support the B-end synchronization panel. New imports should confirm identity through `/intake/{session_id}/confirm`, which binds the source `subject_id` alias to a canonical `patient_id` and can create a `family_code` access link. The older `/import` route only marks a screening as imported.

Example intake confirmation:

```json
{
  "action": "create_patient",
  "patient_id": "pat_01hx_example",
  "family_code": "AB12CD",
  "family_code_expires_at": "2026-12-31T23:59:59"
}
```

#### Family Access

- `POST /api/integration/family/login`
- `GET /api/integration/family/access/{patient_id}`
- `POST /api/integration/family/access/{patient_id}/rotate`
- `POST /api/integration/family/access-link/{link_id}/extend`
- `POST /api/integration/family/access-link/{link_id}/revoke`

`POST /family/login` resolves an active, unexpired parent / guardian `family_code` into the canonical `patient_id` that C-end scale, plan, assessment, and tracking routes use.

The management routes are B-end only:

- `GET /family/access/{patient_id}` returns link metadata without the stored credential hash.
- `POST /family/access/{patient_id}/rotate` revokes existing active links and returns the new raw `family_code` once.
- `POST /family/access-link/{link_id}/extend` updates `expires_at`; revoked links remain revoked.
- `POST /family/access-link/{link_id}/revoke` immediately blocks C-end login for that code.

`patient_access_links.code` stores a server-side hash. Raw family codes must not be used as database join keys or returned by list / extend / revoke responses.

#### Subject Lookup And Trends

- `GET /api/integration/subject/{subject_id}`
- `GET /api/integration/subject/{subject_id}/trends`

These routes expose the latest subject profile and historical screening trends derived from synced payloads.

#### Scale Task Exchange

- `POST /api/integration/scale/push`
- `GET /api/integration/scale/pending/{patient_id}`
- `POST /api/integration/scale/submit`
- `GET /api/integration/scale/results/{session_id}`

The B-end pushes scale tasks, the C-end pulls and submits them with `patient_id`, and the B-end reads completed results by session. The backend rejects scale submissions where the submitted `patient_id` does not match the task owner.

See [CLOSED_LOOP_WORKFLOW.md](CLOSED_LOOP_WORKFLOW.md) for the end-to-end workflow.

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
- [src/services/integrationService.ts](C:/Users/DORAT/Desktop/Rehab-main/src/services/integrationService.ts)
- [src/hooks/usePostureWS.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/usePostureWS.ts)

## 6. Error Handling

HTTP routes use FastAPI `HTTPException`. Typical cases:

- `503`: config unavailable, such as treatment-plan config missing
- `501`: upstream assessment/session data unavailable
- `500`: unexpected internal failure

WebSocket failures are not normalized into one global envelope yet; callers should treat malformed payloads, disconnects, or missing acks as transport failures and handle retry/reconnect on the frontend.

## 7. Drift Warning

If this document conflicts with older notes or screenshots, trust the following first:

1. [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py)
2. [backend/models.py](C:/Users/DORAT/Desktop/Rehab-main/backend/models.py)
3. [src/config/index.ts](C:/Users/DORAT/Desktop/Rehab-main/src/config/index.ts)
