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

## Current Task: Closed-Loop Documentation

### Objective
- Document the current screening-to-rehab closed loop and connect it to the existing API documentation.

### Constraints
- Treat `Rehab-main` as the current integration hub because its backend owns `/api/integration/*`.
- Keep wording as screening and workflow management, not clinical diagnosis.
- Do not change runtime code in this pass.

### Steps
- [completed] Confirm the closed-loop endpoints and participating apps from local code.
- [completed] Add a closed-loop workflow document under `docs/`.
- [completed] Update API, README, and project map references so the new document is discoverable.
- [completed] Verify doc links and record residual risks.

### Verification
- Check changed files with `git diff --check`.
- Re-read endpoint references against `backend/routers/integration.py` and frontend API clients.

### Outcome
- Added `docs/CLOSED_LOOP_WORKFLOW.md` as the closed-loop source of truth for early screening, B-end intake, C-end scale completion, and B-end result retrieval.
- Updated README, API specification, and project map so `/api/integration/*` is discoverable from the current docs.
- Verification completed with `git diff --check`; only existing CRLF normalization warnings were reported.
- Remaining risks are documented in the closed-loop workflow doc: reproducible chatbot router mounting, chatbot proxying, protocol naming, workbench migration, and identity binding.

## Current Task: Identity Contract

### Objective
- Record the cross-app patient identity contract before changing the closed-loop implementation.

### Constraints
- Keep `patient_id` as the only primary business identity.
- Treat `subject_id`, SUC/display codes, family codes, session IDs, and names as non-primary identity components.
- Do not change runtime code in this pass.

### Steps
- [completed] Inspect current identity fields across `Rehab-main`, `早筛`, and `chatbotagent`.
- [completed] Add a dedicated identity contract document under `docs/`.
- [completed] Link the identity contract from the closed-loop workflow, README, and project map.
- [completed] Verify documentation-only changes.

### Verification
- Check changed files with `git diff --check`.
- Confirm the contract is discoverable from the current closed-loop documentation.

### Outcome
- Added `docs/IDENTITY_CONTRACT.md` as the source of truth for `patient_id`, `subject_id`, SUC/display codes, family codes, session IDs, and display names.
- Linked the contract from the closed-loop workflow, README, and project map.
- Verification completed with `git diff --check`; only existing CRLF normalization warnings were reported.
- No runtime code was changed in this pass.

## Current Task: Identity Contract Implementation

### Objective
- Implement the first compatible slice of the identity contract so early-screening aliases, B-end patient IDs, and C-end family-code login converge on `patient_id`.

### Constraints
- Preserve existing `/api/integration/*` callers while adding canonical identity behavior.
- Keep `subject_id` as provenance / alias and avoid using names as identity keys in new logic.
- Do not rewrite the full patient storage model in one pass; keep this scoped to integration closed-loop identity.

### Steps
- [completed] Inspect identity-related backend routes, B-end import flow, and C-end login flow.
- [completed] Add backend identity tables and endpoints for intake confirmation and family-code login.
- [completed] Update B-end import/scale APIs to use canonical `patient_id` where available.
- [completed] Update C-end login to resolve `family_code -> patient_id`.
- [completed] Add targeted tests and run verification.

### Verification
- Backend tests for identity intake, family login, and scale mismatch rejection.
- Frontend build/type checks where practical.
- `git diff --check`.

### Outcome
- Implemented the first compatible identity-contract slice in `Rehab-main` integration:
  canonical `patient_id`, early-screening aliases, family access links, intake confirmation,
  and family-code login.
- B-end early-screening import now confirms identity through `/api/integration/intake/{session_id}/confirm`
  instead of only marking the screening as imported.
- B-end push routes for scales, treatment plans, and assessment summaries now resolve aliases before
  writing records, and C-end reads no longer use display names as identity keys.
- C-end chatbot login now resolves `family_code -> patient_id`, and scale submissions include
  `patient_id` so the backend can reject mismatched task ownership.
- Verification completed:
  `python -m py_compile backend/routers/integration.py`,
  `python -m py_compile backend/tests/test_identity_contract.py`,
  `python -m pytest tests/test_router_integration.py tests/test_identity_contract.py tests/test_scale_integration.py -q`,
  `npm run check` in `Rehab-main`, and `git diff --check` in both touched repos.
- `chatbotagent` `npm run build` is still blocked by existing unrelated TypeScript errors
  in stress tests, missing `../ui` imports, and legacy store fields; no errors were reported
  in the files changed for this identity work.

## Current Task: Closed-Loop Acceptance Completion

### Objective
- Finish the screening-to-rehab closed-loop acceptance path so backend identity binding, B-end intake, C-end login, and C-end task submission are buildable and verifiable.

### Constraints
- Keep `patient_id` as the only primary business identity.
- Keep `subject_id` as source provenance / alias and `family_code` as an access credential.
- Do not use display name as an identity key.
- Preserve existing compatibility endpoints unless they block the canonical flow.
- Avoid touching unrelated dirty files, especially `chatbotagent/README.md`.

### Steps
- [completed] Inspect `chatbotagent` build failures and the C-end identity task flow.
- [completed] Remove visible mojibake literals from source while preserving encoding detection / repair behavior.
- [completed] Fix `chatbotagent` TypeScript build blockers with minimal scoped changes.
- [completed] Add access-link status/expiry enforcement for `family_code` login and document the acceptance behavior.
- [completed] Run backend identity smoke tests and frontend type/build checks.
- [completed] Record final outcome, residual risks, and exact verification commands.

### Verification
- `npm run build` in `chatbotagent`.
- `npm run check` in `Rehab-main`.
- `python -m pytest tests/test_router_integration.py tests/test_identity_contract.py tests/test_scale_integration.py -q` in `Rehab-main/backend`.
- `git diff --check` in touched repos.

### Outcome
- Completed closed-loop acceptance hardening:
  - `chatbotagent` now builds successfully.
  - visible mojibake literals are no longer present in touched source files; encoding repair / detection logic now uses escaped tokens.
  - C-end `family_code` login now rejects inactive or expired access links.
  - intake confirmation can optionally persist `family_code_expires_at`.
  - `reassess` is restored as a typed chatbot branch with a concrete screening flow.
- Verification completed:
  - `python -m py_compile backend/routers/integration.py backend/tests/test_identity_contract.py`
  - `python -m pytest tests/test_router_integration.py tests/test_identity_contract.py tests/test_scale_integration.py -q`
  - `npm run check` in `Rehab-main`
  - `npm run build` in `chatbotagent`
  - `git diff --check` in both touched repos
- Remaining risks:
  - `family_code` is still stored in plaintext until hashing is added.
  - B-end still needs an access-link management UI for rotate / revoke / extend.
  - `chatbotagent/README.md` was already dirty and was intentionally left untouched.

## Current Task: Full Data Flow Verification

### Objective
- Fully verify data movement across the closed loop: early screening intake, B-end identity confirmation, C-end family access, task completion, B-end result recovery, and follow-up data exchange.

### Constraints
- Keep assertions aligned with the identity contract: `patient_id` is primary, `subject_id` is an alias, `family_code` is an access credential, and display names are never identity keys.
- Use isolated test SQLite databases and restore the tracked local integration DB after tests mutate it.
- Do not touch unrelated dirty files in `chatbotagent`.

### Steps
- [completed] Add a single end-to-end data-flow test covering the complete closed-loop journey.
- [completed] Verify database side effects in `patients`, `patient_aliases`, and `patient_access_links`.
- [completed] Verify repeat screening sync maps the same `subject_id` to the same `patient_id`.
- [completed] Verify scale push, C-end pending fetch, C-end submit, B-end result recovery, and post-submit pending cleanup.
- [completed] Verify plan archival, assessment summary retrieval, and daily tracking upsert.
- [completed] Verify display-name lookups do not return patient records.
- [completed] Run backend and frontend checks.

### Verification
- `python -m py_compile backend/tests/test_identity_contract.py`
- `python -m pytest tests/test_identity_contract.py -q`
- `python -m pytest tests/test_router_integration.py tests/test_identity_contract.py tests/test_scale_integration.py -q`
- `npm run check` in `Rehab-main`
- `npm run build` in `chatbotagent`
- `git diff --check` in both touched repos

### Outcome
- Full data flow verification passed:
  - early screening `sync-screening` creates pending evidence without inventing `patient_id`.
  - B-end `intake/{session_id}/confirm` creates the canonical patient record, alias, and family access link.
  - re-syncing the same `subject_id` attaches to the same `patient_id`.
  - C-end `family/login` resolves access to the latest patient/session context.
  - scale tasks flow from B-end push to C-end submit and back to B-end results.
  - plan, assessment summary, and daily tracking all resolve aliases to `patient_id`.
  - name-based reads remain empty.
- Test results:
  - targeted identity flow: `4 passed`
  - closed-loop test group: `6 passed`
  - `Rehab-main` type check passed
  - `chatbotagent` production build passed
- Remaining production risks:
  - Family-code hashing and B-end access management are now covered in the follow-up task below.
  - Several unrelated `chatbotagent/server/*` files were dirty or untracked during verification and were handled only where they overlapped the legacy family route cleanup.

## Current Task: Family Code Security And Legacy Path Cleanup

### Objective
- Move family-code access from plaintext compatibility into hashed credentials with explicit B-end management endpoints, and remove the C-end legacy `/subject/link` flow.

### Constraints
- Keep `patient_id` as the only primary business identity.
- Store only a hash of `family_code` in `patient_access_links.code`.
- Do not expose the stored hash to C-end responses.
- Keep old databases readable by migrating plaintext access-link codes to hashes during initialization.
- Avoid unrelated dirty files in `chatbotagent/server/*`.

### Steps
- [completed] Inspect current family-code storage, C-end login, B-end import, and legacy link usage.
- [completed] Add backend hash helpers, plaintext-to-hash migration, and family access management endpoints.
- [completed] Remove C-end legacy `/subject/link` call and remove the backend route.
- [completed] Update frontend integration service, B-end management UI, C-end mock route, and docs.
- [completed] Extend tests for hash storage, rotate, revoke, extend, and plaintext migration.
- [completed] Run backend/frontend verification and record outcome.

### Verification
- `python -m py_compile backend/routers/integration.py backend/tests/test_identity_contract.py`
- `python -m pytest tests/test_router_integration.py tests/test_identity_contract.py tests/test_scale_integration.py -q`
- `npm run check` in `Rehab-main`
- `npm run build` in `chatbotagent`
- `git diff --check` in touched repos

### Outcome
- Implemented.
- Backend now hashes `family_code` into `patient_access_links.code`; plaintext rows are migrated during `init_db()`.
- Added B-end family access management endpoints:
  - `GET /api/integration/family/access/{patient_id}`
  - `POST /api/integration/family/access/{patient_id}/rotate`
  - `POST /api/integration/family/access-link/{link_id}/extend`
  - `POST /api/integration/family/access-link/{link_id}/revoke`
- Added a patient-workbench Family Access Manager for rotation, extension, revocation, and one-time raw-code display.
- Removed active C-end `/api/integration/subject/link` usage from `chatbotagent` login and local mock route.
- Verification:
  - `python -m py_compile backend/routers/integration.py backend/tests/test_identity_contract.py` passed.
  - `python -m pytest tests/test_router_integration.py tests/test_identity_contract.py tests/test_scale_integration.py -q` passed: `8 passed`.
  - `npm run check` in `Rehab-main` passed.
  - `npm run build` in `chatbotagent` passed.
  - `git diff --check` passed in both touched repos with CRLF warnings only.
