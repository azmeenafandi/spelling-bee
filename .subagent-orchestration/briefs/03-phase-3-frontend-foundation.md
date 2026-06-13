# Phase 3: Frontend Foundation

## Scope
Tasks 3.1–3.6 from SPEC.md. Single subagent task — medium grain (6 lib files + CSS tokens, all TypeScript, no Svelte components).

## Prerequisites
- Phase 2 complete: API endpoints implemented
- `src/lib/` directory exists (empty with .gitkeep)
- `src/app.css` exists (empty)

## Deliverables

### 3.1 `src/app.css` — Design Tokens & Global Styles
Mobile-first CSS custom properties on `:root`:
- Colours: primary, secondary, success (green), error (red), warning (amber), background, surface, text-primary, text-secondary
- Typography: font-family (system stack), font-size scale (0.875rem–2rem), line-height
- Spacing scale: 0.25rem increments (4px–32px)
- Border-radius: 0.5rem
- Transitions: 200ms ease

Global resets: `box-sizing: border-box`, `margin: 0`, `padding: 0`.
Body: `font-family`, `background`, `color`, `min-height: 100dvh`.
`.app` container: `max-width: 480px`, `margin: 0 auto`, `padding: 1rem` (mobile-first — single column, capped width).

Utility classes if helpful — but keep it minimal. The design should be functional, not decorative.

### 3.2 `src/lib/stores.ts` — Svelte Writable Stores
Create and export the following writable stores:

```typescript
import { writable } from 'svelte/store';

// Variant: persisted to localStorage, default 'british'
export const variant = writable<'british' | 'american'>('british');

// High score: persisted, default 0
export const highScore = writable<number>(0);

// Earned achievements: persisted, Set<string> of achievement keys
export const achievements = writable<Set<string>>(new Set());

// Session-only (not persisted):
export const sessionScore = writable<number>(0);
export const streak = writable<number>(0);
export const currentTier = writable<number>(1);
export const playedIds = writable<Set<number>>(new Set());
export const currentWord = writable<{
  id: number;
  definition: string;
  _spelling: string;
} | null>(null);
export const gameState = writable<'variant-select' | 'playing' | 'checking' | 'wrong' | 'game-over'>('variant-select');
export const currentAttempt = writable<number>(1);
```

Persisted stores: on set, sync to localStorage. On init, read from localStorage.

### 3.3 `src/lib/api.ts` — Typed API Fetch Wrappers
Three functions with proper TypeScript types:

```typescript
export interface WordResponse {
  id: number;
  definition: string;
  _spelling: string;
}

export interface CheckResponse {
  correct: boolean;
  game_over: boolean;
  answer?: string;
}

export interface ReportResponse {
  ok: boolean;
}

export async function fetchWord(params: {
  variant: string;
  length_min: number;
  length_max: number;
  max_obscurity: number;
  played_ids: string;
}): Promise<WordResponse>;

export async function checkSpelling(body: {
  id: number;
  spelling: string;
  attempt: number;
}): Promise<CheckResponse>;

export async function reportIssue(body: {
  word_id: number;
  reason: string;
  note?: string;
}): Promise<ReportResponse>;
```

All functions throw on non-OK HTTP status. Return parsed JSON with proper types. Use `fetch()` with relative URLs (`/api/word`, etc.).

### 3.4 `src/lib/speech.ts` — Web Speech API Wrapper
```typescript
export function speakWord(text: string, lang: 'en-GB' | 'en-US'): Promise<void>;
```

- Creates `SpeechSynthesisUtterance` with given text and lang
- Returns a Promise that resolves when speech ends (onend), rejects on error
- Cancels any ongoing speech before starting new utterance (calls `speechSynthesis.cancel()` first)
- Handles the case where speechSynthesis is not available (rejects gracefully)

### 3.5 `src/lib/game.ts` — Scoring Engine & Constants
Pure functions, no side effects. Export:

```typescript
// Tier configuration
export const TIER_CONFIG: Array<{
  tier: number;
  streakRequired: number;
  lengthMin: number;
  lengthMax: number;
  maxObscurity: number;
}>;

// Rank titles
export const RANK_TITLES: Array<{ minScore: number; title: string; emoji: string }>;

// Achievement definitions
export const ACHIEVEMENTS: Array<{
  key: string;
  name: string;
  description: string;
}>;

// Scoring function
export function calculateScore(
  obscurity: number,
  length: number,
  tier: number,
  attempt: number
): number;

// Tier from streak
export function getTierFromStreak(streak: number): number;

// Rank from score
export function getRank(score: number): { title: string; emoji: string };

// Achievement evaluation
export function evaluateAchievements(
  earned: Set<string>,
  context: {
    sessionScore: number;
    streak: number;
    tier: number;
    variant: string;
    wordLength: number;
    attempt: number;
    consecutiveFirstAttempt: number;
  }
): string[];  // returns keys of newly earned achievements
```

All constants must match the spec exactly:
- Tier thresholds: 0/3/6/10/15/21 streaks
- Length ranges: [6,6], [6,6], [7,8], [7,8], [9,10], [10,999]
- Obscurity caps: 1, 2, 2, 3, 4, 5
- Scoring formula: `floor(obscurity * 10 * (0.7 + length * 0.05) * (1 + (tier - 1) * 0.5) * (attempt === 1 ? 1 : 0.5))`
- Ranks: Apprentice(0)/Speller(50)/Wordsmith(200)/Scholar(500)/Linguist(1000)/Lexicographer(2500)
- All 9 achievements from the spec

### 3.6 `src/lib/storage.ts` — localStorage Helpers
```typescript
export function loadPersistedState(): {
  variant: 'british' | 'american';
  highScore: number;
  achievements: Set<string>;
};

export function saveVariant(v: 'british' | 'american'): void;
export function saveHighScore(score: number): void;
export function saveAchievements(achievements: Set<string>): void;

export function exportData(): string;  // returns JSON string of all persisted data
export function importData(json: string): boolean;  // parses and saves, returns success
```

## Acceptance Criteria
- [ ] `src/lib/stores.ts` has all 10 stores with correct types, persisted stores sync to localStorage
- [ ] `src/lib/api.ts` has typed fetch functions for all 3 endpoints
- [ ] `src/lib/speech.ts` has working speakWord function with cancel-before-speak
- [ ] `src/lib/game.ts` scoring formula matches spec exactly (verify: tier 5, obscurity 5, length 10, attempt 1 = 180)
- [ ] `src/lib/game.ts` tier/rank/achievement constants match SPEC.md exactly
- [ ] `src/lib/storage.ts` export/import round-trips correctly
- [ ] CSS custom properties are defined, looks clean on mobile viewport
- [ ] No circular dependencies between lib files
- [ ] No Svelte components created — this is infrastructure only

## Constraints
- Do NOT create any `.svelte` files
- Do NOT modify `functions/`, `migrations/`, `seed/`, or config files
- Do NOT modify `src/app.html`
- All lib files go in `src/lib/`
- No external npm packages beyond what's already installed (don't add svelte-i18n, date-fns, etc.)
