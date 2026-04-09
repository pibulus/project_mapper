# Project Mapper Next

Current reality:

- This is the active SvelteKit + TypeScript app, not the Deno/Fresh runtime.
- Gemini is now aligned to `gemini-3.1-flash-lite-preview`.
- API routes now have basic request hardening: optional auth token, origin allowlist, rate limiting, and shared upload size config.

What looks solid:

- The repo has real product shape now, not just scaffolding.
- Core flow is coherent: ingest -> analyze -> stream updates -> persist locally/cloud.
- PartyKit + Supabase boundaries are reasonably clear.

What still wants attention:

- `Upload.svelte` still owns a lot of orchestration and will become a maintenance hotspot.
- There is no stronger auth/session story yet; API hardening is intentionally lightweight.
- README and handoff docs are better now, but the project history is still spread across `CATCHUP.md`, `HANDOFF.md`, and `SYNTHESIS_NOTES.md`.

Obvious next moves:

- Test end-to-end on the Pi with real env vars for Gemini, Supabase, and PartyKit.
- Decide whether this should get a real release version/tag once that flow is stable.
- Consider splitting recording/upload orchestration out of `Upload.svelte`.
