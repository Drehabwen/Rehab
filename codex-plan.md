# Task Plan

## Objective
- Restore and stabilize the LLM recommendation return path so deep-analysis responses do not clear existing posture metrics, issue recommendations, or basic report content.

## Constraints
- Touch only the LLM recommendation return path and the state it relies on.
- Preserve existing deep-report streaming behavior.
- Avoid regressions in basic report generation, report persistence, and issue recommendation display.
- Keep the fix compatible with current websocket message types.

## Agreed Direction
- Deep-analysis completion must not wipe out existing `issues[].recommendation`, `metrics`, or `auxiliaryDiagnosis`.
- Backend deep-report completion should return the current base analysis payload together with LLM markdown whenever possible.
- Frontend websocket handling should preserve existing base analysis data if a deep-report packet omits or empties those fields.
- Verification should explicitly cover the deep-report response path.

## Steps
- [in_progress] Inspect the current deep-analysis websocket flow in `backend/main.py` and `src/hooks/usePostureWS.ts` to confirm where recommendations are dropped.
- [pending] Update backend deep-analysis completion payload so it includes base metrics, issues, and auxiliary diagnosis instead of empty placeholders.
- [pending] Update frontend websocket handling to avoid overwriting existing recommendation-bearing state with empty deep-report fields.
- [pending] Add or update targeted tests for the deep-report path.
- [pending] Run verification for websocket state handling and deep-report rendering.

## Verification
- `npm run check`
- `npm run test -- --run src/hooks/__tests__/usePostureWS.test.ts`
- `npm run test -- --run src/plugins/vision3/__tests__/Vision3Plugin.rendering.test.tsx`
- Confirm deep-report completion does not clear existing issue recommendations.
- Confirm auxiliary basic report remains available after deep analysis finishes.
- Confirm deep report markdown still renders after the fix.

## Outcome
- Deep-report recommendation path investigation started on 2026-03-09.
