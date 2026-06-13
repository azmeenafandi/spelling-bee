# Phase 4a: Core Game Components

## Scope
First half of Phase 4 from SPEC.md. Single subagent task — medium grain (5 Svelte components). These are the components visible during active gameplay.

## Prerequisites
- Phase 3 complete: all lib modules exist (stores, api, speech, game, storage)
- `src/components/` directory exists (empty with .gitkeep)

## Component Specifications

### 4.1 `DefinitionDisplay.svelte`
**Props**:
- `definition: string` — the word's definition text
- `wordId: number` — the current word ID (passed to report flow)

**Behaviour**:
- Large, centred text displaying the definition
- Small 🚩 flag icon in the top-right corner of the definition card
- Clicking 🚩 dispatches a custom event: `createEventDispatcher()<{ report: number }>()` with `wordId`
- Card has subtle background (`var(--surface)`), padding, border-radius
- Empty state: when definition is empty string, show nothing (or a subtle loading state)

### 4.2 `PronounceButton.svelte`
**Props**:
- `spelling: string` — the word spelling (for TTS, never displayed)
- `lang: 'en-GB' | 'en-US'` — accent for speech synthesis
- `disabled: boolean` — disable button (during checking, game over, etc.)

**Behaviour**:
- Speaker icon (🔊) as button content
- On click: calls `speakWord(spelling, lang)` from `$lib/speech`
- While speaking: pulsing animation on icon, button slightly faded, `disabled` prop respected
- Emits `speaking` event when speech starts, `done` event when speech ends
- If `speechSynthesis` is unavailable: show button in disabled state with tooltip "Speech not supported"

### 4.3 `SpellingInput.svelte`
**Props**:
- `attempt: number` — current attempt (1 or 2), affects placeholder text
- `disabled: boolean` — disable during checking/game-over states
- `error: boolean` — triggers red shake animation when true

**Behaviour**:
- `<input type="text">` with `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`
- Placeholder: "Type your spelling..." (attempt 1) / "One more try..." (attempt 2)
- Enter key submits: dispatches `submit` event with `{ spelling: string }`
- Input is cleared after successful submit (parent resets it)
- Red shake animation via CSS `@keyframes shake` when `error` prop becomes true
- Auto-focuses on mount (use `bind:this` + `onMount`)
- Mobile-friendly: `font-size: 16px` minimum to prevent iOS zoom

### 4.4 `ScoreBoard.svelte`
**Props**:
- `sessionScore: number` — live session score
- `highScore: number` — all-time high score
- `rank: { title: string; emoji: string }` — current rank

**Behaviour**:
- Horizontal bar at top of game screen
- Left: "SCORE: 342" (large, bold)
- Centre: Rank emoji + title (e.g., "🎓 Scholar")
- Right: "BEST: 1247" (smaller, secondary colour)
- Score changes animate (CSS transition on the number, or a brief scale-up)
- Responsive: stacks vertically on very narrow screens

### 4.5 `TierIndicator.svelte`
**Props**:
- `tier: number` — current tier (1+)
- `streak: number` — current streak count
- `nextTierAt: number` — streak required for next tier
- `animating: boolean` — triggers tier-up animation

**Behaviour**:
- Shows "Tier {tier}" with a small progress bar (streak / nextTierAt × 100%)
- On tier-up (`animating` briefly true): brief shimmer/glow effect, text scales up then settles
- Progress bar uses `var(--primary)` colour
- At max tier (6): show "MAX TIER" with full progress bar and a crown icon (👑)
- Compact design — fits in a thin strip below the scoreboard

## Shared Patterns

All components:
- Use `<script lang="ts">` for TypeScript
- Import types/values from `$lib/stores`, `$lib/game`, `$lib/speech` as needed
- Use CSS scoped styles (`<style>` without global)
- Use CSS custom properties from `app.css` (var(--primary), var(--surface), etc.)
- Emit events via `createEventDispatcher` (not by mutating parent state directly)
- Respect `disabled` prop — no UI interaction when disabled

## Acceptance Criteria
- [ ] All 5 components render without errors in a SvelteKit dev server
- [ ] DefinitionDisplay shows 🚩 and emits report event on click
- [ ] PronounceButton calls speakWord and shows pulsing animation
- [ ] SpellingInput handles Enter key, clears on submit, shows shake on error
- [ ] ScoreBoard displays all three elements (score, rank, best) correctly
- [ ] TierIndicator shows progress bar, handles max tier, animates on tier-up
- [ ] All components are mobile-first (test at 375px viewport width)
- [ ] No hardcoded colours — all values from CSS custom properties

## Constraints
- Do NOT modify `src/lib/` files (they're complete and correct)
- Do NOT create `+page.svelte` — that's Phase 5
- Do NOT create screen-level components (VariantSelect, GameOverScreen) — those are Phase 4b
- Each component file goes in `src/components/`
