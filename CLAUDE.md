# Claude Context

This repo is `project_mapper`, a SvelteKit 2 + TypeScript app for turning audio/text into a live project workspace. The UI name is ProMapper.

## Start Here

1. Read `README.md` for the stack and commands.
2. Read `ARCHITECTURE.md` for entry points, data flow, and ownership boundaries.
3. Read `docs/audits/INDEPENDENT_AUDIT_2026.md` for the latest independent audit.
4. Use `GLOSSARY.md` for project-specific vocabulary.

## Current Truth

- Framework: SvelteKit 2, Svelte 5, TypeScript.
- AI: Gemini through `src/lib/server/geminiService.ts` and `src/lib/core/ai/gemini.ts`.
- Realtime: PartyKit through `party/index.ts` and `src/lib/stores/partyStore.ts`.
- Persistence: localStorage first, optional Supabase client sync.
- Validation gate: `npm run check`.
- Current env blocker from the last audit: the local `GEMINI_API_KEY` was invalid, so full AI artifact generation needs a valid key before release signoff.

## Boundaries

- Keep `src/lib/core` framework-agnostic. No Svelte stores, SvelteKit request objects, browser globals, or route-relative `fetch` helpers there.
- Put browser/API helpers in `src/lib/client`.
- Put server-only configuration and guards in `src/lib/server`.
- Treat PartyKit as a realtime delivery and edge persistent truth layer for active collaboration rooms.
- Treat Supabase sync as anonymous/demo backup and share-by-id until an auth or share-token model is chosen.

## Watchouts

- `Upload.svelte` still owns a lot of orchestration and is the main refactor candidate.
- Large audio is bounded by `MAX_UPLOAD_BYTES`, but the Gemini inline base64 path duplicates audio in memory.
- localStorage stores the whole current project under one key and can hit quota for long transcripts.
- Simultaneous edits are last-write-wins.
- Manual release checks still need real browser/mobile/microphone and deployed PartyKit/Supabase validation.
