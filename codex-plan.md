# Task Plan

## Active Task: Galen Research Feedback Queue

### Objective
- Turn Galen observation reviews into actionable RehabMain research tasks linked to the original assessment record.

### Steps
- [completed] Add desktop IPC support for reading `feedback.json` from the shared connector directory.
- [completed] Model accept, exclude, correction, recapture, and retest feedback in the RehabMain frontend.
- [completed] Verify repeated feedback reads, frontend rendering contracts, and cross-project compatibility.

### Verification
- `node --test desktop/galen-connector.test.cjs`
- `npm run check`
- Galen Rust connector and review tests.

### Outcome
- RehabMain reads Galen's idempotent `feedback.json` and refreshes the queue every five seconds while the connector page is open.
- Each item links a RehabID and source assessment to an accept, exclude, correction, recapture, or retest event.
- Verification passed: desktop connector 3/3 and TypeScript check; Galen producer tests passed 11/11 connector, 8/8 timeline, and 2/2 review UI.

## Active Task: RehabMain -> Galen First-Party Connector

### Objective
- Make the active RehabMain desktop app automatically publish the minimal de-identified snapshot that Galen already expects at `%LOCALAPPDATA%\Rehab\GalenConnector\latest.json`.

### Constraints
- Preserve the existing IndexedDB business schema and desktop packaging work.
- Export only allowlisted identifiers and numeric screening observations; exclude names, notes, images, narrative reports, MedVoice content, and estimated Cobb angle.
- Write snapshots atomically so Galen never reads a partial JSON file.
- Keep screening observations reviewable; do not turn connector output into diagnostic conclusions.

### Steps
- [completed] Locate the active RehabMain repository and compare its actual export behavior with Galen's connector contract.
- [completed] Add a de-identified snapshot builder, automatic IndexedDB publisher, and Electron IPC bridge writer.
- [completed] Add privacy/contract tests and verify the frontend and desktop scripts.
- [completed] Expose connector health and manual refresh in RehabMain data settings.
- [completed] Confirm Galen registry and Rust import behavior against the bridge contract.
- [completed] Run final focused verification and record the operational boundary.

### Verification
- `npm test -- --run src/lib/galenConnector.test.ts`
- `npm run check`
- Node-level atomic-writer smoke test against a temporary directory.
- Galen connector discovery against an isolated generated snapshot.

### Outcome
- RehabMain desktop now automatically publishes a minimal allowlisted snapshot to Galen's Windows local bridge and serializes repeated writes.
- Renderer and main-process privacy gates exclude names, notes, images, narrative/voice content, landmarks, recommendations, and estimated Cobb angle.
- Data settings now shows connector readiness, last update, size, path, privacy boundary, and a manual refresh action.
- Galen now advertises the real `%LOCALAPPDATA%` bridge instead of the stale `D:/DEV/Rehab` path.
- Verification passed: RehabMain snapshot tests 2/2, desktop writer/privacy tests 2/2 including repeated replacement, TypeScript check, production build, Galen registry tests 3/3, and Galen Rust connector tests 10/10.
- Operational boundary: this pass establishes the trusted RehabMain -> Galen evidence path. Galen -> RehabMain review/action/outcome feedback remains the next bidirectional-loop slice.

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

## Current Task: Public Patient Code Unification

### Objective
- Make the four-letter public patient code the shared visible identifier across screening, therapist workbench, visit cards, reports, and parent login responses while keeping `patient_id` as the hidden canonical key.

### Constraints
- Do not make the public patient code a login credential.
- Keep family access codes private, revocable, and separate from the public patient code.
- Preserve existing `short_code` / `shortCode` compatibility while documenting the product name as `patient_code`.
- Avoid committing local SQLite test data changes.

### Steps
- [completed] Inspect current partial `short_code` implementation and existing dirty files.
- [completed] Patch frontend code generation, display labels, search, and visit-code construction.
- [completed] Patch backend/API payloads to return `patient_code` alongside legacy `short_code`.
- [completed] Update identity/closed-loop docs with the public-code contract.
- [completed] Run targeted verification and record residual risk.

### Verification
- `python -m py_compile backend/routers/integration.py backend/tests/test_identity_contract.py`
- `python -m pytest tests/test_identity_contract.py -q -s`
- `python -m pytest tests/test_router_integration.py tests/test_identity_contract.py tests/test_scale_integration.py -q -s`
- `npm run check` in `Rehab-main`
- `npm run build` in `RehabGPT-feat-biz`
- `git diff --check` in both touched repos

### Outcome
- Implemented.
- Backend now accepts and returns `patient_code` as the product-facing alias for the four-letter public code, while preserving `short_code` compatibility.
- `patient_id` remains the canonical hidden primary key; public patient codes can resolve API reads/pushes but cannot log in as family credentials.
- Therapist workbench now generates/stores/searches/displays the four-letter public patient code, and visible visit codes derive from that code.
- Parent login now receives and displays `patient_code` / `short_code`, but still authenticates only through the family access code.
- Documentation updated across the identity contract, API specification, and closed-loop workflow.
- Verification passed:
  - Backend identity tests and integration closed-loop tests passed.
  - `Rehab-main` type check passed.
  - `RehabGPT-feat-biz` production build passed.
  - `git diff --check` passed in both touched repos with CRLF warnings only.
- Residual risk:
  - `backend/rehab_integration.db` remains a local/test database change from verification and should not be committed unless intentionally refreshing fixture data.

## Current Task: Parent Plan Translation Layer Implementation

### Objective
- Complete the therapist plan to parent-friendly execution guide path, so family users see actionable training instructions without changing the therapist's original prescription.

### Constraints
- Keep `plan_content` as the source-of-truth therapist prescription.
- Translation may explain and structure, but must not alter action names, dosage, frequency, or safety boundaries.
- Use the existing Python `/api/integration/plan/pending/{patient_id}` data path.
- Support gray release without an LLM key by providing a rule/template fallback.
- Preserve other dirty changes and avoid committing local SQLite test data.

### Steps
- [completed] Audit the existing translation module and family plan UI.
- [completed] Add backend rule fallback for structured parent plan explanations.
- [completed] Add C-end parsing/rendering for translated or fallback parent explanations.
- [completed] Wire homepage/training page copy to parent-friendly summaries.
- [completed] Run backend/frontend verification and record outcome.

### Verification
- `python -m py_compile backend/routers/integration.py backend/translation/*.py backend/translation/prompts/*.py`
- `python -m pytest tests/test_identity_contract.py -q -s`
- `npm run build` in `RehabGPT-feat-biz`
- `git diff --check` in touched repos

### Outcome
- Implemented.
- Backend `/api/integration/plan/push` now stores `translated_plan_content` for parent-facing plan explanations, with a rule/template fallback when LLM generation is unavailable.
- The fallback extracts only explicit bullet/numbered exercise rows, preserves source dosage/cautions, and returns structured fields for title, focus, estimated time, exercises, stop conditions, and therapist-contact triggers.
- C-end now parses `translated_plan_content` and renders a parent-friendly execution guide in the training/tracking and prescription pages, while keeping the therapist's original `plan_content` visible in a folded section.
- C-end home action cards now use the parent explanation title, focus, and estimated duration instead of raw therapist prose.
- Verification passed:
  - `python -m py_compile backend\routers\integration.py backend\tests\test_identity_contract.py backend\translation\types.py backend\translation\config.py backend\translation\cache.py backend\translation\service.py backend\translation\prompts\plan_prompt.py backend\translation\prompts\scale_prompt.py backend\translation\prompts\assessment_prompt.py`
  - `python -m pytest tests/test_router_integration.py tests/test_identity_contract.py tests/test_scale_integration.py -q -s`
  - `npm run build` in `RehabGPT-feat-biz`
  - Browser smoke test on local Vite `:5181` confirmed the family training page renders the parent guide, safety panels, action cards, and original-plan folded section without console errors.
- Residual risk:
  - The already-running Python service on `:8000` must be restarted after deploy to pick up the updated translation fallback.
  - `backend/rehab_integration.db` remains local test data and should not be committed unless intentionally refreshing the fixture database.

## Current Task: Parent Return Channel And Stable Family Code

### Objective
- Make parent-submitted scale/tracking/report evidence recoverable from the therapist workspace by patient, and change family-code handling from periodic rotation to stable long-lived access.

### Constraints
- Keep `patient_id` as the canonical grouping key for returned family evidence.
- Preserve existing `/scale/results/{session_id}` compatibility.
- Keep parent self-screening reports separate from therapist-authored assessment summaries.
- Do not force periodic `family_code` expiry or rotation; rotation is only manual reset for loss/leak.
- Keep stored family codes hashed and never expose hashes.
- Avoid committing local SQLite test data.

### Steps
- [completed] Inspect current return paths for scale results, tracking, and family access UI.
- [completed] Add patient-scoped scale result retrieval to the integration backend.
- [completed] Update therapist-side parent data panel to show pending and completed returned scale evidence.
- [completed] Change family-code UI defaults to long-lived access and manual reset/revoke language.
- [completed] Extend backend tests and run verification.
- [completed] Add a separate parent-report return channel for family self-screening results.

### Verification
- `python -m py_compile backend/routers/integration.py backend/tests/test_identity_contract.py`
- `python -m pytest tests/test_identity_contract.py -q -s`
- `npm run check` in `Rehab-main`
- `git diff --check`

### Outcome
- Added `GET /api/integration/scale/results/by-patient/{patient_id}` so therapist-side views can recover parent-submitted scale evidence by canonical patient after refresh or context switching. The endpoint accepts canonical `patient_id`, short code, or family code aliases and can filter `pending` / `completed`.
- Updated therapist-side parent push/feedback UI to load all patient scale tasks instead of only pending tasks, with separate pending/completed counts, returned score display, and submitted timestamp.
- Changed family-code handling to long-lived access by default: auto-generated and manually reset codes now use `expires_at = null`; old expiring links can be set back to long-term with the existing extend endpoint.
- Added a separate `parent_reports` return channel for family self-screening reports, with `POST /api/integration/parent-report/submit` and `GET /api/integration/parent-report/{patient_id}`. This keeps parent-generated reports distinct from therapist-authored assessment summaries.
- Updated the parent app result page to submit local self-screening risk results back to the integration backend once per patient/session/result signature.
- Updated the therapist feedback panel to show the latest parent self-screening report alongside returned scales and daily tracking.
- Added regression coverage for parent scale return by patient/family code, parent-report return/update, and family-code long-term extension.
- Verification passed:
  - `python -m py_compile backend\routers\integration.py backend\tests\test_identity_contract.py`
  - `python -m pytest tests\test_identity_contract.py -q -s` from `backend`
  - `npm run check`
  - `npm run build` in `RehabGPT-feat-biz`
  - `git diff --check`
- Local runtime check:
  - Confirmed `GET http://localhost:8000/api/integration/scale/results/by-patient/__codex_probe__` returns `200 []`.
  - Confirmed the new parent-report route returns `200 []` on a temporary clean backend instance on `:8010`.
  - Runtime caveat: local `:8000` still has an old listener mapped to PID `3388`, but Windows process tools cannot find that PID (`taskkill` also reports not found). Clear that listener or restart the local environment before live-testing the new parent-report endpoint on `:8000`.
  - Refreshed the therapist Vite app on `http://localhost:5173/` and the parent Vite app on `http://localhost:5175/`; no browser console errors were observed.
- Open product decision: returned parent scale data is displayed in the therapist workspace, but not auto-imported into the local report assessment table yet. Auto-import needs an idempotent import marker or explicit "include in report" action to avoid duplicate assessment records.

## Current Task: Therapist Workbench First Release Closure

### Objective
- Package the therapist workbench as a reversible internal gray release for 1–3 therapists while keeping early screening and the family app outside the first-release acceptance boundary.

### Constraints
- Product output remains screening, functional assessment, risk prompts, and workflow support; it is not medical diagnosis.
- Production secrets stay server-side and runtime databases stay outside Git.
- The first release is limited to one managed workstation/browser profile because part of the core data remains in IndexedDB.
- The existing public Git history is not rewritten without explicit approval.

### Steps
- [completed] Remove the tracked runtime SQLite database from the release branch and ignore future runtime databases.
- [completed] Move LLM configuration to the backend and remove browser-side API-key configuration.
- [completed] Add production same-origin routing, health/readiness checks, and opt-in demo seeding.
- [completed] Add Docker/Nginx packaging, Basic Auth boundary, deployment guide, backup, and rollback instructions.
- [completed] Add a disposable HTTP acceptance script for the integration closed loop.
- [completed] Run frontend, backend, workflow-gate, secret-scan, and diff verification.

### Verification
- `python scripts/release_acceptance.py`
- `npm run check`
- `npm run build`
- `npm test -- --run src/hub/__tests__/report-center-utils.test.ts`
- `python -m py_compile backend/main.py backend/models.py backend/routers/integration.py backend/utils/llm_reporter.py`
- `git diff --check`

### Outcome
- Release packaging is ready on `codex/project-closure` for deployment to an HTTPS-protected internal server.
- The disposable API acceptance flow passes health/readiness, screening intake, identity binding, family login, scale authorization guard, submission, and result retrieval.
- Residual blockers: the public Git history still contains an old database artifact; Docker/Nginx image validation is unavailable on this workstation; application-level therapist accounts/audit logs and multi-device server persistence remain future work.
# Desktop Packaging Task

## Objective
- Package Rehab-main as a Windows desktop app that launches locally with one click while preserving the current UI.

## Constraints
- Default local-first operation; no automatic patient-data upload.
- Keep existing React UI and FastAPI backend behavior.
- Make the first version suitable for internal distribution and feedback collection.

## Steps
- [completed] Inspect current frontend/backend startup and packaging constraints.
- [completed] Add desktop launcher and Windows packaging configuration.
- [completed] Add internal distribution and privacy notes.
- [in_progress] Run type/build checks and verify the packaged startup path.

## Verification
- `npm run check`
- `npm run build`
- Validate launcher configuration and bundled runtime paths.

## Outcome
- `npm run check` passed.
- `npm run build` passed.
- Desktop source/configuration is present.
- `npm run check` and `npm run build` passed.
- Backend directory bundle completed at `backend/dist/rehab-backend/rehab-backend.exe` (approximately 975 MB including scientific-computing dependencies).
- Electron packaging was started but had not produced files under `release/` within the execution window; packaging is still CPU/disk intensive because of the backend bundle.
- Remaining risk: complete installer/portable artifact generation and validate one-click startup on a clean Windows machine.

## Current Task: Lean Desktop Distribution

### Objective
- Produce a smaller, maintainable Windows internal-test package without changing the current Rehab-main UI or local-first privacy boundary.

### Constraints
- Use a dedicated Python environment instead of the polluted global Python environment.
- Preserve local FastAPI, MediaPipe/OpenCV analysis, SQLite data, and optional online LLM calls.
- Do not remove business features merely to reduce package size without recording the tradeoff.

### Steps
- [completed] Audit backend import chains and identify why heavy unrelated packages entered the bundle.
- [completed] Build a clean packaging environment with only declared runtime dependencies.
- [completed] Add explicit PyInstaller exclusions/spec configuration where safe.
- [completed] Rebuild and compare backend/package sizes.
- [completed] Smoke-test health startup and record distribution recommendation.

### Verification
- Import backend entrypoint in the clean environment.
- Build the backend bundle and measure total bytes.
- Launch bundled backend and request `/health`.
- Build Electron unpacked/installer artifact if the backend smoke test passes.

### Outcome
- Global Python 3.14 pollution was the primary bundle-size cause; unrelated Torch/Transformers/Pandas/SciPy packages were being collected.
- Added a dedicated Python 3.12 `.venv-desktop` build and `backend/requirements-desktop.txt`.
- Python MediaPipe was removed from the desktop backend package because landmark inference is already frontend-side; OpenCV uses the headless runtime.
- Backend bundle reduced from about 975 MB to about 183 MB and passed `/health` smoke testing.
- Added an isolated desktop packaging project so compiled React assets are not duplicated with frontend `node_modules`.
- Generated `release-lean/Qingyue-Rehab-0.1.0-internal-x64.exe` at about 182 MB.
- The unpacked desktop app successfully launched its bundled backend and returned a healthy status.
- Remaining release risk: installer is unsigned and uses the default Electron icon; Windows SmartScreen warnings are expected until code signing is added.

## Current Task: One-Click Release Closure

### Objective
- Produce a single Rehab-main internal-test installer that installs, creates shortcuts, starts automatically, and manages its local backend/data without user configuration.

### Constraints
- Package only the mature `Rehab-main` frontend/backend.
- Keep patient data local and persistent across application upgrades.
- Do not bundle secrets, `.env` files, or test databases.

### Steps
- [completed] Harden desktop startup, single-instance handling, port checks, logs, and local data paths.
- [completed] Rename all installer/application branding to Rehab-main and apply the new icon.
- [completed] Rebuild the frontend, backend, unpacked application, and one-click installer.
- [completed] Smoke-test bundled startup and record artifact hash/size.

### Verification
- `npm run check`
- Bundled backend `/health` smoke test.
- Unpacked desktop launches the bundled backend.
- Installer artifact exists with Rehab-main naming and SHA-256 hash.

### Outcome
- Generated one-click installer: `release-lean/Rehab-main-Internal-0.1.0-internal-x64.exe` (174.01 MiB).
- Installer creates desktop/Start Menu shortcuts and runs the application after installation.
- Desktop app enforces a single instance, starts/stops its bundled backend, reports port conflicts, and writes backend logs locally.
- Backend binds to `127.0.0.1` and stores its SQLite database under `%APPDATA%/rehab-main-desktop/data/`, outside the installation directory.
- Rehab-main branding and the generated icon are applied to the packaged executable and installer.
- Verification passed: TypeScript check, backend compile/build, desktop package build, bundled `/health` smoke test, local DB/log creation.
- SHA-256: `2DDE824DB81A865BBF5CAC5FE6A356E03CFF7E4373A60BC26AB4BA2906CECBD8`.
- Remaining release risk: installer is not certificate-signed, so Windows SmartScreen may show an unknown-publisher warning.

## Current Task: Technical Debt Audit

### Objective
- Identify the highest-impact technical debt in Rehab-main with reproducible evidence, file/line references, and a prioritized remediation order.

### Constraints
- Audit only; do not change application behavior or refactor production code in this pass.
- Distinguish correctness, privacy/data-integrity, maintainability, delivery, and cosmetic debt.
- Preserve the user's existing working-tree changes.

### Steps
- [in_progress] Map repository boundaries, runtime architecture, and generated or duplicated content.
- [pending] Audit frontend state, data persistence, assessment flows, and test coverage.
- [pending] Audit Python backend, Electron boundary, packaging, and secret/data handling.
- [pending] Reproduce quality signals and write a prioritized technical-debt report.

### Verification
- `npm run check`
- `npm run lint` with source-only attribution
- `npm test -- --run`
- Backend test discovery and focused static checks
- Evidence paths and line references verified against the current working tree

### Outcome
- Pending.
