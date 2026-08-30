# Project Information Map

## 1. Snapshot

- Project type: rehabilitation evaluation workstation.
- Frontend shell: Vite + React 18 + TypeScript + Zustand + Dexie.
- Backend shell: FastAPI + Pydantic + MediaPipe + OpenAI-compatible LLM integration.
- Main business surfaces:
  - Vision3 posture analysis
  - ROM joint range-of-motion assessment
  - MedVoice voice intake / structured case generation
  - Report center / data center / session comparison
- App entry is currently a single-route SPA: [src/App.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/App.tsx) routes all traffic into [src/hub/NexusHub.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/hub/NexusHub.tsx).
- Backend entry is [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py).
- There is an embedded subproject at `Deeprehab-MedVoice-AI--/`; it is not the main frontend/backend pair, but it is mounted by the backend under `/medvoice` when present.

## 2. Tech Stack

### Frontend

- Runtime:
  - `react`, `react-dom`, `react-router-dom`
  - `zustand`
  - `dexie`
  - `react-webcam`
  - `recharts`
  - `marked`, `react-markdown`, `remark-gfm`
  - `jspdf`, `html2canvas`
  - `@mediapipe/pose`, `@mediapipe/holistic`, `@mediapipe/drawing_utils`
- Tooling:
  - `vite`
  - `typescript`
  - `tailwindcss`
  - `eslint`
  - `vitest`
  - `@testing-library/react`
  - `@testing-library/jest-dom`

### Backend

- Runtime dependencies from [backend/requirements.txt](C:/Users/DORAT/Desktop/Rehab-main/backend/requirements.txt):
  - `fastapi`
  - `uvicorn`
  - `pydantic`
  - `mediapipe`
  - `numpy`
  - `opencv-python`
  - `openai`
  - `python-dotenv`
  - plus reporting/export helpers like `python-docx`, `reportlab`, `fpdf2`, `jinja2`

## 3. Code Size

### Counting rule

- Main counts below exclude:
  - `node_modules/`
  - `.git/`
  - `dist/`
  - `public/mediapipe/`
  - embedded subproject `Deeprehab-MedVoice-AI--/`
- They include root-level scripts and tests.

### Main repo totals

| Category | Files | Lines |
|---|---:|---:|
| Code files | 250 | 37,568 |
| Doc/text files | 42 | 8,340 |
| Frontend test files | 27 | - |
| Backend test files | 35 | - |

### Code by extension

| Extension | Files | Lines |
|---|---:|---:|
| `.ts` | 113 | 14,280 |
| `.tsx` | 81 | 14,561 |
| `.py` | 51 | 8,155 |
| `.js` | 4 | 301 |
| `.cjs` | 1 | 271 |

### Main code by top-level area

| Area | Files | Lines |
|---|---:|---:|
| `src/` | 193 | 29,095 |
| `backend/` | 31 | 6,013 |
| `tests/` | 5 | 342 |
| Root Python test scripts | 11 | 1,609 |

### `src/` breakdown

| Area | Files | Lines |
|---|---:|---:|
| `plugins/` | 55 | 9,260 |
| `components/` | 34 | 4,692 |
| `hub/` | 25 | 4,295 |
| `store/` | 12 | 1,937 |
| `utils/` | 10 | 1,845 |
| `hooks/` | 8 | 1,598 |
| `services/` | 5 | 1,368 |
| `pages/` | 7 | 1,290 |
| `lib/` | 7 | 522 |
| `types/` | 8 | 465 |
| `api/` | 5 | 432 |
| `constants/` | 4 | 400 |

### `backend/` breakdown

| Area | Files | Lines |
|---|---:|---:|
| `main.py` | 1 | 679 |
| `utils/` | 10 | 2,355 |
| `models.py` | 1 | 196 |
| `config.py` | 1 | 48 |
| `tests/` | 18 | 2,735 |

### Embedded subproject size

`Deeprehab-MedVoice-AI--/` is substantial enough to treat separately:

| Extension | Files | Lines |
|---|---:|---:|
| `.py` | 26 | 5,723 |
| `.js` | 1 | 735 |
| `.md` | 20 | 6,666 |

## 4. Runtime / Code Map

### Frontend top-level flow

1. [src/main.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/main.tsx)
   - mounts the React app.
2. [src/App.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/App.tsx)
   - exposes a `BrowserRouter`.
   - routes everything to `NexusHub`.
3. [src/hub/NexusHub.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/hub/NexusHub.tsx)
   - is the real application shell.
   - controls `dashboard`, `toolbox`, and `workspace` modes.
   - switches among plugins: `vision3`, `medvoice`, `rom`, `reports`, `datacenter`, `comparison`.

### Main frontend modules

- `src/hub/`
  - shell, patient workspace, data center, report center, comparison views.
- `src/plugins/vision3/`
  - posture analysis workflow.
  - currently the largest single module family.
- `src/plugins/rom/`
  - ROM assessment entry, camera stage, reporting, analysis services.
- `src/plugins/medvoice/`
  - live recording, transcript-to-structured-case flow.
- `src/store/`
  - Zustand global stores for patients, sessions, assessments, session reports, comparison, treatment plans.
- `src/lib/db.ts`
  - Dexie persistence layer with IndexedDB tables:
    - `patients`
    - `sessions`
    - `assessments`
    - `sessionReports`

### Vision3 posture flow

- Entry: [src/plugins/vision3/Vision3Plugin.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/Vision3Plugin.tsx)
- Key hooks:
  - [src/plugins/vision3/hooks/useVision3Camera.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/hooks/useVision3Camera.ts)
  - [src/plugins/vision3/hooks/usePostureCapture.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/hooks/usePostureCapture.ts)
  - [src/plugins/vision3/hooks/usePostureAnalysis.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/hooks/usePostureAnalysis.ts)
  - [src/plugins/vision3/hooks/useVision3EventHandler.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/hooks/useVision3EventHandler.ts)
- Shared live camera stack:
  - [src/components/shared/BaseWebcamView.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/components/shared/BaseWebcamView.tsx)
  - [src/hooks/useCameraStream.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/useCameraStream.ts)
  - [src/hooks/useMediaPipe.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/useMediaPipe.ts)
  - [src/hooks/useSkeletonRenderer.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/useSkeletonRenderer.ts)
- Real-time backend transport:
  - [src/hooks/usePostureWS.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/usePostureWS.ts)

### ROM flow

- Entry: [src/plugins/rom/ROMPlugin.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/ROMPlugin.tsx)
- Key hooks:
  - `useROMAnalysis`
  - `useROMCamera`
- Saves completed assessments through `ROMService` and the current session/patient stores.

### MedVoice flow

- Entry: [src/plugins/medvoice/MedVoicePlugin.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/medvoice/MedVoicePlugin.tsx)
- Uses [src/plugins/medvoice/hooks/useVoiceRecorder.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/medvoice/hooks/useVoiceRecorder.ts) for streaming recording.
- Sends transcript payloads to configured MedVoice endpoints for structuring/export.

## 5. Data and State Map

### Frontend state

Main Zustand stores in `src/store/`:

- `usePatientStore`
- `useSessionStore`
- `useAssessmentStore`
- `useAssessmentRecordStore`
- `useMeasurementStore`
- `useSessionReportStore`
- `useTreatmentPlanStore`
- `useComparisonStore`
- `useCaseStore`

Vision3 has plugin-local state in [src/plugins/vision3/store/usePostureAssessmentStore.ts](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/store/usePostureAssessmentStore.ts).

### Persistence

- IndexedDB via Dexie in [src/lib/db.ts](C:/Users/DORAT/Desktop/Rehab-main/src/lib/db.ts)
- Local storage helpers in:
  - [src/utils/assessmentRecordStorage.ts](C:/Users/DORAT/Desktop/Rehab-main/src/utils/assessmentRecordStorage.ts)
  - [src/utils/treatmentPlanStorage.ts](C:/Users/DORAT/Desktop/Rehab-main/src/utils/treatmentPlanStorage.ts)

### Runtime config

[src/config/index.ts](C:/Users/DORAT/Desktop/Rehab-main/src/config/index.ts) is the current frontend runtime source of truth:

- API base URL default: `http://localhost:8000`
- WebSocket default: `ws://localhost:8000/ws/analyze`
- MedVoice base URL default: `${apiBaseUrl}/medvoice`

## 6. Interface Map

### Backend HTTP endpoints

Defined in [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/video_feed` | MJPEG camera stream |
| `POST` | `/camera/start` | Start backend camera manager |
| `POST` | `/camera/stop` | Stop backend camera manager |
| `GET` | `/health` | Health check and integration flags |
| `POST` | `/api/treatment-plan/generate` | Generate treatment plan |
| `POST` | `/api/treatment-plan/generate/stream` | Streaming treatment plan |
| `POST` | `/api/treatment-plan/generate-from-session-report` | Generate treatment plan from session report |
| `POST` | `/api/treatment-plan/generate-from-session-report/stream` | Streaming session-report treatment plan |
| `POST` | `/api/session-report/generate` | Generate session-level report |

### Backend WebSocket

| Path | Purpose |
|---|---|
| `/ws/analyze` | Real-time posture / joint / report messages |

### WebSocket message types observed in code

Frontend sends from [src/hooks/usePostureWS.ts](C:/Users/DORAT/Desktop/Rehab-main/src/hooks/usePostureWS.ts):

- `POSTURE_SYNC`
- `JOINT_ANALYSIS`
- `POSTURE_BATCH_ANALYSIS`
- `POSTURE_STEPPED_ANALYSIS`
- `POSTURE_DEEP_ANALYSIS`

Backend handles in [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py):

- `POSTURE_SYNC`
- `JOINT_ANALYSIS`
- `POSTURE_BATCH_ANALYSIS`
- `POSTURE_STEPPED_ANALYSIS`
- `POSTURE_DEEP_ANALYSIS`

Backend emits at least:

- `ANALYSIS_RESULT`
- `JOINT_RESULT`
- `POSTURE_ACK`
- `POSTURE_REPORT`
- `DEEP_REPORT_STREAM`

### Frontend API clients

- [src/api/treatmentPlanApi.ts](C:/Users/DORAT/Desktop/Rehab-main/src/api/treatmentPlanApi.ts)
  - treatment plan generation and streaming
  - session-report-derived treatment plan generation and streaming
- [src/api/sessionReportApi.ts](C:/Users/DORAT/Desktop/Rehab-main/src/api/sessionReportApi.ts)
  - session report generation

### Backend request/response models

Defined in [backend/models.py](C:/Users/DORAT/Desktop/Rehab-main/backend/models.py):

- `Landmark`
- `SteppedFrame`
- `AnalysisRequest`
- `AnalysisResponse`
- `JointAnalysisRequest`
- `JointAnalysisResponse`
- `TemporalAnalysisRequest`
- `SteppedAnalysisRequest`
- `PostureReportResponse`
- `TreatmentPlanRequest`
- `SessionTreatmentPlanRequest`
- `TreatmentPlanResponse`
- `SessionReportRequest`
- `SessionReportResponse`

## 7. Document Map

### Current document volume

- Main repo docs/text files: `42`
- Main repo doc lines: `8,340`
- Largest single narrative doc spotted: [project_documentation.md](C:/Users/DORAT/Desktop/Rehab-main/project_documentation.md)

### Key document groups

#### Architecture / retrospectives

- [ARCHITECTURE_RETROSPECTIVE.md](C:/Users/DORAT/Desktop/Rehab-main/ARCHITECTURE_RETROSPECTIVE.md)
- [project_documentation.md](C:/Users/DORAT/Desktop/Rehab-main/project_documentation.md)
- [CONTEXT_INHERITANCE.md](C:/Users/DORAT/Desktop/Rehab-main/CONTEXT_INHERITANCE.md)
- [v2.5.4 Technical Retrospective](C:/Users/DORAT/Desktop/Rehab-main/docs/v2.5.4-%E6%8A%80%E6%9C%AF%E5%A4%8D%E7%9B%98.md)

#### API / data flow / development specs

- [docs/API_SPECIFICATION.md](C:/Users/DORAT/Desktop/Rehab-main/docs/API_SPECIFICATION.md)
- [docs/CLOSED_LOOP_WORKFLOW.md](docs/CLOSED_LOOP_WORKFLOW.md)
- [docs/IDENTITY_CONTRACT.md](docs/IDENTITY_CONTRACT.md)
- [docs/API_ASSESSMENT_MODES.md](C:/Users/DORAT/Desktop/Rehab-main/docs/API_ASSESSMENT_MODES.md)
- [docs/dataflow-state-management-spec.md](C:/Users/DORAT/Desktop/Rehab-main/docs/dataflow-state-management-spec.md)
- [docs/plugin-development-spec.md](C:/Users/DORAT/Desktop/Rehab-main/docs/plugin-development-spec.md)
- [docs/DEVELOPMENT_STANDARDS.md](C:/Users/DORAT/Desktop/Rehab-main/docs/DEVELOPMENT_STANDARDS.md)

#### Design system / UI

- [DESIGN_SYSTEM.md](C:/Users/DORAT/Desktop/Rehab-main/DESIGN_SYSTEM.md)
- [DESIGN_GUIDELINES.md](C:/Users/DORAT/Desktop/Rehab-main/DESIGN_GUIDELINES.md)
- [DESIGN_REFACTOR_COMPLETE.md](C:/Users/DORAT/Desktop/Rehab-main/DESIGN_REFACTOR_COMPLETE.md)
- [docs/UI_DESIGN_GUIDE.md](C:/Users/DORAT/Desktop/Rehab-main/docs/UI_DESIGN_GUIDE.md)
- [docs/ui-component-spec.md](C:/Users/DORAT/Desktop/Rehab-main/docs/ui-component-spec.md)

#### Work reports / implementation notes

- [docs/work_reports/2025-03-07_full.md](C:/Users/DORAT/Desktop/Rehab-main/docs/work_reports/2025-03-07_full.md)
- [docs/work_reports/2026-03-07_bugfix.md](C:/Users/DORAT/Desktop/Rehab-main/docs/work_reports/2026-03-07_bugfix.md)
- [docs/work_reports/2026-03-07_tdd_fix.md](C:/Users/DORAT/Desktop/Rehab-main/docs/work_reports/2026-03-07_tdd_fix.md)
- [2026-03-09 Effort Estimate Note](C:/Users/DORAT/Desktop/Rehab-main/docs/work_reports/2026-03-09_%E5%B7%A5%E6%97%B6%E4%BC%B0%E7%AE%97%E8%AF%B4%E6%98%8E_%E5%8F%AF%E4%BA%A4%E4%BB%98%E7%89%88.md)

#### Refactor tracking

- [REFACTOR_SUMMARY.md](C:/Users/DORAT/Desktop/Rehab-main/REFACTOR_SUMMARY.md)
- [STYLE_REFACTOR_PROGRESS.md](C:/Users/DORAT/Desktop/Rehab-main/STYLE_REFACTOR_PROGRESS.md)

#### Templates

- [assessment-report.md](C:/Users/DORAT/Desktop/Rehab-main/src/services/report-templates/assessment-report.md)
- [comprehensive-report.md](C:/Users/DORAT/Desktop/Rehab-main/src/services/report-templates/comprehensive-report.md)
- [progress-report.md](C:/Users/DORAT/Desktop/Rehab-main/src/services/report-templates/progress-report.md)
- [treatment-report.md](C:/Users/DORAT/Desktop/Rehab-main/src/services/report-templates/treatment-report.md)

## 8. Design Standards: What the Repo Says

### Canonical token file

- [src/constants/uiStyles.ts](C:/Users/DORAT/Desktop/Rehab-main/src/constants/uiStyles.ts) is the actual code-level style token source:
  - `COLORS`
  - `SIZES`
  - `ANIMATIONS`
  - `TRANSITIONS`
  - `SHADOWS`
  - `BACKDROP`

### Design doc themes

Across [DESIGN_SYSTEM.md](C:/Users/DORAT/Desktop/Rehab-main/DESIGN_SYSTEM.md), [DESIGN_GUIDELINES.md](C:/Users/DORAT/Desktop/Rehab-main/DESIGN_GUIDELINES.md), and [docs/UI_DESIGN_GUIDE.md](C:/Users/DORAT/Desktop/Rehab-main/docs/UI_DESIGN_GUIDE.md), the consistent intent is:

- use a unified `antey` medical visual language
- centralize colors/sizing instead of scattering ad hoc Tailwind classes
- prefer high-density desktop layouts for clinical workflows
- standardize card, button, badge, and status semantics
- keep one consistent patient/workspace shell

### Actual implementation anchors

- global styling: [src/index.css](C:/Users/DORAT/Desktop/Rehab-main/src/index.css)
- reusable UI primitives: `src/components/ui/`
- layout shell pieces: `src/components/layout/`
- style constants: [src/constants/uiStyles.ts](C:/Users/DORAT/Desktop/Rehab-main/src/constants/uiStyles.ts)

## 9. Documentation Drift and Trust Notes

### High-confidence current sources

- runtime URLs and integration endpoints:
  - [src/config/index.ts](C:/Users/DORAT/Desktop/Rehab-main/src/config/index.ts)
  - [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py)
  - [backend/routers/integration.py](backend/routers/integration.py)
  - [src/services/integrationService.ts](src/services/integrationService.ts)
- backend contracts:
  - [backend/models.py](C:/Users/DORAT/Desktop/Rehab-main/backend/models.py)
- app shell and module map:
  - [src/hub/NexusHub.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/hub/NexusHub.tsx)

### Current truth docs and remaining drift

- [README.md](C:/Users/DORAT/Desktop/Rehab-main/README.md)
  - updated on `2026-03-10`.
  - now reflects the actual app shell, stack, local run commands, and current backend port `8000`.
- [docs/API_SPECIFICATION.md](C:/Users/DORAT/Desktop/Rehab-main/docs/API_SPECIFICATION.md)
  - updated on `2026-05-30` for `/api/integration/*`.
  - now covers the current backend routes in `backend/main.py`, the WebSocket path `/ws/analyze`, and the screening / identity / scale integration API.
- [docs/CLOSED_LOOP_WORKFLOW.md](docs/CLOSED_LOOP_WORKFLOW.md)
  - added on `2026-05-30`.
  - current source-of-truth for the early screening -> B-end workstation -> C-end chatbot -> B-end result loop.
- [docs/IDENTITY_CONTRACT.md](docs/IDENTITY_CONTRACT.md)
  - added on `2026-05-30`.
  - current source-of-truth for `patient_id`, `subject_id`, SUC/display codes, family codes, sessions, and names.
- [docs/DEVELOPMENT_STANDARDS.md](C:/Users/DORAT/Desktop/Rehab-main/docs/DEVELOPMENT_STANDARDS.md)
  - updated on `2026-03-10`.
  - now references the real frontend API clients, WebSocket hook, runtime config, and backend contract files that exist today.
- [PROJECT_INFO_MAP.md](C:/Users/DORAT/Desktop/Rehab-main/PROJECT_INFO_MAP.md)
  - should be read as the current inventory and repo map, not as a historical retrospective.
- Design docs as a set:
  - still capture the intended direction well.
  - still do not perfectly describe the current implementation because the repo continues to mix shared tokens/components with some raw utility-class usage.
- Historical work reports and retrospectives:
  - remain useful for change history.
  - should not be treated as the current runtime or API source of truth.

### Practical reading order

If someone needs to understand the project quickly, use this order:

1. [src/hub/NexusHub.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/hub/NexusHub.tsx)
2. [src/plugins/vision3/Vision3Plugin.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/Vision3Plugin.tsx)
3. [src/plugins/rom/ROMPlugin.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/rom/ROMPlugin.tsx)
4. [src/plugins/medvoice/MedVoicePlugin.tsx](C:/Users/DORAT/Desktop/Rehab-main/src/plugins/medvoice/MedVoicePlugin.tsx)
5. [src/config/index.ts](C:/Users/DORAT/Desktop/Rehab-main/src/config/index.ts)
6. [backend/main.py](C:/Users/DORAT/Desktop/Rehab-main/backend/main.py)
7. [backend/routers/integration.py](backend/routers/integration.py)
8. [docs/IDENTITY_CONTRACT.md](docs/IDENTITY_CONTRACT.md)
9. [docs/CLOSED_LOOP_WORKFLOW.md](docs/CLOSED_LOOP_WORKFLOW.md)
10. [backend/models.py](C:/Users/DORAT/Desktop/Rehab-main/backend/models.py)
11. then only the docs that match the question you are answering

## 10. Verification Basis

This inventory was produced from direct repo scans and current code, not from historical assumptions.

- Entry files read:
  - frontend: `src/main.tsx`, `src/App.tsx`, `src/hub/NexusHub.tsx`
  - backend: `backend/main.py`, `backend/models.py`
- API client files read:
  - `src/api/treatmentPlanApi.ts`
  - `src/api/sessionReportApi.ts`
  - `src/services/integrationService.ts`
  - `src/hooks/usePostureWS.ts`
- Integration files read:
  - `backend/routers/integration.py`
  - `src/components/SquatLabSyncPanel.tsx`
  - `src/components/patient/ScaleAssessmentPanel.tsx`
- Persistence/config files read:
  - `src/lib/db.ts`
  - `src/config/index.ts`
- Design/docs read:
  - `DESIGN_SYSTEM.md`
  - `DESIGN_GUIDELINES.md`
  - `docs/UI_DESIGN_GUIDE.md`
  - `docs/DEVELOPMENT_STANDARDS.md`
  - `docs/API_SPECIFICATION.md`
  - `docs/CLOSED_LOOP_WORKFLOW.md`
  - `docs/IDENTITY_CONTRACT.md`
- Test status reference:
  - current frontend Vitest report is green at `114` suites / `241` tests / `0` failures
