# Task Plan

## Objective
- Rebuild the frontend workspace into a clear five-center medical AI architecture with a persistent sidebar: 接诊中心、评估中心、报告中心、数据中心、系统设置。

## Constraints
- Keep existing business logic, assessment flows, store contracts, and API calls intact.
- Prefer incremental refactors on top of the current hub structure instead of a full rewrite.
- Preserve the core workflow: 患者 -> 接诊 -> 评估 -> 报告.

## Steps
- [completed] Inspect the current hub shell, sidebar, and center views to map old view state onto the new product architecture.
- [completed] Update the shared plan and navigation shell so the sidebar becomes the primary workspace entry.
- [completed] Implement an explicit 评估中心 landing experience and route patient-specific assessment work under it.
- [completed] Implement a dedicated 数据中心 view for history / statistics instead of reusing report center scaffolding.
- [completed] Tighten page ownership and toolbars so 接诊、评估、报告、数据各自只承担单一目标.
- [completed] Run frontend verification and record outcomes, follow-up risks, and structure notes.

## Verification
- `npm run check`
- Manual review of sidebar navigation and each center entry on the running frontend

## Outcome
- Implemented a persistent sidebar with `接诊中心 / 评估中心 / 报告中心 / 数据中心 / 系统设置` as the primary workspace navigation.
- Reworked the hub shell so sidebar centers own the page flow; the bottom toolbar now only belongs to in-progress assessment workspaces.
- Added an explicit assessment landing view and a separate data center view instead of overloading the report center.
- Verification completed: `npm run check` passed.
- Remaining follow-up: visually review the new assessment/data center layouts in the browser and continue styling polish if needed.
