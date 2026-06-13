# Phase 5: Integration & Game Loop

## Scope
All of Phase 5 from SPEC.md. Single subagent task — coarse grain. This is the central wiring task: `+page.svelte` connects all 10 UI components, 6 lib modules, and 3 API endpoints into the complete game loop.

## Prerequisites
- Phase 3 complete: all lib modules (stores, api, speech, game, storage)
- Phases 4a+4b complete: all 10 Svelte components
- `src/routes/+page.svelte` exists as a placeholder from Phase 1

## State Machine

The game operates on a finite state machine with these states:

```
variant-select  →  loading  →  playing  →  checking  →  (playing | wrong | game-over)
                                                           ↑         |
                                                           └─────────┘ (after shake animation)
```

### State Definitions

| State | UI Visible | User Can Interact |
|-------|-----------|-------------------|
| `variant-select` | VariantSelect | Select variant, click Start |
| `loading` | Definition area shows spinner/skeleton | Nothing (waiting for API) |
| `playing` | DefinitionDisplay, PronounceButton, SpellingInput, ScoreBoard, TierIndicator | Pronounce, type, Enter |
| `checking` | Input disabled, subtle loading on check button | Nothing (waiting for API) |
| `wrong` | Same as playing but input has red border, "Try again — one attempt remaining" text | Type and Enter (second attempt) |
| `game-over` | Game screen underneath, GameOverScreen overlay on top | View results, click Play Again, report word |

### State Transitions

```
variant-select  →
  Start clicked → load first word → loading → word received → playing

playing →
  Enter pressed  → POST /api/check → checking →
    correct (attempt 1)  → calculate score, ++streak, check tier, load next word → loading
    correct (attempt 2)  → calculate half score, ++streak, check tier, load next word → loading
    wrong (attempt 1)    → show shake, increment attempt counter → wrong
    wrong (attempt 2)    → show shake → game-over

wrong →
  Enter pressed → POST /api/check → checking →
    correct (attempt 2) → calculate half score, ++streak, check tier, load next word → loading
    wrong (attempt 2)   → show shake → game-over

game-over →
  Play Again clicked → reset all session state → variant-select
```

## Key Behaviours to Implement

### Word Loading
On each transition to `loading`:
1. Call `getTierFromStreak($streak)` to get current tier
2. Look up tier config for `lengthMin`, `lengthMax`, `maxObscurity`
3. Build `played_ids` string from `$playedIds` set
4. Call `fetchWord({ variant: $variant, length_min, length_max, max_obscurity, played_ids })`
5. On success: set `$currentWord`, transition to `playing`
6. On 404 (pool exhausted): show "You've mastered all available words!" → game-over variant
7. On error: show error toast, retry button

### Spell Check
On Enter in `playing` or `wrong` state:
1. Transition to `checking`
2. Call `checkSpelling({ id: $currentWord.id, spelling: userInput, attempt: $currentAttempt })`
3. On correct:
   - Calculate score: `calculateScore(word.obscurity, word.length, $currentTier, $currentAttempt)` — NOTE: we need obscurity and length. These must be stored alongside the word. Either:
     - Include them in the `/api/word` response (modify word.ts to add `_obscurity` and `_length` fields)
     - OR store them in the frontend from the tier config
   - **PREFERRED**: Modify `functions/api/word.ts` to also return `_obscurity: number` and `_length: number` in the response. Update `api.ts` WordResponse type.
   
   - Update `$sessionScore` by adding calculated points
   - Add word ID to `$playedIds`
   - Increment `$streak`
   - Check if tier increased: `getTierFromStreak($streak)` vs `$currentTier`
   - If tier-up: set `$currentTier`, show tier-up animation (set `tierAnimating` flag briefly)
   - Evaluate achievements: call `evaluateAchievements($achievements, context)`
   - If new achievements: push to achievements queue for toast display
   - Reset `$currentAttempt` to 1
   - Clear input
   - Load next word → `loading`

4. On wrong, attempt 1:
   - Set `$currentAttempt` to 2
   - Set `$gameState` to `wrong`
   - Trigger shake animation on SpellingInput

5. On wrong, attempt 2:
   - Set `$gameState` to `game-over`
   - Compare sessionScore to highScore, update if beaten
   - Set `isNewHighScore` flag if applicable

### Game Over
1. Show GameOverScreen with:
   - `answer` from API response
   - `sessionScore` from store
   - `highScore` from store (may have just been updated)
   - `isNewHighScore` flag
   - `rank` from `getRank(sessionScore)`
   - `newAchievements` — list unlocked this session
2. On "Play Again":
   - Reset `$sessionScore = 0`
   - Reset `$streak = 0`
   - Reset `$currentTier = 1`
   - Reset `$playedIds = new Set()`
   - Reset `$currentAttempt = 1`
   - Reset `$currentWord = null`
   - Set `$gameState = 'variant-select'`

### Additional UI Elements
- **Settings gear ⚙ icon** in top corner of game screen → opens SettingsSheet
- **Achievement toast queue**: if multiple achievements unlock in rapid succession, queue them and show sequentially (each one dismisses after 3s before next appears)
- **Loading states**: show a subtle spinner or skeleton when in `loading` state
- **Error handling**: if any API call fails, show a toast "Something went wrong. Try again?" with a retry button

## API Update Required

The `/api/word` endpoint currently returns `{ id, definition, _spelling }`. It must ALSO return `_obscurity` and `_length` so the frontend can calculate scores without a second query. 

Modify `functions/api/word.ts`:
- Add `obscurity AS _obscurity` and `length AS _length` to the SELECT
- Include them in the JSON response
- Update `src/lib/api.ts` `WordResponse` interface to include `_obscurity: number` and `_length: number`

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| API returns 404 (pool exhausted) | Show congratulations screen variant of game-over |
| API network error / 500 | Show error toast with retry |
| User refreshes mid-game | Session state lost (acceptable for v1). Game returns to variant-select. |
| Browser doesn't support speechSynthesis | PronounceButton shows disabled with tooltip |
| localStorage quota exceeded | Catch on persist, show warning toast, continue with in-memory only |
| Empty played_ids param | Skip exclusion clause (API already handles this) |
| Rapid double-Enter | Disable input during `checking` state to prevent double-submit |
| All words at max tier played | 404 handled gracefully |

## Acceptance Criteria
- [ ] Complete game playable: variant select → pronounce → spell → score → repeat → game over → play again
- [ ] Two-attempt mechanic works: wrong first → "try again" → wrong second → game over with answer
- [ ] Scoring formula produces correct points
- [ ] Tier progression works: streak triggers tier-up animation, word pool changes
- [ ] Achievements unlock in real-time with toast notifications
- [ ] High score persists and updates on game over with new record
- [ ] Report sheet opens from definition and game-over screens
- [ ] Settings sheet allows variant change, export, import, reset
- [ ] Red shake animation fires on wrong answer
- [ ] Confetti fires on new high score
- [ ] All edge cases handled (exhausted pool, API errors, double-submit, etc.)
- [ ] Mobile-first — game is fully playable at 375px width
- [ ] `npm run build` succeeds with 0 errors

## Constraints
- Only modify: `src/routes/+page.svelte`, `functions/api/word.ts`, `src/lib/api.ts`
- Do NOT modify any other component files — they are complete and correct
- Do NOT introduce new npm dependencies
- Keep the page component as the single source of truth for game flow
