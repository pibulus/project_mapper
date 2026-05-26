# Project Mapper Architecture

Last updated: 2026-05-27

Project Mapper / ProMapper is a SvelteKit 2 app that turns audio or text into a live project workspace: transcript, summary, action items, and a topic graph. The app is local-first, with optional Supabase persistence and PartyKit collaboration.

## Entry Points

- `src/routes/+page.svelte` mounts the home capture view or the active project dashboard.
- `src/lib/components/Upload.svelte` owns the current capture UI for text, file upload, and microphone recording.
- `src/routes/api/process/+server.ts` creates a new project analysis from text or audio.
- `src/routes/api/append/+server.ts` appends audio to an existing project and merges transcript, action items, topics, and edges.
- `src/routes/api/title/+server.ts` regenerates a project title with Gemini and falls back to a local title when AI is unavailable.
- `src/routes/api/export/+server.ts` transforms a transcript into an export format.
- `party/index.ts` is the PartyKit room server for presence, topic hover/selection, and analysis broadcasts.

## Core Flow

1. Capture starts in `Upload.svelte`.
2. Audio is sent as `multipart/form-data`; text is sent as JSON.
3. API routes pass through `src/lib/server/apiGuard.ts` for optional token auth, same-origin/origin checks, rate limiting, upload size, and audio type validation.
4. Audio transcription runs through `src/lib/server/geminiService.ts`.
5. AI analysis runs through `src/lib/core/orchestration/conversation-flow.ts` and `parallel-analysis.ts`.
6. Gemini response parsing and normalization lives in `src/lib/core/ai/gemini.ts`.
7. Client state lands in `src/lib/stores/projectStore.ts`, with action item edits routed through `actionItemsStore.ts`.
8. Dashboard cards render from the project store and shared topic selection state.
9. When sync is enabled, PartyKit messages update the same project store so remote analysis and topic presence are reflected locally.

## Ownership Boundaries

- `src/lib/core` should stay framework-agnostic. It can know TypeScript types and AI contracts, but not Svelte stores, browser APIs, or SvelteKit request objects.
- `src/lib/server` owns server-only configuration, Gemini setup, Supabase service-role setup, API guards, and PartyKit update posting.
- `src/lib/client` owns browser/API helpers that are not pure core logic.
- `src/lib/stores` owns browser state, localStorage persistence, optional Supabase client sync, and PartyKit client wiring.
- Svelte components should prefer rendering and user interaction. `Upload.svelte` is still the main exception and remains a refactor candidate.
- PartyKit is treated as a realtime delivery layer, not source-of-truth storage.
- Supabase is currently optional persistence, not a complete private ownership model.
- Current ownership semantics are: local projects are private to the browser profile; synced projects are anonymous/demo share-by-id projects and should not be treated as private.

## Realtime And Persistence

- PartyKit rooms are keyed by project id.
- Server-posted PartyKit room updates can be protected with `PARTYKIT_UPDATE_TOKEN`.
- Presence messages use a consistent `{ data: { count } }` shape.
- Topic hover and selection are client-originated PartyKit broadcasts and are stored in `topicSelection`.
- Appended audio now broadcasts the full merged transcript and merged graph, not just the append fragment.
- Simultaneous edits are currently last-write-wins through the project store, Supabase debounce, and PartyKit message order. There is no CRDT/merge engine yet.
- Supabase policies in `database-schema.sql` are anonymous/demo-oriented. Private production data needs Supabase Auth or an explicit share-token model before tightening RLS without breaking sync.

## Validation

The project validation gate is:

```bash
npm run check
```

That runs Prettier, ESLint, TypeScript, and a production build.

Manual validation still needs a valid Gemini key and real browser/device passes for microphone permission states, mobile layout, graph controls, and full Supabase/PartyKit deployment behavior.
