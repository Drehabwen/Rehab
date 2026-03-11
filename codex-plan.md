# Task Plan

## Objective
- Repair the mojibake-corrupted frontend workflow UI so the current `患者 -> 接诊 -> 评估 -> 报告` refactor renders with readable Chinese again, without changing business logic, APIs, data structures, or core task flows.

## Constraints
- The worktree already has unrelated local edits; do not revert or overwrite them.
- Only repair encoding issues and presentation-layer workflow behavior in the frontend shell.
- Keep existing plugins, stores, and report-generation flows working as-is.
- Rewrite corrupted files as UTF-8 when patch-based editing is blocked by bad source encoding.

## Steps
- [completed] Inspect the corrupted UI files and confirm the issue is source-level mojibake rather than browser cache or runtime data.
- [completed] Repair the workflow shell, shared cards, search modal, and three center pages with valid UTF-8 Chinese copy while keeping the refactor structure intact.
- [completed] Run targeted verification on the repaired frontend workflow files.
- [completed] Record repaired files, verification results, and any remaining polish work.

## Verification
- `rg -n "锟|鏌|鎮|鎺|鍙|鍘|娆|绗|銆" src`
- `npm run check`

## Outcome
- Rewrote the corrupted workflow UI files as UTF-8 and restored readable Chinese copy across the hub shell, visit center, assessment center, report center, and patient search modal.
- Repaired mojibake in `useVoiceRecorder` and `useTreatmentPlanStore` so source-level strings are readable again.
- Fixed two display-layer regressions while touching the shell: visit progress now uses real assessment data again, and the sidebar/report navigation now points at the report center correctly.
- Verification completed: the mojibake scan returned no matches and `npm run check` passed.
