# Glossary

Last updated: 2026-05-27

- **Project Mapper / ProMapper**: This app. The repo is `project_mapper`; the product name appears as ProMapper in the UI.
- **Project**: The active workspace object: title, transcript, summary, action items, topic nodes, topic edges, and sync setting.
- **ConversationData**: The client-side project shape defined in `src/lib/core/types/project.ts`.
- **Nervous system**: Local shorthand for framework-agnostic core logic in `src/lib/core`.
- **Capture**: Starting input from pasted text, uploaded audio, or microphone recording.
- **Append**: Adding new audio to an existing project. The append route merges transcript, action items, topics, and edges.
- **Action item**: A task extracted from the conversation, with optional assignee, due date, status, sort order, and AI checkoff metadata.
- **AI checkoff**: Gemini reviewing new input against existing action items and marking matching items pending or completed.
- **Topic graph**: Topic nodes and relationship edges extracted from transcript text.
- **Topic selection**: Shared local and remote hover/selection state in `src/lib/stores/topicSelection.ts`.
- **PartyKit**: Realtime transport for presence, topic hover/selection, and analysis updates. It is not durable storage.
- **Party room**: A PartyKit room keyed by project id.
- **PARTYKIT_UPDATE_TOKEN**: Optional shared secret for server-posted PartyKit room updates.
- **Supabase sync**: Optional client-side persistence to the `projects` table. Current RLS is anonymous/demo-oriented, not private-production ownership.
- **Local-first**: The current project is always saved to browser localStorage first.
- **Share-by-id**: The effective current behavior for synced projects: anyone who can access the id and anon policies can interact. This is not private auth.
- **Last-write-wins**: Current conflict behavior across local edits, PartyKit updates, and Supabase debounce.
- **Manual release check**: A validation item requiring real browser/device/deployed services, such as microphone permission behavior or live PartyKit/Supabase sync.
