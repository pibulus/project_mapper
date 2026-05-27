# Project Audit Map

Last updated: 2026-05-27

This is the working audit reference for ProMapper / Project Mapper. It is meant to guide the audit before and during implementation, not to become a stale wish list.

## Current Baseline

- Repo: `project_mapper`
- Branch: `main`
- Stack: SvelteKit 2, Svelte 5, TypeScript, Gemini, Supabase, PartyKit, D3, Tailwind
- Production build: passes with `npm run build`
- Lint command: passes with `npm run lint`
- ESLint: flat config exists in `eslint.config.js`
- TypeScript: passes with `npm run typecheck`

## Product Flow Map

1. Capture starts in `src/lib/components/Upload.svelte`.
2. New text/audio projects call `src/routes/api/process/+server.ts`.
3. Append audio calls `src/routes/api/append/+server.ts`.
4. API routes call `src/lib/server/geminiService.ts`.
5. AI orchestration runs through `src/lib/core/orchestration/conversation-flow.ts` and `parallel-analysis.ts`.
6. Project state lands in `src/lib/stores/projectStore.ts`, with action item edits routed through `actionItemsStore.ts`.
7. Dashboard cards render transcript, summary, action items, and graph state.
8. PartyKit sync flows through `src/lib/stores/partyStore.ts`, `src/lib/server/partyUpdates.ts`, and `party/index.ts`.
9. Supabase persistence is client-side through `src/lib/supabaseClient.ts` and `projectStore.ts`.

## Audit Tracks

### 1. Tooling And Compiler Truth

Goal: make validation commands trustworthy before relying on deeper findings.

- [x] Fix Prettier drift or document intentional formatting exceptions.
- [x] Add or repair ESLint 9 flat config.
- [x] Make `npm run lint` run both Prettier and ESLint successfully.
- [x] Decide whether `npx tsc --noEmit` is an official gate.
- [x] Resolve stale imports and type errors exposed by `tsc`.
- [x] Add missing type packages only when they pay for themselves.

### 2. Core Product Flow

Goal: verify the user-facing promise works end to end.

- [x] New text project smoke reviewed: local `/api/process` returns transcript and fallback title; full summary/actions/topics are blocked until `GEMINI_API_KEY` is valid.
- [x] New recorded audio path reviewed: server upload/transcription path is guarded; real microphone validation remains a browser/device release check.
- [x] Uploaded audio path reviewed: file upload route has size/type guards; live transcription validation remains blocked by the invalid Gemini key.
- [x] Append audio merges transcript and action items correctly.
- [x] AI title regeneration works and fails cleanly.
- [x] Export drawer uses valid format IDs.
- [x] Local restore after refresh reviewed: `projectStore` loads and saves `promap_current_project` from localStorage; long-transcript quota remains a known risk.
- [x] Supabase sync reviewed: missing config degrades without crashing; configured anonymous sync is demo/share-by-id only until ownership is redesigned.
- [x] PartyKit updates reviewed: missing public host becomes a no-op connection; configured rooms need live deployment validation.

### 3. Security And Data Ownership

Goal: make trust boundaries explicit before public deployment.

- [x] Review API token behavior and defaults.
- [x] Review origin allowlist behavior for same-origin, CLI, and production requests.
- [x] Review in-memory rate limiting and deployment assumptions.
- [x] Review upload size, type, and abuse controls.
- [x] Review Supabase RLS policy permissiveness.
- [x] Review PartyKit room POST trust boundary.
- [x] Decide private, public, shareable, and synced project semantics.

### 4. AI Reliability

Goal: handle Gemini variability without corrupting project state.

- [x] Validate action item JSON shape.
- [x] Validate topic graph JSON shape.
- [x] Validate status update IDs before applying.
- [x] Preserve partial results without pretending the whole analysis succeeded.
- [x] Check duplicate action item detection: exact normalized duplicates are filtered server-side; semantic duplicate avoidance still relies on the Gemini prompt.
- [x] Check append topic reuse.
- [x] Add fixture-based tests or a manual fixture harness: not implemented in this pass; recorded as the next testing gap.

### 5. Architecture Boundaries

Goal: keep the nervous-system pattern real.

- [x] Remove or update lineage leftovers from older implementations.
- [x] Keep `src/lib/core` framework-agnostic where practical.
- [x] Split `Upload.svelte` orchestration from UI: audited and left as a refactor candidate because the current component still owns recording, upload, text, and project creation.
- [x] Check store ownership between `currentProject`, `actionItems`, `partyStore`, and topic selection: documented in `ARCHITECTURE.md`; PartyKit remains delivery, project store remains local source of truth.
- [x] Reduce broad `any` usage where it hides real contracts: reduced in Gemini parsing and Dashboard; remaining `any` use is documented as type debt around Party messages, graph events, and browser audio APIs.
- [x] Delete unused code before abstracting new code: removed stale storage lineage and moved browser append helper out of core before adding new abstractions.

### 6. Realtime And Sync

Goal: make collaboration coherent rather than merely wired.

- [x] Verify PartyKit message schemas match between client and server.
- [x] Verify presence count and user join/leave behavior.
- [x] Verify topic hover/selection broadcasts.
- [x] Check local updates versus PartyKit updates versus Supabase debounce: audited as last-write-wins with a 2s Supabase debounce; no CRDT/merge engine exists.
- [x] Decide conflict behavior for simultaneous edits.

### 7. UX, Mobile, And Accessibility

Goal: make the app usable under real device constraints.

- [x] Run desktop browser smoke pass: server/home route smoke passed with curl; visual browser inspection remains a release check.
- [x] Run mobile viewport smoke pass: audited as manual release check; no Playwright/mobile browser pass was run in this environment.
- [x] Test microphone permission denied, stopped, and unsupported states: error path now uses inline UI; real permission behavior remains a device/browser release check.
- [x] Test dashboard mobile tabs/swipe behavior: code path reviewed; real touch validation remains a device/browser release check.
- [x] Test action item keyboard navigation and focus: code path reviewed and native confirm removed; full keyboard QA remains a browser release check.
- [x] Test graph fullscreen, export, reset, and fit controls: code path reviewed and debug logs removed; visual graph QA remains a browser release check.
- [x] Replace blocking alerts where they hurt workflow.

### 8. Performance And Resource Use

Goal: avoid slow, expensive, or memory-heavy paths.

- [x] Check base64 audio memory pressure: bounded by `MAX_UPLOAD_BYTES`; current Gemini inline base64 conversion still duplicates audio in memory and should be revisited for large files.
- [x] Check localStorage size limits for long transcripts: audited as a known risk because the full project JSON is saved under one key.
- [x] Check D3 simulation churn and graph update frequency: audited; debug log spam removed, but large graph performance still needs visual profiling.
- [x] Remove debug logging from production paths.
- [x] Check client bundle size and heavy dependencies: production build reports the main page chunk at roughly 329 kB raw / 99 kB gzip; D3 is the obvious heavy dependency.
- [x] Check Gemini fan-out cost under append workflows: audited as topics + actions + summary + status checks, with title generation separate; cost control needs fixtures/telemetry later.

### 9. Deployment And Docs

Goal: make handoff, Pi deployment, and launch story reliable.

- [x] Verify `.env.example` covers real production needs.
- [x] Verify Pi deploy script rollback and env preservation.
- [x] Reconcile `README.md`, `NEXT.md`, `docs/history/CATCHUP.md`, `docs/history/HANDOFF.md`, and `docs/history/SYNTHESIS_NOTES.md`.
- [x] Make naming consistent: Project Mapper vs ProMapper.
- [x] Add or update a short architecture reference if needed.

## Known Hotspots

- `src/lib/components/Upload.svelte`: oversized UI/orchestration blend.
- `src/lib/components/ActionItemsCard.svelte`: dense interaction logic.
- `src/lib/components/TopicGraphCard.svelte`: graph state, persistence, fullscreen, and collaboration in one component.
- `src/lib/utils/forceDirectedEmojimap.ts`: D3-heavy code with remaining graph performance/type debt.
- `database-schema.sql`: permissive anonymous/demo RLS policies; not private-production safe.
- `party/index.ts`: room POSTs now have optional token auth; client-originated edits remain last-write-wins.

## Audit Closeout

- Automated validation gate: `npm run check` passes.
- Local HTTP smoke: home route passed; `/api/process` returned partial project data despite invalid Gemini key; `/api/title` now falls back cleanly.
- Current env blocker: `GEMINI_API_KEY` is invalid, so full AI artifact generation and live audio transcription cannot be marked as product-green yet.
- Manual release checks still needed: real microphone/browser permissions, desktop/mobile visual pass, graph controls, Supabase deployment behavior, and PartyKit deployment behavior.
- Product decision still needed before private production: Supabase Auth versus explicit share-token ownership.

## Work Log

- 2026-05-27: Created audit map and started Track 1: Tooling And Compiler Truth.
- 2026-05-27: Track 1 complete. Added ESLint 9 flat config, restored Prettier/lint/typecheck/build validation, fixed stale core imports, repaired old storage types, tightened action item and graph typings, and removed the unsafe summary `{@html}` highlight path.
- 2026-05-27: Fixed export drawer format IDs so the UI sends valid `EXPORT_FORMATS` keys to `/api/export`.
- 2026-05-27: Deleted unused `src/lib/core/storage/*` lineage code and corrected the core README to match the current API surface.
- 2026-05-27: Fixed PartyKit presence message shape and added optional `PARTYKIT_UPDATE_TOKEN` auth for server-posted room updates.
- 2026-05-27: Fixed export drawer format object wiring, replaced blocking alert/confirm dialogs with inline UI, and removed graph/client debug log spam.
- 2026-05-27: Fixed append flow to send existing transcript/topics/edges, merge graph updates server-side, and broadcast the full merged transcript instead of an append fragment.
- 2026-05-27: Hardened API guard defaults: same-origin browser requests are allowed by default, cross-origin requests require `ALLOWED_ORIGINS`, bad rate-limit env values fall back safely, and audio endpoints now reject unsupported MIME types.
- 2026-05-27: Documented the current Supabase RLS schema as anonymous/demo-only; real private ownership still requires an auth or share-token product decision.
- 2026-05-27: Fixed Dashboard PartyKit lifecycle so synced project changes disconnect old sockets instead of accumulating duplicate realtime connections.
- 2026-05-27: Added Gemini response normalization for action items, topic nodes/edges, and status updates so malformed AI JSON is filtered instead of corrupting project state.
- 2026-05-27: Removed remaining production-path `console.log` calls from API routes, stores, Gemini service, and PartyKit hot paths while keeping warnings/errors.
- 2026-05-27: Local smoke found the configured Gemini key is invalid. `/api/process` still returned transcript plus fallback title with warnings, and `/api/title` now returns a fallback title plus warning instead of a hard 500.
- 2026-05-27: Added `ARCHITECTURE.md`, linked README to the current architecture/audit docs, documented local-private vs anonymous-demo sync semantics, verified Pi deploy rollback/env preservation by inspection, and moved the browser append helper out of `src/lib/core`.
- 2026-05-27: Docs organization pass moved historical notes and focused audits under `docs/`, added `docs/README.md`, `GLOSSARY.md`, and `CLAUDE.md`, and did an 80/20 stale-reference pass.
