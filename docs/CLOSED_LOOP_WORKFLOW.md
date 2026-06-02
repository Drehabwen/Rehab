# Rehab Closed-Loop Workflow

Last verified: 2026-05-30

This document describes the current screening-to-rehab closed loop in this repository family. The working integration hub is `Rehab-main`; its backend owns `/api/integration/*` on `http://localhost:8002`.

The product framing is a posture and spinal screening workflow. It records screening evidence, risk triage, report readiness, follow-up tasks, and retest outcomes. It must not be treated as a medical diagnosis system.

Patient identity is governed by [IDENTITY_CONTRACT.md](IDENTITY_CONTRACT.md). In short, `patient_id` is the hidden primary business identity; `patient_code` is the four-letter public file code; `subject_id`, SUC/display codes, family codes, session IDs, and names are aliases, access credentials, events, or display fields.

## 1. Participating Apps

| App | Current role | Important files |
| --- | --- | --- |
| `早筛` | Early screening terminal. Captures school / field screening data and pushes a completed screening session to the rehab hub. | `早筛/frontend/src/shared/api/client.ts` |
| `Rehab-main/backend` | Integration hub. Receives screening sessions, stores pending imports and scale tasks in SQLite, and exposes the B-end / C-end exchange API. | `backend/main.py`, `backend/routers/integration.py` |
| `Rehab-main/src` | Therapist workstation. Lists pending early-screening records, imports or links them to patient records, pushes scale tasks, and reads submitted scale results. | `src/services/integrationService.ts`, `src/components/SquatLabSyncPanel.tsx`, `src/components/patient/ScaleAssessmentPanel.tsx` |
| `chatbotagent` | Parent / patient side assistant. Pulls pending scale tasks, lets the user fill them in, and submits the results back to the integration hub. | `chatbotagent/src/api/scaleApi.ts` |
| `青跃康复工作台` | Newer workbench shell / migration candidate. It is not the current `/api/integration/*` owner. | `青跃康复工作台/src`, `青跃康复工作台/backend` |

## 2. Main Flow

```mermaid
flowchart LR
  A["早筛端采集"] --> B["生成筛查会话与综合报告"]
  B -->|POST /api/integration/sync-screening| C["Rehab-main integration DB"]
  C -->|GET /synced-screenings?status=pending| D["B端同步中心"]
  D --> E["新建或关联患者档案"]
  E -->|POST /intake/{session_id}/confirm| C
  E --> F["评估工作台 / 报告中心"]
  F -->|POST /scale/push| G["待填量表队列"]
  G -->|POST /family/login| H["chatbotagent"]
  H -->|GET /scale/pending/{patient_id}| J["C-end scale completion"]
  J -->|POST /scale/submit| C
  F -->|GET /scale/results/{session_id}| I["纳入复评 / 报告 / 随访"]
```

The loop is complete only when the B-end can see the early-screening record, import or link it, assign or reuse a `patient_code`, push a follow-up or scale task, and receive the C-end submission back against the same session.

## 3. Data Stages

### 3.1 Early Screening Sync

The early screening app sends `SyncScreeningPayload` to:

- `POST http://localhost:8002/api/integration/sync-screening`

Required high-level fields:

- `session_id`
- `subject`
- `protocol_results`
- `integrated_report`
- `llm_analysis`
- `created_at`
- `completed_at`

The backend stores the payload in `synced_screenings` with status `pending`. Repeated syncs with the same `session_id` are idempotent updates.

### 3.2 B-End Intake

The therapist workstation reads pending screening records through:

- `GET /api/integration/synced-screenings?status=pending`
- `GET /api/integration/synced-screenings/{session_id}`

The UI can then:

- create a new patient from the screening payload
- link the payload to an existing patient
- confirm the identity binding with `POST /api/integration/intake/{session_id}/confirm`
- optionally mark legacy records as imported with `POST /api/integration/synced-screenings/{session_id}/import`
- delete a stale synced screening with `DELETE /api/integration/synced-screenings/{session_id}`

At this point the screening evidence becomes part of the B-end patient workflow.

### 3.3 Patient Lookup And Trend Access

The integration backend also exposes:

- `GET /api/integration/subject/{subject_id}`
- `GET /api/integration/subject/{subject_id}/trends`

These endpoints support parent-side identity lookup and longitudinal trend views from previously synced screening payloads.

### 3.4 Scale Push To C-End

The therapist workstation pushes a scale task through:

- `POST /api/integration/scale/push`

Payload fields:

- `patient_id`
- `patient_name`
- `session_id`
- `scale_id`
- `therapist_name`

The backend stores the task in `pending_scales` with status `pending`.

### 3.5 C-End Completion

The parent / patient app first resolves an access credential:

- `POST /api/integration/family/login`

Then it pulls and submits scale tasks through:

- `GET /api/integration/scale/pending/{patient_id}`
- `POST /api/integration/scale/submit`

Submission payload fields:

- `task_id`
- `session_id`
- `patient_id`
- `scale_data`

The backend marks the task as `completed` and stores the submitted scale payload.

### 3.6 B-End Result Retrieval

The therapist workstation polls or refreshes scale results through:

- `GET /api/integration/scale/results/{session_id}`

The returned scale payload should feed report readiness, follow-up decisions, and retest planning for the same session.

## 4. Status Model

Current integration-table statuses:

- `synced_screenings.status`: `pending`, `imported`
- `pending_scales.status`: `pending`, `completed`

Screening-domain statuses from the early screening service include:

- `in_progress`
- `pending_report`
- `completed`
- `pending_recapture`
- `pending_review`
- `archived`

Recommended workflow language for future UI and docs:

- pending initial screening
- pending recapture
- pending review
- pending report
- pending retest
- archived

Use workflow state to represent incomplete or low-quality evidence. Do not force a clinical conclusion when formal report conditions are not met.

## 5. Source Of Truth

Trust this order when behavior and documentation disagree:

1. `Rehab-main/backend/routers/integration.py`
2. `Rehab-main/src/services/integrationService.ts`
3. `早筛/frontend/src/shared/api/client.ts`
4. `chatbotagent/src/api/scaleApi.ts`
5. This document

## 6. Current Gaps And Risks

- Current runtime exposes `/api/chatbot/bind`, `/api/chatbot/query`, `/api/chatbot/chat`, and `/api/chatbot/health` in OpenAPI. The source entry file still needs a clear, reproducible router mount so these routes do not disappear after a restart or deployment rebuild.
- `chatbotagent` uses `/api/integration` as a relative base. Its dev server or deployment needs a proxy to `http://localhost:8002/api/integration`.
- Protocol names should be normalized. Current code accepts or references `static_posture`, `adams_forward_bend`, `squat`, and `squat_screening`; choose one canonical name per protocol before adding more reports.
- `青跃康复工作台` does not currently implement the integration endpoints. If it becomes the main workbench, migrate `/api/integration/*` first or point it to the `Rehab-main` integration backend.
- The legacy `/api/integration/subject/link` path has been removed from the active C-end flow. New and existing C-end login must use `/api/integration/family/login`.
- Identity binding follows [IDENTITY_CONTRACT.md](IDENTITY_CONTRACT.md): `patient_id` is the hidden primary key, `patient_code` is the four-letter visible file code, `subject_id` is an early-screening alias, and `family_code` is a revocable access credential. Runtime login rejects inactive or expired access links, stored family codes are hashed, and B-end can rotate, extend, or revoke access from the patient workbench.

## 7. Verification Checklist

- Start `Rehab-main` backend on port `8002`.
- Confirm the test data follows [IDENTITY_CONTRACT.md](IDENTITY_CONTRACT.md): early screening owns `subject_id`, B-end owns `patient_id`, and C-end resolves access through `family_code`.
- From `早筛`, submit one completed screening session to `/api/integration/sync-screening`.
- In `Rehab-main`, open the sync panel and confirm the record appears as `pending`.
- Import the record as a new patient or link it to an existing patient, then confirm `/api/integration/intake/{session_id}/confirm` returns `patient_id` plus the four-letter `patient_code`.
- Push one scale task from the B-end session.
- In `chatbotagent`, login with `family_code`, pull pending scales for the returned `patient_id`, and submit the scale with that `patient_id`.
- In `Rehab-main`, fetch `/api/integration/scale/results/{session_id}` and confirm the completed result is visible.
- Confirm the final report or follow-up view uses the submitted C-end evidence without diagnostic wording.
