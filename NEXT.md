# Project Mapper Next

Current reality:

- This is the active SvelteKit + TypeScript app, not the Deno/Fresh runtime.
- Gemini is now aligned to `gemini-2.5-flash`.
- API routes now have basic request hardening: optional auth token, origin allowlist, rate limiting, and shared upload size config.
- Projects are local-first by default, with browser-local recent history and explicit public-by-link Supabase sharing.

What looks solid:

- The repo has real product shape now, not just scaffolding.
- Core flow is coherent: ingest -> analyze -> normalize dashboard-ready records -> persist locally -> optionally publish/share.
- Export is project-aware now: transcript, summary, action items, topics, and graph connections can feed an editable markdown draft.
- PartyKit + Supabase boundaries are reasonably clear.

What still wants attention:

- `Upload.svelte` still owns a lot of orchestration and will become a maintenance hotspot.
- There is no stronger auth/session story yet; API hardening is intentionally lightweight.
- Full AI text validation is working locally with the repo `.env`; Supabase, PartyKit, audio upload/transcription, and real browser/device checks still need release validation.
- Current docs are organized: root reference docs stay at the top level, while older handoff and synthesis notes live under `docs/history/`.

Obvious next moves:

- Test end-to-end on the Pi with real env vars for Gemini, Supabase, and PartyKit.
- Decide whether this should get a real release version/tag once that flow is stable.
- Consider splitting recording/upload orchestration out of `Upload.svelte`.
- Consider project JSON import/export and saved markdown drafts as the next highest-value parity fixes from `docs/audits/FEATURE_PARITY_AUDIT.md`.
