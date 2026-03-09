# Task Plan

## Objective
- Rebuild the reporting architecture so assessment modules produce local results immediately, while Report Center owns global aggregation, cross-module insight generation, and the only LLM-driven comprehensive report flow.

## Product Principles
- Posture assessment must show a basic report immediately after capture and analysis complete.
- ROM and voice modules should each produce their own local structured output.
- Report Center must own global report orchestration across posture, ROM, voice, and session context.
- LLM should only be triggered from Report Center after enough assessment inputs are available.
- Local assessment reports and session-level comprehensive reports must be treated as different objects.

## Target Information Architecture
- `Patient`
  - patient profile and longitudinal records
- `Session`
  - one visit / one rehab workflow container
- `Assessment`
  - posture assessment
  - ROM assessment
  - voice-to-case assessment
- `Assessment Report`
  - local report owned by a single assessment
  - examples: posture basic report, ROM summary, structured voice case summary
- `Session Report`
  - global report owned by Report Center
  - generated from the completed assessments within the current session

## Scope
- Vision3 posture module: local report visibility and removal of misplaced deep-report ownership
- Report Center: input aggregation, global report orchestration, comprehensive insight rendering
- Session-level data plumbing for posture, ROM, and voice outputs
- LLM trigger relocation from posture flow to Report Center flow

## Non-Goals For First Pass
- Full visual redesign of all modules
- Rewriting all stores from scratch
- Refactoring MedVoice internals beyond exposing usable report input
- Refactoring ROM calculation logic beyond exposing usable report input

## Implementation Strategy
- Keep the current codebase running while shifting responsibilities gradually.
- First fix user-facing report visibility in posture.
- Then establish a session-level aggregation model.
- Then migrate comprehensive LLM invocation into Report Center.
- Finally align treatment-plan generation with session report outputs.

## Execution Phases

### Phase 1: Restore Correct Local Report Ownership
- Ensure posture basic report is always visible immediately after posture assessment completes.
- Keep posture metrics, issues, and evidence linked to that local result page.
- Remove posture-page language and controls that imply it owns the final comprehensive LLM report.
- Replace posture deep-analysis CTA with guidance that comprehensive reporting happens in Report Center.

### Phase 2: Introduce Explicit Report Layers
- Define and document two report types in the frontend model:
  - assessment-level local report
  - session-level comprehensive report
- Normalize posture output so it can be consumed independently of current page state.
- Expose ROM summary output in a format that Report Center can consume.
- Expose voice case summary output in a format that Report Center can consume.

### Phase 3: Rebuild Report Center Around Aggregation
- Add a session summary area showing which assessment inputs are available.
- Show posture, ROM, and voice summary cards as inputs to the comprehensive report.
- Move existing recommendation cards toward a global “cross-input insights” role.
- Reserve the main report action for comprehensive report generation only.

### Phase 4: Relocate LLM Orchestration
- Remove comprehensive LLM generation from posture-page ownership.
- Create a session-level LLM request path in Report Center.
- Build the LLM payload from:
  - current patient
  - current session
  - posture local report
  - ROM summary
  - voice structured case summary
- Store the returned content as a session report, not as a posture report.

### Phase 5: Align Downstream Outputs
- Make treatment-plan generation consume the comprehensive session report context.
- Keep local assessment reports separately browsable for traceability.
- Ensure export and archive flows distinguish local assessment reports from the comprehensive session report.

## Data Contracts To Establish
- `PostureAssessmentOutput`
  - metrics
  - issues
  - auxiliaryDiagnosis
  - markdownReport optional
  - timeSeries optional
- `RomAssessmentOutput`
  - measurements
  - abnormalities summary
  - rom local summary
- `VoiceAssessmentOutput`
  - transcript
  - structured case summary
  - extracted symptoms / functional limits if available
- `SessionReportInput`
  - patient context
  - session metadata
  - posture output optional
  - rom output optional
  - voice output optional
- `SessionReportOutput`
  - comprehensive markdown/html
  - cross-module insights
  - action recommendations
  - confidence / completeness markers

## Expected File Focus
- `src/plugins/vision3/Vision3Plugin.tsx`
- `src/plugins/vision3/components/Vision3AnalysisPanel.tsx`
- `src/plugins/vision3/hooks/usePostureAnalysis.ts`
- `src/hooks/usePostureWS.ts`
- `src/store/useMeasurementStore.ts`
- report-center-related session/report storage files
- ROM summary exposure files
- MedVoice summary exposure files

## Steps
- [completed] Phase 1: make posture basic report immediately visible after posture assessment completion and remove misplaced comprehensive-report ownership from posture UI.
- [completed] Phase 2: define local assessment report vs session report boundaries in code and normalize posture/ROM/voice outputs for Report Center consumption.
- [completed] Phase 3: redesign Report Center as the global aggregation surface with input cards, readiness state, and cross-input insight area.
- [completed] Phase 4: migrate LLM invocation so only Report Center can trigger a session-level comprehensive report.
- [completed] Phase 5: align treatment-plan and export flows with the new session-report model.
- [pending] Add focused tests for local report visibility, Report Center aggregation, and session-level comprehensive report generation.
- [pending] Run verification across posture, ROM, voice, and report-center integration paths.

## Acceptance Criteria
- After posture assessment completes, the user can immediately view the posture basic report in the posture module.
- Report Center clearly shows which module outputs are already available in the current session.
- Report Center can consume posture, ROM, and voice outputs without depending on the currently open page.
- LLM is no longer a posture-page responsibility for comprehensive reporting.
- A comprehensive report can be generated only from Report Center and is stored as a session-level artifact.
- Local posture, ROM, and voice outputs remain independently viewable after the refactor.

## Verification
- `npm run check`
- `npm run test -- --run src/hooks/__tests__/usePostureWS.test.ts`
- `npm run test -- --run src/plugins/vision3/__tests__/Vision3Plugin.rendering.test.tsx`
- `npm run test -- --run src/plugins/vision3/__tests__/reportInsights.test.ts`
- `python -m pytest backend/tests/test_posture_websocket_responses.py -q`
- Manual verification: posture assessment completes and basic report is visible immediately
- Manual verification: Report Center displays available posture/ROM/voice inputs
- Manual verification: comprehensive LLM report can only be triggered from Report Center

## Risks
- Existing duplicated report state across stores may cause partial regressions until the report boundary is unified.
- Report Center aggregation may expose hidden coupling between posture, ROM, and voice data models.
- Session-level LLM prompts may need several iterations before the output quality is clinically coherent.

## Current Status
- Plan reset on 2026-03-09 for reporting-architecture refactor.
- Phase 1 completed on 2026-03-09.
- Posture module now falls back to the latest available local report instead of requiring an exact view match before showing the basic report.
- Posture workspace and local report panel no longer advertise posture-local comprehensive LLM generation; copy now points that responsibility to the global Report Center.
- Phase 2 started on 2026-03-09.
- Current edits introduce session-level report-input summaries and move MedVoice / posture autosave closer to the active patient-session context so Report Center can aggregate them.
- Phase 2 completed on 2026-03-09 by introducing `SessionReportInput` / `AssessmentOutputSummary` boundaries and wiring posture, ROM, and MedVoice outputs into session-level aggregation.
- Phase 3 started on 2026-03-09 with the first global input cards and readiness panel inside Report Center.
- Phase 3 now includes a session-level orchestration panel, cross-input insight cards, and a deterministic comprehensive-report draft preview so the final LLM entry can land on an already-stable report-center workflow.
- Phase 4 completed on 2026-03-09 by adding a dedicated session-report API, frontend persistence for session-level reports, and a Report Center-only "generate comprehensive report" action wired to the active session inputs.
- Phase 5 completed on 2026-03-09 by moving treatment-plan generation onto session reports, separating comprehensive-report export/archive from assessment-level exports, and exposing the new downstream actions inside Report Center.
