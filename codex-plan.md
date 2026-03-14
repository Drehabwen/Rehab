# Task Plan

## Objective
- Make quick-assessment results surface immediately after capture and simplify the completed-state workspace/report UI in V3.1.

## Constraints
- Keep the existing WebSocket protocol and report-generation flow intact.
- Avoid broad report-center rewrites; focus on the slow-return path, persistence handoff, and completed-state clutter.
- Preserve the skeleton overlay fix and the current report-center cleanup already in this worktree.

## Steps
- [completed] Inspect the current quick-assessment/report handoff and confirm why the completed workspace can still show an empty report state.
- [completed] Patch the quick-assessment pipeline so local structured results can generate, persist, and display an immediate basic report before backend text returns.
- [completed] Simplify the compact completed-state camera workspace so it stops stacking capture overlays over the finished preview.
- [completed] Update report-center/report preview helpers to reuse the immediate posture summary path where needed.
- [completed] Add focused regression coverage and run targeted verification.

## Verification
- `npm run test -- src/plugins/vision3/__tests__/usePostureAnalysis.test.ts src/hooks/__tests__/usePostureWS.test.ts src/hub/__tests__/report-center-insights.test.ts`
- `npm run check`
- Manual browser check of quick assessment completion, immediate basic report display, and cleaned completed-state layout

## Outcome
- Quick stepped assessments now build a local fallback result immediately from captured landmarks, generate an instant basic report, and expose it before websocket text arrives.
- Auto-save now persists posture assessments as soon as a structured quick result exists, then updates the same record when backend auxiliary or markdown reports arrive.
- Report-center assessment previews now fall back to the same immediate posture summary path when only metrics/issues are available.
- The compact completed camera card now suppresses the stepped capture overlay and engine chrome, leaving only the finished preview and a small summary.
- Verification completed:
  - `npm run check`
  - `npm run test -- src/plugins/vision3/__tests__/usePostureAnalysis.test.ts src/plugins/vision3/__tests__/Vision3CameraStage.skeleton.test.tsx src/plugins/vision3/__tests__/Vision3Plugin.quick-session.test.tsx src/hub/__tests__/report-center-utils.test.ts src/hooks/__tests__/usePostureWS.test.ts`
- Remaining risk:
  - `Vision3CameraStage` tests still log expected `getUserMedia` warnings from the shared camera hook in JSDOM, although the targeted suite passes.
  - A manual browser pass is still recommended to tune spacing and typography in the completed report workspace on real capture data.
