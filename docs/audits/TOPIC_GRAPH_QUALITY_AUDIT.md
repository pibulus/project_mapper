# Topic Graph Quality Audit

Last updated: 2026-05-27

This audit compares Project Mapper's current topic graph system with the older `conversation_mapper` and `conversation_mapper_fresh` implementations in the sibling app folders.

## Scope

- Current app: `project_mapper`
- Old Svelte ancestor: `../conversation_mapper`
- Fresh/Deno experiment: `../conversation_mapper_fresh`
- Focus: topic extraction quality, node/edge schema, emoji/color output, graph rendering, layout settings, and map UX.

## What Carried Forward

Project Mapper's current graph stack is mostly the cleaned-up Fresh lineage:

1. `src/lib/core/ai/prompts.ts` owns topic extraction instructions.
2. `src/lib/core/ai/gemini.ts` parses and normalizes Gemini topic JSON.
3. `src/routes/api/process/+server.ts` hydrates first-run topic nodes and edges into dashboard-ready records.
4. `src/routes/api/append/+server.ts` merges new topic graph output with existing topics and edges.
5. `src/lib/components/TopicGraphCard.svelte` owns the user-facing graph card, toolbar, badges, position persistence, and fullscreen state.
6. `src/lib/utils/forceDirectedEmojimap.ts` owns the D3 force simulation, emoji nodes, labels, zoom, drag, fit, and update lifecycle.

The older `conversation_mapper` had more visualization experiments, including circular, chord, radial tree, sunburst, and other graph views. Most were exploratory. The current app kept the strongest idea: the emoji force map as the primary emotional payoff.

## Comparison Notes

### Old Svelte `conversation_mapper`

Useful ideas:

- Had many graph experiments to compare interaction models.
- `CircularNetworkGraphVisualization.svelte` gave a more deterministic layout for small graphs.
- Topic service mapped Gemini node IDs to local UUIDs, which was safer for storage but bad for topic reuse across appends.
- Several docs already identified that the emojimap needed better separation of concerns and central config.

Problems inherited or observed:

- The topic prompt had typos and vague quality rules.
- It accepted generic topics too easily.
- The old placeholder `EmojimapViz.svelte` could show fake topic data, which hides real empty/failure states.
- Several visualizations were demo-heavy and not connected to the actual product story.
- Some graph components created global tooltips/portals manually and had cleanup risk.

### Fresh/Deno `conversation_mapper_fresh`

Useful ideas:

- Extracted core AI/prompt/type logic into portable modules.
- Centralized emojimap config and broke D3 code into helper functions.
- Introduced a better component boundary between card UI and graph rendering.

Problems:

- Prompt quality was still mostly copied from the old Svelte app.
- Default emojimap callbacks logged to console.
- Action item prompt still created fake "No action items" entries at that point.

### Current `project_mapper`

Stronger now:

- Topic graph rendering is real product UI, not a demo carousel.
- First-run `/api/process` now hydrates topics/edges into proper stored records.
- Append flow preserves existing nodes/edges and now passes existing relationships into the topic prompt.
- Empty topic states are honest.
- Emoji nodes, labels, fullscreen, fit/reset/export, persisted positions, hover/selection, and remote presence are all in one coherent surface.

Still weaker than the fantasy:

- There is only one graph view. That is fine for focus, but dense graphs may need alternate layouts later.
- The prompt/schema is still the main quality lever; without a valid Gemini key, map quality cannot be fully judged locally.
- Topic labels and relationships need fixture tests once API mocking exists.
- The force layout can still produce label overlap for larger maps.

## Fixes Applied In This Pass

- Rewrote the topic prompt around concrete map quality:
  - 5-12 specific topics for substantial conversations
  - 1-4 word concrete labels
  - stable kebab-case IDs
  - meaningful emoji
  - meaningful relationship edges
  - readable graph density
  - muted modern colors
- Added existing edge context to append topic extraction so Gemini can preserve or extend relationships, not just reuse nodes.
- Hardened topic normalization:
  - strips emoji out of labels
  - replaces placeholder IDs like `node1` with label slugs
  - deduplicates repeated labels
  - maps edges through normalized node IDs
  - rejects duplicate/self-loop/missing-node edges
  - normalizes invalid colors to a stable muted fallback palette
  - supplies fallback emoji from topic keywords
- Fixed `process-stream` argument order after adding edge context.

## Priority Findings

1. **Map quality mostly depends on prompt/schema discipline.**  
   The visualizer can make weak nodes look playful, but it cannot make generic topics meaningful. The prompt now pushes harder, and normalization catches more bad output.

2. **Current app is better than old Svelte for reuse and append.**  
   Old `conversation_mapper` remapped Gemini IDs to fresh UUIDs every time. That is storage-safe, but it fights ongoing project maps. Project Mapper's reuse path is the right product direction.

3. **Old circular graph is worth remembering, not restoring now.**  
   A circular layout reads better for 8-15 topics and could become a "Readable" mode later. The force emojimap should stay primary because it is more expressive.

4. **Emoji quality needs product-specific examples.**  
   The current prompt says "semantically meaningful", but examples matter. Future fixture tests should include weird science, product planning, and messy meeting transcripts.

5. **Graph UX needs visual QA with real AI output.**  
   Current local env has an invalid Gemini key, so this pass validates code paths, not actual node quality.

## Recommended Next Tests

Run these with a valid Gemini key:

1. Spidergoat rant: expect topics like `Spider Silk`, `Silk Yield`, `Animal Welfare`, `Public Backlash`, `Production Alternatives`, and `Regulation`, not generic "Science" and "Discussion".
2. Third meeting append: confirm existing topic IDs are reused and new edges attach to existing nodes.
3. One-node graph: verify the graph renders and fit works with zero edges.
4. Dense graph: verify 12 topics do not become unreadable on mobile.
5. Export: verify topic names and relationships appear in the markdown draft.

## Later Product Ideas

- Add a graph quality fixture harness that snapshots normalized topic JSON from canned transcripts.
- Add a "Readable layout" toggle using a deterministic circular or radial layout for dense maps.
- Add relationship labels/types once the UI can display them without clutter.
- Add topic merge/edit controls for humans to clean AI duplicates.
- Add a graph minimap or search when topic counts exceed about 15.
