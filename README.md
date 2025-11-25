# Project Mapper (ProMap)

Living, collaborative workspace where AI maintains project intelligence.

## What This Is

An evolution from one-shot conversation processing to persistent, collaborative project spaces where AI continuously updates action items, knowledge graphs, and summaries as you work.

**Core Features:**

- Audio/text upload and transcription
- AI-powered action items with auto-checkoff
- Topic knowledge graphs with multiple visualizations
- Real-time multiplayer collaboration (PartyKit)
- Persistent project storage (Supabase)
- Export to multiple formats

## Tech Stack

- **Framework**: SvelteKit 2 with TypeScript
- **AI**: Google Gemini 2.0 (official SDK)
- **Real-time**: PartyKit for multiplayer
- **Database**: Supabase for persistence
- **Styling**: Tailwind CSS (no DaisyUI - keep it clean)
- **Deployment**: Vercel

## Architecture

Built on a "nervous system" pattern:

- `/src/lib/core/` - Framework-agnostic TypeScript (portable)
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
```

## Project Status

Currently scaffolding. See `SYNTHESIS_NOTES.md` for design decisions and learnings from v1 (SvelteKit) and v2 (Fresh/Deno).

## Reference Implementations

- `conversation_mapper_fresh/` - Clean architecture, portable core (reference this)
- `conversation_mapper/` - Feature implementations (use as reference only)
- `talktype/` - Clean API patterns with official Gemini SDK

---

Built with compression > complexity 🎸
