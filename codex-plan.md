# Task Plan

## Objective
- Implement the first frontend TypeScript ROM core and migrate the ROM plugin onto shared definitions for motion labels, ranges, status classification, and entry configuration.

## Constraints
- Keep the current ROM plugin user flow working while replacing internals.
- Preserve saved assessment shape as much as possible; compatibility should be handled by adapters instead of breaking store payloads.
- Backend parity is out of scope for this pass.

## Steps
- [completed] Confirm the draft structure, config conflicts, and migration boundaries from current frontend and backend code.
- [in_progress] Add the new ROM core modules for schema, definitions, adapters, extractors, classification, and scoring.
- [pending] Migrate the ROM plugin entry/config/report/status pipeline onto the new ROM core.
- [pending] Add targeted regression tests for core normalization and plugin measurement behavior.
- [pending] Run verification and record residual risks.

## Verification
- `npm run check`
- `npm run test -- --run src/plugins/rom/__tests__/useROMAnalysis.test.ts`
- `npm run test -- --run src/plugins/rom/__tests__/romCore.test.ts`

## Outcome
- In progress.
