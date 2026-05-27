# Feature Parity Audit

Last updated: 2026-05-27

This pass compares current `project_mapper` against the older sibling app at `../conversation_mapper`. The goal is not to port the old app wholesale. The goal is feature parity for the product promise while leaving behind complexity theatre, demo widgets, and old tech debt.

## Summary

Current Project Mapper is already stronger on the core loop:

1. Capture text/audio.
2. Generate transcript, summary, action items, and topic graph.
3. Continue the project with appended audio.
4. Auto-update tasks and graph context.
5. Save locally, optionally publish/share.
6. Export the project as editable markdown.

The old app still has useful product ideas around markdown output history, notes, richer visualization experiments, action-only sharing, speaker tools, and backup/import. It also has substantial drag-dashboard, theme, scraper, toy, admin, and duplicate visualization surface that should not be blindly restored.

## Fixes Applied In This Pass

- Fixed local Gemini runtime selection in `src/lib/server/geminiService.ts`: in dev, repo-local `.env` Gemini settings now win over a conflicting inherited shell `GEMINI_API_KEY`. This matched the direct SDK test and made `/api/process` return real AI artifacts again.
- Expanded `src/lib/components/ExportDrawer.svelte` to expose the old Markdown Maker format family already present in core: blog, meeting, plan, summary, research, specifications, technical manual, journal, case study/report, haiku, and custom prompt.
- Updated `src/routes/api/export/+server.ts` to accept a validated `CUSTOM` prompt without weakening predefined format validation.

## Parity Matrix

| Area                  | Old evidence                                                                                                              | Current state                                                                                                                           | Decision                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Front door payoff     | `conversation_mapper/src/routes/+page.svelte` had a generic welcome and conversation list.                                | `src/routes/+page.svelte` now shows the actual capture flow, recent projects, and a spidergoat sample payoff.                           | Keep current. It sells the first click better than the old page.                                       |
| Text/audio capture    | Old `NewConversation.svelte`, `transcriptionService.js`, and browser recording flow.                                      | `Upload.svelte` supports pasted text, uploaded audio, microphone recording, and guarded server routes.                                  | Parity reached. Later refactor `Upload.svelte` for maintainability.                                    |
| Topic extraction      | Old `geminiService.js` prompt requested topics/relationships/emojis, then `topicService.js` remapped Gemini IDs to UUIDs. | Current prompt is stricter, IDs are stable, normalization rejects weak/malformed graph data, append reuses nodes/edges.                 | Current is better. Do not restore old ID remapping.                                                    |
| Topic graph UI        | Old had many visualization experiments and an emojimap action.                                                            | Current has one coherent emojimap with drag, zoom, fit, reset, SVG export, fullscreen, persisted positions, badges, and topic presence. | Keep one primary graph. Defer a deterministic circular/readable layout for dense maps.                 |
| Graph settings        | Old exposed configuration mostly through code and scattered visualization variants.                                       | Current has user controls for fit/reset/export/fullscreen, but no settings panel.                                                       | Fine for now. Add settings only for real pain: layout mode, label density, or edge visibility.         |
| Markdown/export       | Old `MarkdownMaker.svelte` had presets, custom prompt, copy, save, and preview.                                           | Current export drawer is project-aware, editable, copy/download capable. This pass restored old preset breadth and custom prompt.       | Core parity mostly reached. Saved output history remains a later candidate.                            |
| Notepad               | Old `Notepad.svelte` stored notes and could show Markdown Maker outputs.                                                  | No note surface in current app.                                                                                                         | Defer. Bring back only as "Project notes/drafts", not as another dashboard widget by default.          |
| Web scraper           | Old `Scraper.svelte` did URL/search/fact flows and could add results to the transcript.                                   | No scraper in current app.                                                                                                              | Drop for now. It broadens the product into research tooling before the core project loop is finished.  |
| Action items          | Old had manual item creation/editing, status, sharing modal, and live action-item share route.                            | Current has add/edit/delete, checkoff, assignee/due edits, search, sort, manual reorder, AI checkoff, and project sharing.              | Current is stronger for the main workspace. Defer action-only public sharing.                          |
| History/persistence   | Old used IndexedDB plus Supabase services and backup/import tooling.                                                      | Current uses browser-local recent projects plus explicit Supabase public-by-link sharing.                                               | Current is simpler and coherent. Add JSON project export/import before reintroducing backup machinery. |
| Collaboration         | Old had presence, realtime services, and chat experiments.                                                                | Current uses PartyKit for presence, topic hover/selection, and analysis updates.                                                        | Keep collaboration focused. Do not port chat unless teams ask for it.                                  |
| Speaker tooling       | Old had speaker mapping/editor components and speaker-topic visualizations.                                               | Current transcription captures speakers but has no speaker editor or speaker-topic graph.                                               | Candidate for meeting-heavy use. Defer until real transcripts show speaker correction pain.            |
| Audio recordings list | Old had an `AudioRecordings.svelte` dashboard component.                                                                  | Current keeps the merged transcript/project rather than an audio archive.                                                               | Defer. Useful only if users need source-audio review or per-meeting playback.                          |
| Dashboard layout      | Old used Muuri/drag dashboard and several collapsible widgets.                                                            | Current dashboard is fixed, denser, and product-focused.                                                                                | Do not port. The old layout is a maintenance cost and distracts from the core flow.                    |
| Theme customization   | Old had theme randomizer, favorites, mesh gradients, and showcase routes.                                                 | Current has a coherent product style without theme controls.                                                                            | Drop. This is not core parity.                                                                         |
| Admin routes          | Old had admin conversation routes and share management.                                                                   | Current has no admin UI.                                                                                                                | Defer until there is auth/ownership.                                                                   |
| Toys                  | Old included asteroids, keyboard, and tamagotchi routes.                                                                  | Current has none.                                                                                                                       | Drop. Keep this app disciplined.                                                                       |

## 80/20 Findings

The biggest high-leverage gaps are not the flashy old features:

1. **Portable project backup/import.** Local history answers "how do I get back to it?", but a JSON export/import answers "will I lose it?" better than the old backup subsystem would.
2. **Saved export drafts.** The drawer now edits and downloads markdown, but if users generate three blog drafts, close the drawer, and come back later, those outputs are not first-class project data yet.
3. **Manual topic cleanup.** Gemini can still produce a duplicate or awkward node. Merge/rename/delete topic controls would improve trust more than adding five old visualization modes.
4. **Readable layout mode.** The old circular graph idea is worth reviving as a layout toggle for dense maps, not as a carousel of separate graph components.
5. **Speaker correction.** If the target use case is repeated meetings with two or more people, speaker rename/merge could become important. It should wait for real transcript examples.

## Recommended Next Moves

1. Add project JSON export/import at the project level.
2. Persist generated markdown drafts on the project, with a small draft list in the export drawer.
3. Add topic rename/delete/merge controls before adding more graph visualizations.
4. Add a circular/readable graph layout toggle if dense map readability remains an issue after real usage.
5. Revisit speaker correction only after testing multi-person meeting transcripts.
