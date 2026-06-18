# Project Mapper / ProMapper

Living, collaborative workspace where AI maintains project intelligence.

## What This Is

An evolution from one-shot conversation processing to persistent, collaborative project spaces where AI continuously updates action items, knowledge graphs, and summaries as you work.

**Core Features:**

- Audio/text upload and transcription
- AI-powered action items with auto-checkoff
- Topic knowledge graphs with multiple visualizations
- Real-time multiplayer collaboration (PartyKit)
- Browser-local project history with explicit Supabase sharing
- Export to multiple formats

## Tech Stack

- **Framework**: SvelteKit 2 with TypeScript
- **AI**: Google Gemini 2.5 Flash (official SDK)
- **Real-time & Persistence**: PartyKit Durable Storage (Cloudflare Durable Objects) on the edge
- **Database (Optional)**: Supabase for optional backup
- **Styling**: Tailwind CSS (no DaisyUI - keep it clean)
- **Deployment**: Node server via `@sveltejs/adapter-node`

## Architecture

Built on a "nervous system" pattern:

- `/src/lib/core/` - Framework-agnostic TypeScript (portable)
- `/src/lib/client/` - Browser/API helpers that are not pure core logic
- `/src/lib/server/` - Server-only guards, Gemini setup, Supabase service client, and PartyKit update posting
- `/src/routes/` - SvelteKit pages and API routes
- `/src/lib/components/` - Svelte UI components

The core logic can be ported to any framework. The UI is just the body.

## Development

```bash
# Install dependencies
npm install

# Copy .env.example to .env and add your keys
cp .env.example .env

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run production build locally
node build/index.js
```

## Runtime Reality

This repo is the current SvelteKit implementation.

The Deno/Fresh exploration happened in the broader Conversation Mapper lineage and reference folders, but `project_mapper` itself is not a Deno app. It is a SvelteKit + TypeScript app with PartyKit and Supabase.

Current production output is the Node adapter build in `build/`, which makes it suitable for Pi or other small-server deploys without Vercel.

## Project Status

This is beyond scaffolding. The current state already includes:

- audio/text ingestion
- Gemini-powered analysis
- streaming updates over PartyKit
- local-first project history with explicit public-by-link Supabase sharing
- editable project-aware markdown export
- a responsive dashboard with transcript, summary, action items, and topic graph views

See `ARCHITECTURE.md` for the current system map, `docs/audits/INDEPENDENT_AUDIT_2026.md` for the latest independent audit, `GLOSSARY.md` for project vocabulary, and `docs/README.md` for the documentation index. Older handoff and synthesis notes live under `docs/history/`.

## Lineage / References

- `conversation_mapper/` - earlier feature-rich branch with recovery/refactor history
- `conversation_mapper_fresh/` - Fresh/Deno experiment and architectural reference
- `talktype/` - clean Gemini/audio API patterns that informed the server-side simplification here

---

Built with compression > complexity 🎸
