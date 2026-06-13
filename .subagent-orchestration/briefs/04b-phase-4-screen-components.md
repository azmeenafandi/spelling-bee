# Phase 4b: Screen & Overlay Components

## Scope
Second half of Phase 4 from SPEC.md. Single subagent task — medium grain (5 Svelte components). These are the full-screen views and overlay/bottom-sheet components.

## Prerequisites
- Phase 3 complete: all lib modules exist
- Phase 4a complete: core game components exist
- `src/components/` has 5 existing Svelte files

## Component Specifications

### 4.6 `VariantSelect.svelte`
**Props**: none (reads from `$variant` store)

**Behaviour**:
- Full-screen view shown before game starts
- App title: "Spelling Bee" (large, bold, centred)
- Subtitle: "Choose your spelling rules" (smaller, grey)
- Two large, tappable cards side by side:
  - "British English 🇬🇧" — sets `$variant = 'british'`
  - "American English 🇺🇸" — sets `$variant = 'american'`
- Debounce the store write slightly (50ms) to prevent double-tap issues
- Selected variant has a highlight border/glow
- "Start Game" button below the cards — only enabled after a variant is selected
- Clicking "Start Game" dispatches `start` event
- Animates out when game begins (optional, nice-to-have)

### 4.7 `GameOverScreen.svelte`
**Props**:
- `sessionScore: number` — final score for this game
- `highScore: number` — all-time high score (may have just been updated)
- `isNewHighScore: boolean` — true if sessionScore just beat the previous high score
- `answer: string` — the correct spelling of the word that ended the game
- `rank: { title: string; emoji: string }` — rank achieved
- `newAchievements: Array<{ key: string; name: string; emoji: string }>` — achievements unlocked this session

**Behaviour**:
- Overlay that slides/fades in over the game screen
- "Game Over" heading
- "The word was: **{answer}**" — the only place the spelling is displayed to the user
- 🚩 flag icon next to the revealed word (dispatches `report` event with wordId prop — parent passes the ID)
- Final score display: "{sessionScore} points"
- If `isNewHighScore`: confetti effect + "🏆 NEW HIGH SCORE!" banner
- If not: "Best: {highScore} — you were {highScore - sessionScore} points short"
- Rank earned: "{emoji} {title}"
- List of new achievements unlocked (if any): icon + name, each on its own line
- "Play Again" button — dispatches `restart` event
- Stats summary (nice-to-have): words spelled, accuracy, longest streak

### 4.8 `AchievementToast.svelte`
**Props**:
- `achievement: { key: string; name: string; emoji: string } | null` — achievement to display, null = hidden

**Behaviour**:
- Slides in from the top of the screen
- Shows emoji + achievement name
- Auto-dismisses after 3 seconds (use `onMount` + `setTimeout`)
- If a new achievement arrives while one is showing: dismiss current, show new one (restart timer)
- Subtle background, rounded corners, positioned fixed at top-centre
- `slide` transition from Svelte on enter/exit

### 4.9 `ReportSheet.svelte`
**Props**:
- `wordId: number` — the word being reported
- `open: boolean` — controls visibility

**Behaviour**:
- Bottom sheet that slides up from the bottom of the viewport
- Backdrop overlay that dims the background (clicking it closes the sheet)
- "Report an issue with this word" heading
- Radio button group for reason:
  - Incorrect spelling
  - Incorrect definition
  - Wrong variant (should be British / American)
  - Other
- Optional text area for note: "What's wrong? (optional)"
- "Cancel" and "Submit" buttons
- On submit: calls `reportIssue()` from `$lib/api`, shows brief "Thank you" confirmation toast, closes sheet
- On error: shows error message inline, keeps sheet open
- Closes on backdrop click or Cancel
- Dispatches `close` event
- Uses Svelte `slide` transition for the sheet, `fade` for backdrop

### 4.10 `SettingsSheet.svelte`
**Props**:
- `open: boolean` — controls visibility

**Behaviour**:
- Similar bottom sheet pattern as ReportSheet
- "Settings" heading
- "Variant: British English / American English" — toggle/switch (updates `$variant` store)
- "Export Data" button — calls `exportData()` from `$lib/storage`, creates a Blob, triggers download of `spelling-bee-data.json`
- "Import Data" button — opens file picker (`<input type="file" accept=".json">`), reads file, calls `importData()`, shows success/error toast
- "Reset All Data" button (danger style, red) — with confirmation dialog: "This will delete your high score and achievements. Are you sure?"
- Closes on backdrop click or a close button (✕ in top-right)
- Dispatches `close` event

## Shared Patterns

Same as Phase 4a:
- TypeScript in `<script lang="ts">`
- CSS custom properties from `app.css`
- Scoped styles
- `createEventDispatcher` for parent communication
- Mobile-first design

## Acceptance Criteria
- [ ] VariantSelect shows two variant cards, persists selection, enables Start button
- [ ] GameOverScreen shows answer, score comparison, confetti on new high score, achievements list
- [ ] AchievementToast slides in, auto-dismisses after 3s, handles rapid successive unlocks
- [ ] ReportSheet validates reason before submit, calls API, shows confirmation
- [ ] SettingsSheet exports valid JSON file, imports from file, has reset with confirmation
- [ ] All bottom sheets have working backdrop-close behaviour
- [ ] All transitions are smooth on mobile (test mental model at 375px)
- [ ] No store mutations outside of VariantSelect and SettingsSheet (which are allowed to write)

## Constraints
- Do NOT modify `src/lib/` files
- Do NOT create `+page.svelte` — that's Phase 5
- Do NOT modify Phase 4a components
- Each component file goes in `src/components/`
- Use `$variant` store directly in VariantSelect and SettingsSheet (they're screen-level, this is acceptable)
- Other components should NOT import stores directly — receive data as props
