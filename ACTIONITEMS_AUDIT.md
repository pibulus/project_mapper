# Action Items Component Audit

**Comparing:** project_mapper vs conversation_mapper vs conversation_mapper_fresh

---

## 📊 Feature Comparison Matrix

| Feature                    | project_mapper (SvelteKit)        | conversation_mapper (SvelteKit)    | conversation_mapper_fresh (Deno/Fresh) |
| -------------------------- | --------------------------------- | ---------------------------------- | -------------------------------------- |
| **Core CRUD**              | ✅ Full                           | ✅ Full                            | ✅ Full                                |
| **Drag & Drop Reordering** | ✅ Yes                            | ✅ Yes                             | ✅ Yes                                 |
| **Inline Editing**         | ✅ contenteditable + blur         | ✅ contenteditable + blur          | ✅ Double-click modal                  |
| **Search/Filter**          | ✅ Yes                            | ✅ Yes                             | ✅ Yes                                 |
| **Sorting Modes**          | ✅ 3 modes (manual/assignee/time) | ✅ 3 modes (manual/assignee/time)  | ✅ 3 modes (manual/assignee/date)      |
| **Assignee Selection**     | ⚠️ Basic inline input             | ✅ Dropdown with speaker detection | ✅ Dropdown with common names          |
| **Due Date Picker**        | ✅ Native date input              | ✅ Hidden input + custom trigger   | ✅ Hidden input + custom trigger       |
| **Markdown Support**       | ✅ marked.js rendering            | ✅ marked.js rendering             | ❌ Plain text only                     |
| **Status Toggle**          | ✅ Checkbox                       | ✅ Checkbox                        | ✅ Checkbox                            |
| **Delete**                 | ✅ Hover delete button            | ✅ Absolute positioned delete      | ✅ Absolute positioned + confirm       |
| **Empty State**            | ✅ Utility class                  | ✅ Custom with add button          | ✅ Custom styling                      |
| **Real-time Sync**         | ❌ Not implemented                | ✅ **LIVE MODE** (Supabase RT)     | ❌ Not implemented                     |
| **Collaborative Presence** | ❌ No                             | ✅ Active users indicator          | ❌ No                                  |
| **Share Feature**          | ❌ No                             | ✅ Generate shareable link         | ❌ No                                  |
| **Pending Operations UI**  | ❌ No                             | ✅ Optimistic updates + status     | ❌ No                                  |
| **Keyboard Navigation**    | ⚠️ Partial (Enter/Esc in edit)    | ⚠️ Partial (Enter/Esc in edit)     | ✅ **Arrow keys + Enter**              |
| **Focus Management**       | ❌ No                             | ❌ No                              | ✅ Focus trap in modal                 |
| **A11y Attributes**        | ⚠️ Basic aria-label               | ⚠️ Basic aria-label                | ✅ Better (role, tabindex)             |
| **Visual Feedback**        | ✅ Drag opacity                   | ✅ Drag border + scale             | ✅ Drag opacity                        |
| **Stats Display**          | ✅ Completed/Total count          | ❌ No header stats                 | ❌ No header stats                     |

---

## 🏗️ Architecture Comparison

### project_mapper (Current)

**Structure:** Single component with dedicated store

```
ActionItemsCard.svelte → actionItemsStore.ts
- Store handles all CRUD + persistence
- Component is "dumb" - just UI
- Uses generic Card wrapper
```

**Pros:**

- ✅ Clean separation of concerns
- ✅ Consistent with other cards
- ✅ Uses utility CSS classes
- ✅ Modern signals-based store

**Cons:**

- ❌ No real-time capabilities
- ❌ No sharing features
- ❌ Limited keyboard nav

---

### conversation_mapper (Most Feature-Rich)

**Structure:** Component with multiple service layers + real-time

```
ActionItems.svelte
├── conversationService.ts (CRUD)
├── actionItemService.ts (DB)
├── realtimeService.ts (Supabase)
├── actionItemsStore.ts (Real-time state)
└── Sub-components:
    ├── ActionItemsHeader.svelte
    ├── AssigneeSelector.svelte
    ├── NewActionItemModal.svelte
    └── ShareActionItemsModal.svelte
```

**Pros:**

- ✅ **LIVE MODE** - Real-time collaboration
- ✅ Connection status indicators
- ✅ Optimistic UI updates
- ✅ Share functionality
- ✅ Modular sub-components
- ✅ Rich metadata display

**Cons:**

- ⚠️ High complexity (~970 lines)
- ⚠️ Tight coupling to services
- ⚠️ Harder to port to other projects

---

### conversation_mapper_fresh (Most Polished)

**Structure:** Single functional component with signals

```
ActionItemsCard.tsx
- Preact signals for state
- No external services
- Self-contained logic
```

**Pros:**

- ✅ **Best keyboard navigation** (Arrow keys!)
- ✅ Best accessibility (focus trap, roles)
- ✅ Confirmation dialogs
- ✅ Cleanest visual hierarchy
- ✅ Dropdown keyboard nav (arrows + enter)

**Cons:**

- ❌ No markdown support
- ❌ No real-time features
- ❌ Requires parent to handle persistence

---

## 🎯 Feature Gaps in project_mapper

### Missing from conversation_mapper:

1. **Real-time Collaboration** (LIVE MODE)
   - Supabase real-time subscriptions
   - Active users presence
   - Optimistic UI updates
   - Connection status indicators
   - Pending operations tracking

2. **Share Functionality**
   - Generate shareable link
   - Share modal
   - Copy URL to clipboard

3. **Enhanced Assignee Selector**
   - Dropdown with speaker detection
   - Populated from conversation context

4. **Sub-component Architecture**
   - ActionItemsHeader (reusable)
   - NewActionItemModal (separate)
   - ShareActionItemsModal

### Missing from conversation_mapper_fresh:

1. **Keyboard Navigation Excellence**
   - Arrow keys to navigate items
   - Enter to toggle completion
   - Arrow keys in dropdowns
   - Selected item highlighting

2. **Accessibility Features**
   - Focus trap in modals
   - Better ARIA attributes
   - Tab order management

3. **Confirmation Dialogs**
   - Delete confirmation
   - Better user protection

---

## 🏆 Winner by Category

| Category             | Winner                    | Reason                       |
| -------------------- | ------------------------- | ---------------------------- |
| **Features**         | conversation_mapper       | Real-time, sharing, presence |
| **Code Quality**     | project_mapper            | Clean architecture, DRY      |
| **UX/Polish**        | conversation_mapper_fresh | Keyboard nav, accessibility  |
| **Modularity**       | project_mapper            | Store pattern, Card wrapper  |
| **Performance**      | conversation_mapper_fresh | Signals, computed values     |
| **Enterprise Ready** | conversation_mapper       | Real-time + collaboration    |

---

## 💡 Recommendations for project_mapper

### High Priority (Must Have)

1. ✅ **Already Good:**
   - Clean store architecture
   - Utility CSS classes
   - Card component integration
   - Markdown support

2. ⚠️ **Should Add:**
   - Keyboard navigation (arrow keys)
   - Delete confirmation dialog
   - Focus trap in modal
   - Better ARIA attributes

### Medium Priority (Nice to Have)

3. **Consider Adding:**
   - Enhanced assignee dropdown (from conversation)
   - Sub-component split (header, modal)
   - Share functionality (if needed)

### Low Priority (Future)

4. **Advanced Features:**
   - Real-time collaboration (LIVE MODE)
   - Presence indicators
   - Optimistic UI updates
   - Connection status

---

## 📈 Scoring Summary

**project_mapper:** 7.5/10

- Strong foundation
- Clean code
- Missing some UX polish
- **Best for:** Single-user, offline-first

**conversation_mapper:** 9/10

- Most feature-complete
- Real-time ready
- High complexity
- **Best for:** Team collaboration

**conversation_mapper_fresh:** 8/10

- Best UX/accessibility
- Simplest code
- Limited features
- **Best for:** Polished prototypes

---

## 🎯 Action Plan

**Immediate Wins (1 hour):**

1. Add delete confirmation (`confirm()` dialog)
2. Add keyboard nav (ArrowUp/Down + Enter)
3. Add focus trap to new item form
4. Improve ARIA labels

**Quick Improvements (2-3 hours):** 5. Extract NewItemModal to separate component 6. Add assignee dropdown with better UX 7. Add visual indication of selected item 8. Add double-click to edit (vs click)

**Future Enhancements (if needed):** 9. Real-time collaboration (Supabase) 10. Share functionality 11. Presence indicators 12. Sub-component architecture

---

**Verdict:** project_mapper has a **solid foundation** with clean architecture. It's missing some **UX polish** from conversation_mapper_fresh and **collaboration features** from conversation_mapper, but it's well-positioned to add those incrementally.
