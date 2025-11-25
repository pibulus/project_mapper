# Project Mapper (ProMap) - Synthesis Notes

_Reference document for building a modular AI workspace platform_

---

## What This Document Is

A collection of learnings from building two versions of conversation processing tools (SvelteKit → Fresh/Deno), now evolved into a broader vision: **a modular workspace platform where AI maintains living project intelligence**.

Use this as reference material, not rigid requirements.

**Make wise decisions. Avoid complexity theatre. Build modular.**

---

## What Project Mapper Actually Is

**Not:** A one-shot conversation transcription tool
**Actually:** A living, collaborative workspace where projects evolve through AI

**Core concept:**

- Start a project space
- Append audio/notes/artifacts over time
- AI continuously updates action items, knowledge graph, summaries
- Export docs/PDFs whenever needed
- Real-time multiplayer collaboration (PartyKit)
- Modular plugin system (radio, notes, custom community modules)

**Think:** Notion meets Linear meets Obsidian meets real-time AI

---

## The Two Reference Codebases

### `~/Projects/active/apps/conversation_mapper/` - SvelteKit v1

**What worked:**

- Card aesthetics felt good (subjective, but note what you like)
- Svelte's reactivity patterns for complex state
- Some feature implementations are solid bones

**What didn't:**

- Drag-and-drop library caused glitches
- No clear architecture (services calling services calling services)
- 373-line components doing too much
- Possibly DaisyUI got in the way? (added complexity without clear wins)
- Tech debt accumulated

**Useful for:**

- Reference implementations of features
- Seeing what Svelte patterns felt natural
- UI interactions that worked

---

### `~/Projects/active/apps/conversation_mapper_fresh/` - Fresh/Deno v2

**What worked:**

- `/core/` nervous system (1,903 lines of portable TypeScript)
- Clean component separation (DashboardIsland = 66 lines, just coordinates)
- Mobile-first layout using CSS Grid (no drag-drop library)
- Good documentation (ARCHITECTURE.md, GLOSSARY.md, WHAT_IS_THIS.md)
- TypeScript throughout
- Clear boundaries between business logic and UI

**What's framework-specific:**

- Manual HTTP multipart for Gemini (454 lines) - unnecessary in Node/SvelteKit
- Preact signals for state - SvelteKit has built-in reactivity
- TSX components - would be more concise as Svelte

**Useful for:**

- The entire `/core/` folder (copy as-is)
- Component structure patterns
- Documentation standards
- TypeScript type definitions

---

## The Golden Path: SvelteKit for Modular Platform

**Why SvelteKit:**

- Official `@google/generative-ai` SDK works perfectly (proven in TalkType)
- Svelte's reactivity is cleaner than signals for this use case
- **Perfect for plugin architecture** - community can write Svelte components easily
- Better component ergonomics for complex state
- Lighter bundles than React/Preact (important when loading many modules)
- Familiar deployment (Vercel/Netlify)
- Rich ecosystem for D3, audio, collaborative editing, etc.

**What to carry forward:**

- `/core/` nervous system (framework-agnostic, just works)
- Clean component separation (< 150 lines per file ideal)
- Mobile-first CSS Grid layout (no drag-drop library)
- TypeScript throughout
- Documentation as you build

**New for modular platform:**

- Plugin/module registry system
- PartyKit integration for real-time multiplayer
- Persistent project spaces (not one-shot processing)
- Module communication patterns

---

## Core Principles (Not Rules)

### 1. The Nervous System Pattern

Business logic lives in `/src/lib/core/` with zero framework dependencies:

```
/src/lib/core/
├── ai/          # Gemini prompts and service wrapper
├── types/       # TypeScript definitions
├── orchestration/  # Parallel processing flows
├── export/      # Format transformers
├── storage/     # Persistence helpers (localStorage, PartyKit sync)
└── modules/     # Module registry and communication system
```

This folder can be copied to any framework (React, Vue, CLI) and just work.

**For modular platform:**

- Core provides APIs that modules consume
- Modules are self-contained Svelte components
- Communication via stores/events (loosely coupled)

### 2. Components Do One Thing

- Cards present data, don't fetch it
- Islands/pages coordinate and fetch
- Services live in `/core/`, not scattered through components
- If a component hits 200 lines, consider splitting

### 3. Avoid Library Bloat

- CSS Grid > drag-drop library (it glitched anyway)
- Vanilla JS > heavy abstractions when possible
- TailwindCSS? DaisyUI? Only if it actually helps
- Question every dependency

### 4. Server-Side API Pattern

Learn from TalkType:

```javascript
// src/routes/api/transcribe/+server.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "$env/static/private";

export async function POST({ request }) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  // Official SDK handles everything, ~20 lines total
}
```

No manual HTTP multipart needed. The SDK just works in Node.

### 5. State Management

Svelte's reactivity + stores are enough:

```svelte
<script>
  import { writable } from 'svelte/store';
  const conversation = writable(null);

  // Update
  $conversation = { ...$conversation, transcript: newText };
</script>
```

No signals library needed. Keep it simple.

---

## Known Pain Points to Avoid

### From SvelteKit v1:

- **Drag-drop glitching**: Just use CSS Grid with `grid-template-areas` for card layout
- **Mega components**: ConversationView.svelte was 373 lines doing everything
- **Service sprawl**: 7 different services importing each other
- **No types**: JavaScript with JSDoc isn't enough for complex state
- **DaisyUI confusion?**: Added components but maybe created more questions than answers

### From Fresh/Deno v2:

- **Manual HTTP**: Handcrafted multipart is 134 lines that can be deleted with official SDK
- **Over-engineering**: 454 lines for Gemini integration vs 20 with SDK
- **Framework lock-in**: TSX is more verbose than Svelte for stateful UI

---

## Core Modules (Built-in)

**These modules ship with Project Mapper:**

1. **Audio Module** - Recording and upload
2. **Transcript Card** - Speaker-labeled transcription
3. **Action Items Card** - AI auto-checkoff, assignees, due dates
4. **Topic Graph Card** - Multiple visualization types (force-directed, circular, arc diagram)
5. **Summary Card** - AI-generated project overview
6. **Export Drawer** - Transform to blog/manual/PDF/haiku
7. **Share Module** - URL compression, public/private spaces

**Planned Modules:**

8. **Radio Module** - Background streaming (SomaFM Groove Salad, etc.)
   - Simple audio player
   - Station selector
   - Presence indicator (who's listening)

9. **Notes Module** - Collaborative rich text
   - Simple editor (TipTap or Milkdown)
   - AI memory (context from project graph)
   - Link to action items
   - PartyKit real-time sync

10. **Future Community Modules** - Plugin system
    - Kanban boards
    - Calendar/timeline
    - File uploads
    - Chat/comments
    - Screen recording
    - Pomodoro timer
    - Whatever people build

**Look at both implementations to see:**

- What code is essential vs accidental complexity
- Where Fresh/Deno simplified things
- Where SvelteKit patterns felt more natural
- What can be deleted entirely

---

## The Layout Question

**Old approach:** Drag-drop library (glitchy, complex)

**Fresh approach:** CSS Grid with fixed layout

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
```

**Consider for v3:**

- Start with simple CSS Grid
- Make cards responsive (mobile → tablet → desktop)
- Only add drag-drop if it's genuinely needed and can be done cleanly
- Users don't care if cards move, they care if the app works

---

## Component Aesthetics

**Don't be dogmatic about recreating old designs.**

Things to consider:

- Cards should feel cohesive but not identical
- Whitespace and breathing room matter
- Dark mode vs light mode (or both?)
- Icons and emojis for visual hierarchy
- Clean typography hierarchy

**Look at both versions for inspiration**, but design fresh. What matters:

- Visual clarity
- Information hierarchy
- Responsive on mobile
- Fast to scan

**DaisyUI:** Used in SvelteKit v1. Maybe it added cognitive load? Consider vanilla Tailwind or custom components instead. Question whether preset components actually save time.

---

## What Success Looks Like

**For Project Mapper, success is:**

- Works beautifully on desktop and mobile
- Core platform < 3,000 lines (down from 6,000+)
- Official SDK eliminates manual HTTP
- **Modules are easy to write** (community can contribute)
- Adding modules doesn't break existing ones
- The nervous system (`/core/`) stays framework-agnostic
- Real-time multiplayer works smoothly (PartyKit)
- Projects persist and evolve over time
- You can hand it off to any developer and they get it quickly

**Not success:**

- Perfect drag-drop (nice to have, not essential)
- Pixel-perfect recreation of old designs (evolve, don't copy)
- Every possible module shipped day one (build core, enable community)
- Complexity theatre (using libraries because they exist)

**The vision:**

- Modular AI workspace people want to use daily
- Plugin ecosystem emerges (community builds modules)
- Multiplayer collaboration feels natural
- Projects become living artifacts that evolve with your work

---

## Gemini Integration Pattern

**The official SDK way (from TalkType):**

```javascript
// Server-side only
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// For text + audio
const result = await model.generateContent([
  { text: prompt },
  { inlineData: { data: base64Audio, mimeType: "audio/webm" } },
]);
```

That's it. No multipart boundaries, no manual HTTP, no 134-line upload functions.

**For audio files:**

```javascript
const formData = await request.formData();
const audioFile = formData.get("audio");
const arrayBuffer = await audioFile.arrayBuffer();
const base64 = Buffer.from(arrayBuffer).toString("base64");
```

Simple. Works. Proven.

---

## TypeScript Strategy

**Use TypeScript for:**

- `/core/` modules (already done)
- Component props
- API request/response shapes
- Store types

**Don't overthink it:**

- `any` is fine when prototyping
- Add types when patterns emerge
- Type errors shouldn't block progress

The Fresh/Deno version has excellent type definitions in `/core/types/`. Use those.

---

## Documentation as Code

**Keep these files updated:**

- `ARCHITECTURE.md` - High-level patterns
- `GLOSSARY.md` - Component/route reference
- `README.md` - Setup and usage

Good documentation makes handoff easier (even if handoff is to future-you).

---

## Build Strategy

**Phase 1: Foundation**

1. Create SvelteKit project
2. Copy `/core/` from Fresh version (it's portable)
3. Set up API routes with official SDK
4. Basic page structure with module slots

**Phase 2: Core Modules**

1. Port audio upload → transcription
2. Action items card with AI checkoff
3. Topic graph visualization
4. Export drawer
5. Test each module works independently

**Phase 3: Module System**

1. Create module registry
2. Build radio module (simple audio streaming)
3. Build notes module (rich text with AI context)
4. Define plugin API for community modules

**Phase 4: Multiplayer**

1. Integrate PartyKit
2. Real-time presence indicators
3. Collaborative editing in notes
4. Sync action item updates

**Phase 5: Polish**

1. Component aesthetics
2. Mobile responsiveness
3. Edge case handling
4. Documentation for module authors

**Don't do everything at once.** Ship working increments. Core first, then modules, then multiplayer.

---

## Questions for the AI/Model Building This

When an LLM reads this document to build v3, here are good questions to think about:

**Architecture:**

- Does each component have a single clear purpose?
- Is business logic in `/core/` or leaking into components?
- Are API routes thin coordinators or bloated?

**Complexity:**

- Am I adding a library that's heavier than hand-rolling the feature?
- Would vanilla CSS/JS work here?
- Is this solving a real problem or complexity theatre?

**Code Quality:**

- Can another developer understand this file in < 5 minutes?
- Are the types helping or just ceremony?
- Would I be proud to show this code?

**User Experience:**

- Does this work on mobile?
- Is the happy path obvious?
- Do error states make sense?

---

## Key Files to Reference

**From Fresh/Deno:**

- `/core/` - entire folder (port as-is)
- `ARCHITECTURE.md` - nervous system explanation
- `GLOSSARY.md` - feature map
- `services/ai.ts` - shows SDK integration pattern
- `routes/api/process.ts` - parallel processing example
- `components/*.tsx` - component separation pattern

**From SvelteKit v1:**

- `src/lib/features/conversation/components/` - UI implementations
- `src/lib/features/conversation/services/geminiService.js` - simple SDK usage
- Look at what features exist and how they were built

**From TalkType (SvelteKit reference):**

- `src/routes/api/transcribe/+server.js` - clean API pattern
- `src/lib/services/` - service organization
- Overall project structure

---

## Final Thoughts

**This isn't a spec. It's a map.**

You have two implementations that work. Both have strengths. Both have cruft.

The goal isn't to merge them literally - it's to synthesize what you learned:

- Nervous system architecture (from Fresh)
- Svelte ergonomics (from experience)
- Official SDK simplicity (from TalkType)
- Less complexity theatre (from both painful experiences)

**Plus evolve the vision:**

- One-shot processing → living project workspace
- Solo tool → real-time multiplayer
- Fixed features → modular plugin system
- Static output → evolving intelligence

**Build something you'd be proud to show another developer.** Not because it's perfect, but because it's clear, working, and maintainable.

**Build something people want to use every day.**

---

## Quick Module Architecture Reference

**How modules work:**

```svelte
<!-- src/lib/modules/RadioModule.svelte -->
<script>
  import { projectContext } from '$lib/core/modules/registry';

  // Access core services
  const { aiService, storage, presence } = projectContext;

  // Your module logic
  let currentStation = 'groove-salad';
  let isPlaying = false;
</script>

<div class="radio-module">
  <!-- Your UI -->
</div>
```

**Module registration:**

```javascript
// src/lib/core/modules/registry.js
export const modules = {
  radio: RadioModule,
  notes: NotesModule,
  transcript: TranscriptCard,
  // Community modules can register here
};
```

**PartyKit integration:**

```typescript
// src/lib/party/projectRoom.ts
export default class ProjectRoom implements Party.Server {
  onMessage(message: string) {
    // Broadcast updates to all connected users
    this.broadcast(message);
  }
}
```

Simple patterns. Loosely coupled. Easy to extend.

---

_Reference material compiled by Claude Code on 2025-11-23_
_Evolved from conversation_mapper to project_mapper (ProMap)_
_Good luck, future AI (or Pablo). Build something alive. 🦕 → 🎸_
