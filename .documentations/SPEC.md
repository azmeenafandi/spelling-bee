# Spelling Bee — System Specification

> **Status**: Feature-complete — Daily Challenge, Sound & Haptics, Share Results, Streak Safety Net, Dark Mode, PWA  
> **Hosting**: Cloudflare Pages (free tier)  
> **Last updated**: 2026-07-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Model](#3-data-model)
4. [API Contract](#4-api-contract)
5. [Game Mechanics](#5-game-mechanics)
6. [Scoring & Gamification](#6-scoring--gamification)
7. [Frontend Behaviour](#7-frontend-behaviour)
8. [Client-Side State](#8-client-side-state)
9. [Visual Feedback](#9-visual-feedback)
10. [Word List Strategy](#10-word-list-strategy)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Data Correction Feedback](#12-data-correction-feedback)
13. [Open Decisions](#13-open-decisions)

---

## 1. Overview

A single-player spelling-bee web application. The player is shown a word's definition, hears the word pronounced aloud by the browser, and types their spelling attempt. The correct spelling is never sent to the client except on game over. The game escalates in difficulty via word length and obscurity, with a scoring system, rank titles, and persistent achievements designed to maximise engagement.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                          │
│                                                               │
│  ┌─────────────────────────┐  ┌────────────────────────────┐ │
│  │     Static Frontend      │  │   Pages Functions (API)     │ │
│  │                          │  │                             │ │
│  │  • Variant selector      │  │  GET  /api/word             │ │
│  │  • Definition display    │  │  GET  /api/word             │ │
│  │  • Pronounce button      │  │  POST /api/check            │ │
│  │  • Spelling input        │  │  POST /api/check            │ │
│  │  • Report flag (🚩)      │  │  POST /api/report           │ │
│  │  • Streak + tier tracker │  │  Stateless — no sessions,   │ │
│  │  • Score display         │  │  no auth. Reports write to  │ │
│  │  • Achievement toasts    │  │  D1; all else is read-only.  │ │
│  │  • Settings sheet        │  │                             │ │
│  └──────────────────────────┘              │                   │
└────────────────────────────────────────────┼───────────────────┘
                                             │ D1 binding
                                    ┌────────▼──────────┐
                                    │   D1 Database       │
                                    │   words (read-only) │
                                    │   reports (write)   │
                                    └────────────────────┘
```

### Component Responsibilities

| Component | Role |
|-----------|------|
| **Cloudflare Pages** | Hosts static frontend assets (HTML, CSS, JS) and Pages Functions for API routes. |
| **Pages Functions** | Two API endpoints — `/api/word` (fetch a word) and `/api/check` (validate a spelling attempt). Stateless. |
| **D1 (SQLite)** | Stores the curated word list. Read-only at runtime. Schema includes spelling, definition, variant, length, and obscurity. |
| **Web Speech API** | Browser-native text-to-speech (`speechSynthesis`). Pronounces words with locale-aware accent (`en-GB` / `en-US`). Zero server cost, zero latency. |

### Why Not Workers AI for Word Generation

- AI models hallucinate spellings and definitions — unacceptable for a correctness-critical game.
- Workers AI free tier (10,000 neurons/day) would be exhausted after ~5–50 word generations.
- A D1-backed curated word list guarantees correctness, is cheaper (essentially free), and has sub-10ms latency.
- AI may be used **offline** to bootstrap the initial word list, with human verification before inserting into D1.

---

## 3. Data Model

### D1 Table: `words`

```sql
CREATE TABLE words (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  spelling    TEXT    NOT NULL,
  definition  TEXT    NOT NULL,
  variant     TEXT    NOT NULL CHECK(variant IN ('british', 'american', 'both')),
  length      INTEGER NOT NULL,
  obscurity   INTEGER NOT NULL CHECK(obscurity BETWEEN 1 AND 5)
);
```

### Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-increment primary key. Used to reference words without revealing the spelling to the client. |
| `spelling` | TEXT | The correct spelling. **Never sent to the client except on game over.** |
| `definition` | TEXT | Dictionary definition displayed to the player. |
| `variant` | TEXT | `'british'` (UK-only words), `'american'` (US-only words), or `'both'` (identical in both dialects). |
| `length` | INTEGER | Character count of the spelling. Denormalised for fast lookup in queries. |
| `obscurity` | INTEGER | 1 = very common, 5 = extremely obscure. Used as a difficulty axis alongside `length`. |

### Variant Handling

| Player Mode | SQL WHERE Clause | Example Results |
|-------------|------------------|-----------------|
| British | `variant IN ('british', 'both')` | "colour", "lorry", "mountain" |
| American | `variant IN ('american', 'both')` | "color", "sidewalk", "mountain" |

Divergent words (e.g. colour/color) are stored as **two separate rows** with the same definition and different `variant` values. Identical-words (e.g. "mountain") are stored as **one row** with `variant = 'both'`.

### Estimated Scale

- **Target**: 300–2,000 curated rows
- **Storage**: <1 MB (trivially within D1's 500 MB free tier)
- **Queries per game round**: 1 SELECT (fetch word) + 1 SELECT (check spelling) = ~10 rows read per round
- **D1 pricing impact**: Effectively zero ($0.001 per million rows read)

---

## 4. API Contract

Three API endpoints are served by Pages Functions under `/api/`.

### 4.1 Fetch Word

```
GET /api/word?variant=<variant>&length_min=<n>&length_max=<n>&max_obscurity=<n>&played_ids=<csv>
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `variant` | string | Yes | `'british'` or `'american'` |
| `length_min` | integer | Yes | Minimum word length for the current tier |
| `length_max` | integer | Yes | Maximum word length for the current tier |
| `max_obscurity` | integer | Yes | Highest allowed obscurity level (1–5) for the current tier |
| `played_ids` | string | Yes | Comma-separated list of word IDs already seen in this session, to prevent repeats |

**Success Response (200)**

```json
{
  "id": 42,
  "definition": "A building for dramatic performances",
  "_spelling": "theatre",
  "_obscurity": 3,
  "_length": 7
}
```

The `_spelling` field is the correct spelling — fed directly to the Web Speech API for pronunciation but **never rendered in the DOM**. The `_obscurity` and `_length` fields are used by the frontend to calculate the score without a second query.

**Error Response (404)**

```json
{
  "error": "No words match the given criteria"
}
```

Returned when all eligible words have been exhausted (e.g., the player has cycled through the entire pool for a given variant/obscurity/length combination).

**SQL Implementation**

```sql
SELECT id, definition, spelling AS _spelling, obscurity AS _obscurity, length AS _length
FROM words
WHERE variant IN (?, 'both')
  AND length >= ?
  AND length <= ?
  AND obscurity <= ?
  AND id NOT IN (/* played_ids */)
ORDER BY RANDOM()
LIMIT 1;
```

---

### 4.2 Check Spelling

```
POST /api/check
Content-Type: application/json
```

**Request Body**

```json
{
  "id": 42,
  "spelling": "theatre",
  "attempt": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | integer | Yes | The word ID returned by `/api/word` |
| `spelling` | string | Yes | The player's spelling attempt |
| `attempt` | integer | Yes | `1` or `2` — which attempt this is for the current word |

**Case-insensitive comparison**: Both the player's input and the stored spelling are compared case-insensitively (e.g., "Theatre" matches "theatre").

**Success Response (200) — Correct**

```json
{
  "correct": true,
  "game_over": false
}
```

**Success Response (200) — Wrong, First Attempt**

```json
{
  "correct": false,
  "game_over": false
}
```

**Success Response (200) — Wrong, Second Attempt (Game Over)**

```json
{
  "correct": false,
  "game_over": true,
  "answer": "theatre"
}
```

The `answer` field appears **only** when `game_over` is `true`. This is the sole path by which the correct spelling reaches the client.

**Error Response (404)**

```json
{
  "error": "Word not found"
}
```

**SQL Implementation**

```sql
SELECT spelling FROM words WHERE id = ?;
```

The comparison is performed in the Pages Function, not in SQL, to keep the query trivial.

### 4.3 Report Issue

```
POST /api/report
Content-Type: application/json
```

**Request Body**

```json
{
  "word_id": 42,
  "reason": "wrong_definition",
  "note": "A theatre is a building, not a vehicle"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `word_id` | integer | Yes | The word being reported |
| `reason` | string | Yes | One of: `'wrong_spelling'`, `'wrong_definition'`, `'wrong_variant'`, `'other'` |
| `note` | string | No | Free-text elaboration from the user |

**Success Response (200)**

```json
{ "ok": true }
```

No auth, no rate limiting beyond Pages Functions free tier (100K req/day). Reports are inserted into the `reports` table — the only D1 table that accepts runtime writes. Frontend behaviour and review workflow are detailed in [Section 12](#12-data-correction-feedback).

---

## 5. Game Mechanics

### 5.1 Game Flow

```
                ┌──────────┐
                │  START   │
                └────┬─────┘
                     │
            ┌────────▼────────┐
            │ Select Variant  │  British / American (persisted)
            └────────┬────────┘
                     │
            ┌────────▼────────┐
            │   Tier 1        │  length=6, obscurity≤1
            │   score=0       │
            │   streak=0      │
            └────────┬────────┘
                     │
              ┌──────▼──────┐
              │  Fetch word  │  GET /api/word
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  Display     │
              │  definition  │
              │  Pronounce   │  Web Speech API
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  User types  │
              │  spelling    │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │  POST /check │
              └──┬───┬───┬──┘
                 │   │   │
          ┌──────┘   │   └──────────┐
          ▼          ▼              ▼
    ┌─────────┐ ┌─────────┐  ┌───────────┐
    │ CORRECT │ │ WRONG,  │  │ WRONG,    │
    │         │ │ attempt1│  │ attempt2  │
    └────┬────┘ └────┬────┘  └─────┬─────┘
         │           │              │
         ▼           ▼              ▼
    score+=pts   red shake     ┌──────────┐
    streak++     "Try again"   │GAME OVER │
    check tier   prompt        │Show answer│
    next word◄─────────────────│Show score │
                               │"Play Again"
                               └──────────┘
```

### 5.2 Attempt Rules

- The player has **exactly two attempts** per word.
- **First attempt wrong**: Visual feedback (red shake animation), prompt "Try again — one attempt remaining." No points awarded or lost. Streak is not affected (the word is still in play).
- **Second attempt correct**: Points awarded at 50% of full value. Streak increments by 1. Word marked as played.
- **Second attempt wrong**: Game over. Correct spelling is revealed. Session score is finalised and compared against the all-time high score.
- **Case-insensitive comparison**: "THEATRE", "theatre", and "Theatre" are all accepted as correct.

### 5.3 Tier Progression

Tiers determine the word pool available to the player. Progression is **streak-based** — the player must spell a consecutive number of words correctly to advance.

| Tier | Streak Required | Length Range | Max Obscurity |
|------|-----------------|--------------|---------------|
| 1 | 0 (start) | 6 only | 1 |
| 2 | 3 | 6 only | 2 |
| 3 | 6 | 7–8 | 2 |
| 4 | 10 | 7–8 | 3 |
| 5 | 15 | 9–10 | 4 |
| 6+ | 21 | 10+ | 5 |

**Tier-down rule**: If the player fails a word (two wrong attempts, game over), the session ends — tier-down does not apply mid-game. On "Play Again," the player resets to Tier 1 with streak = 0.

**Visual transition**: When a tier-up occurs, a brief animation or toast appears ("Tier 3 — Wordsmith territory") before the next word loads.

### 5.4 No-Repeat Guarantee

- The client maintains a `Set<number>` of played word IDs for the current session.
- This set is sent via the `played_ids` query parameter on every `/api/word` request.
- The SQL query excludes these IDs (`AND id NOT IN (...)`).
- If no eligible words remain (404 response), the game ends gracefully with a "You've mastered all available words!" screen.

---

## 6. Scoring & Gamification

### 6.1 Scoring Formula

```
score += floor(
    obscurity × 10
  × length_multiplier
  × tier_multiplier
  × attempt_factor
)
```

| Factor | Formula | Range |
|--------|---------|-------|
| **Base** | `obscurity × 10` | 10–50 |
| **Length multiplier** | `0.7 + (length × 0.05)` | 1.0× (6 letters) to 1.2× (10 letters) |
| **Tier multiplier** | `1 + (tier − 1) × 0.5` | 1.0× (Tier 1) to 3.0× (Tier 5) |
| **Attempt factor** | First try = 1.0, Second try = 0.5 | 1.0 or 0.5 |

### 6.2 Example Scores

| Scenario | Tier | Obscurity | Length | Attempt | Score |
|----------|------|-----------|--------|---------|-------|
| First word, easy | 1 | 1 | 6 | 1st | **10** |
| Early, moderate | 2 | 2 | 6 | 2nd | **10** |
| Mid-game | 3 | 3 | 8 | 1st | **66** |
| Hard word, late | 4 | 4 | 9 | 1st | **115** |
| Peak difficulty | 5 | 5 | 10 | 1st | **180** |
| Peak, sloppy | 5 | 5 | 10 | 2nd | **90** |

The **18× growth** from first word (10 pts) to peak word (180 pts) creates escalating stakes — each tier-up makes subsequent words disproportionately valuable, discouraging the player from quitting mid-streak.

### 6.3 Rank Titles

Displayed live during gameplay. Updated on every correct answer.

| Score Range | Title | Emoji |
|-------------|-------|-------|
| 0–49 | Apprentice | 🥚 |
| 50–199 | Speller | 📖 |
| 200–499 | Wordsmith | ✒️ |
| 500–999 | Scholar | 🎓 |
| 1,000–2,499 | Linguist | 🧠 |
| 2,500+ | Lexicographer | 👑 |

### 6.4 Achievements

One-time unlocks. Persisted in `localStorage` forever. Toast notification on unlock.

| Achievement | Trigger |
|-------------|---------|
| **First Steps** | Score first 10 points |
| **Perfect Start** | First 3 words correct, all on first attempt |
| **Century Mark** | Reach 100 points in a single game |
| **Deep End** | Reach Tier 5 |
| **Clutch** | Correct on second attempt at Tier 4+ |
| **Sharp Eye** | 5 consecutive first-attempt correct answers |
| **God Save the Queen** | British mode, length ≥ 10, first attempt, Tier 3+ |
| **Stars and Stripes** | American mode, length ≥ 10, first attempt, Tier 3+ |
| **Lexicographer** | Reach the Lexicographer rank (2,500+ points) |

### 6.5 Two Scores Tracked

| Score | Display | Storage | Purpose |
|-------|---------|---------|---------|
| **Session score** | Live counter during game | Session memory | "Don't mess up this run" — builds tension |
| **High score** | Always visible (e.g., "BEST: 1,247") | `localStorage` | "I can beat that" — drives replay |

On game over, session score is compared to the stored high score. If beaten, the high score updates and a celebration effect plays (confetti, animation).

---

## 7. Frontend Behaviour

### 7.1 Screens

| Screen | Description |
|--------|-------------|
| **Variant Select** | Two large buttons: "British English 🇬🇧" / "American English 🇺🇸". Persists choice to `localStorage`. Only shown on first visit or when the user explicitly changes it. |
| **Game** | Definition text (large, centred), "🔊 Pronounce" button, text input field, live score + rank, tier indicator, streak counter, high score, settings gear icon (⚙), report flag (🚩), Daily Challenge button, safety net indicator (🛡️). |
| **Game Over** | Correct spelling revealed, final score, rank earned, comparison to high score, "Play Again" button, achievements unlocked this session, report flag on revealed word, **Share Results** button via Web Share API (with clipboard fallback). |
| **Settings** | Bottom sheet: variant toggle, **Dark Mode toggle** (System / Light / Dark via `data-theme` attribute), export/import data as JSON file, reset all data with confirmation. |
| **Daily Challenge** | Overlay with one word per day (deterministic per variant via date-based hash), single attempt, reveals answer on submit, persists result in `localStorage`, share button for daily result card. Accessible from Variant Select screen. |

### 7.2 Pronounce Button

- Calls `window.speechSynthesis.speak()` with a `SpeechSynthesisUtterance` object.
- Uses the spelling text (fetched silently via a server-held reference — see note below).
- `lang` is set to `'en-GB'` for British mode, `'en-US'` for American mode.
- The spelling is pronounced **client-side** but the text is stored only in JavaScript memory for the current word — it is not displayed, not stored in `localStorage`, and not rendered in the DOM.
- Button is disabled during audio playback. A visual indicator (pulsing speaker icon) shows while speaking.

**How the spelling reaches the TTS engine without being displayed**: The `/api/check` endpoint (on a correct answer) or the game-over response can optionally return an `audio_token` — a short-lived reference used by the client to play the pronunciation. Alternatively, the spelling can be included in the `/api/word` response inside a `pronunciation` field that the frontend feeds directly to `speechSynthesis` without rendering it to the DOM or storing it in observable state.

> For simplicity in v1, the `/api/word` response includes `_spelling` (for pronunciation), `_obscurity`, and `_length` (for score calculation). The frontend passes `_spelling` directly to `speechSynthesis` without rendering it. The underscore prefix signals "internal use only — do not display."

### 7.2.1 Input Autocorrect

- The spelling input field includes `autocorrect="off"` and `spellcheck="false"` to prevent browser autocorrect and spellcheck from interfering with spelling attempts.

### 7.3 Spelling Input

- `<input type="text">` with `autocomplete="off"`, `autocapitalize="off"`, **`autocorrect="off"`**, and `spellcheck="false"`.
- Pressing **Enter** triggers the check (equivalent to clicking the "Enter" button).
- Input is trimmed of leading/trailing whitespace before submission.
- After submitting, the input is **cleared** and re-focused for the next word (if the game continues).

---

## 8. Client-Side State

All state lives in the browser via Svelte writable stores. No server-side sessions, no cookies, no authentication.

| State | Storage Location | Persists Across... |
|-------|-----------------|-------------------|
| Selected variant | `localStorage` (Svelte store `variant`) | Page refresh, browser restart |
| High score | `localStorage` (Svelte store `highScore`) | Page refresh, browser restart |
| Earned achievements | `localStorage` (Svelte store `achievements`) | Page refresh, browser restart (forever) |
| Theme preference | `localStorage` (`spelling-bee:theme` — `'system'`, `'light'`, or `'dark'`) | Page refresh, browser restart |
| Daily result | `localStorage` (`spelling-bee:daily-result` — `{ [date: string]: boolean }`) | Page refresh, browser restart (per date) |
| Session score | Svelte store `sessionScore` | Lost on page refresh or game over |
| Streak counter | Svelte store `streak` | Lost on page refresh or game over |
| Current tier | Derived from `streak` via `getTierFromStreak()` | Lost on page refresh or game over |
| Played word IDs | Svelte store `playedIds` (`Set<number>`) | Lost on page refresh or game over |
| Current word data | Svelte store `currentWord` (id, definition, _spelling, _obscurity, _length) | Lost on page refresh or game over |
| Game state | Svelte store `gameState` (`'variant-select'` / `'loading'` / `'playing'` / `'checking'` / `'wrong'` / `'game-over'`) | Resets on game over |
| Current attempt | Svelte store `currentAttempt` (1 or 2) | Resets per word |
| Safety net available | Component-level `$state` boolean (`safetyNetAvailable`) | Lost on page refresh (used once per session) |
| Audio initialised | Component-level `$state` boolean (`audioInitialised`) | Lost on page refresh (re-initialised on first user gesture) |

---

## 9. Visual Feedback

| Event | Visual Response |
|-------|-----------------|
| Word correct, 1st attempt | Brief green flash on input border. Score counter animates upward. |
| Word correct, 2nd attempt | Amber flash. Score counter animates upward (at half rate). "Phew!" text appears briefly. |
| Word wrong, 1st attempt | Red shake animation on input. Input border turns red. "One attempt remaining" text fades in below the input. |
| Word wrong, 2nd attempt | Red shake animation. "Game Over" overlay slides in. Correct spelling revealed in large text. |
| Tier up | Toast notification at top of screen: "▲ Tier 3 — Wordsmith territory". Brief shimmer effect on the tier indicator. |
| Achievement unlock | Toast notification with achievement name and icon. Added to a running list at the bottom of the game-over screen. |
| New high score | Confetti animation on game-over screen. "🏆 NEW HIGH SCORE!" banner. |
| Pronunciation playing | Pulsing speaker icon. Pronounce button slightly faded and disabled. |

---

## 10. Word List Strategy

### 10.1 Initial Population

- **Target**: 300–500 words for v1 launch.
- **Source**: Curated manually or semi-automated (AI-assisted generation with human verification).
- **Distribution**: Aim for roughly equal coverage across obscurity levels 1–5 within each variant, and at least 10–15 words per (variant, length, obscurity) bucket.

### 10.2 Quality Rules

- Each word must have an **accurate, concise definition** suitable for display.
- Divergent words (colour/color, theatre/theater) must be entered as **two rows** with the same definition.
- Obscurity scoring should be **consistent** — a rubric should be defined (e.g., "Obscurity 1 = common primary-school vocabulary; Obscurity 5 = rarely encountered outside spelling bees or specialist contexts").
- No proper nouns (unless transliterated differently, e.g. "Moscow" / "Moskva" — but keep these rare).

### 10.3 Extensibility

The D1 table can be extended at any time via `wrangler d1 execute` or a migration. Adding words does not require a code deploy. The API queries are parameterised and will automatically pick up new rows.

---

## 11. Deployment & Infrastructure

### 11.1 Platform

| Service | Plan | Cost |
|---------|------|------|
| Cloudflare Pages | Free tier | $0.00 |
| Pages Functions | Free tier (100K req/day) | $0.00 |
| D1 | Free tier (500 MB, 5 DBs) | $0.00 |
| **Total** | | **$0.00/month** |

### 11.2 Framework Choice: Svelte 5 (runes mode)

**Rationale**: Svelte compiles components to vanilla JS at build time — no virtual DOM, no runtime framework shipped to the browser. The result is a bundle measured in kilobytes, ideal for mobile-first. Svelte's built-in `transition:` and `animate:` directives map directly to our visual feedback requirements (red shake, green flash, tier-up toasts, confetti).

**Svelte 5 runes**: The project uses Svelte 5 with `compilerOptions.runes: true`, enabling the new runes API throughout:
- **`$state()`** for reactive local component state (replaces `let x = ...` with implicit reactivity)
- **`$props()`** for component props with TypeScript generics (replaces `export let`)
- **`$derived()`** for computed values that update automatically (replaces `$:` derived declarations)
- **`$effect()`** for side effects that respond to reactive dependencies (replaces `$:` side-effect statements)

There are no `$:` Svelte 4 reactive declarations anywhere in the codebase — all reactivity uses the runes API.

Build output is static (no SSR needed) — deployed as a standard Pages static site with Functions for the API layer.

### 11.3 Project Structure

```
spelling_bee/
├── SPEC.md                     # This document
├── DEPLOY.md                   # Deployment checklist (optional)
├── dev.sh                      # Local dev server script (fresh D1, auto-seed)
├── wrangler.jsonc              # Pages + D1 configuration
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions: deploy to Cloudflare Pages on push to main
├── static/
│   ├── manifest.json           # PWA manifest (name, icons, display, theme_color)
│   ├── icon-192.png            # PWA icon (192x192)
│   ├── icon-512.png            # PWA icon (512x512)
│   └── favicon.png
├── src/
│   ├── app.html                # Svelte shell (mount point, includes manifest link, color-scheme meta)
│   ├── app.css                 # Global styles, OKLCH custom properties, Dark Mode (media query + data-theme)
│   ├── lib/
│   │   ├── api.ts              # Typed fetch wrappers for /api/word, /api/check, /api/report, /api/daily
│   │   ├── audio.ts            # Web Audio API sound effects (correct, wrong, tier-up, game-over, achievement) + haptics
│   │   ├── game.ts             # Scoring engine, tier logic, rank titles, achievement evaluation
│   │   ├── share.ts            # Web Share API + clipboard fallback, game & daily share card generators
│   │   ├── speech.ts           # Web Speech API wrapper (speakWord)
│   │   ├── storage.ts          # localStorage helpers + export/import, theme & daily result persistence
│   │   └── stores.ts           # Svelte writable stores (10 stores, 3 persisted); theme stored separately
│   ├── routes/
│   │   ├── +layout.svelte      # Root layout (imports app.css, applies persisted theme on mount via data-theme)
│   │   └── +page.svelte        # Main game page: state machine, component wiring, sound triggers, safety net
│   └── components/
│       ├── VariantSelect.svelte
│       ├── DefinitionDisplay.svelte
│       ├── PronounceButton.svelte
│       ├── SpellingInput.svelte
│       ├── ScoreBoard.svelte
│       ├── TierIndicator.svelte
│       ├── GameOverScreen.svelte
│       ├── AchievementToast.svelte
│       ├── DailyChallenge.svelte   # Daily Challenge overlay (one word/day, deterministic, single attempt)
│       ├── ReportSheet.svelte
│       └── SettingsSheet.svelte    # Dark Mode toggle (System/Light/Dark), variant, export/import, reset
├── functions/                  # Pages Functions (API)
│   └── api/
│       ├── word.ts             # GET /api/word
│       ├── check.ts            # POST /api/check
│       ├── daily.ts            # GET /api/daily — deterministic daily word via date+variant hash
│       └── report.ts           # POST /api/report
├── migrations/
│   ├── 0001_create_words.sql
│   └── 0002_create_reports.sql
├── seed/
│   ├── seed.sql                # Initial word seed
│   ├── words.sql               # Unified word list (477 words, used by dev.sh)
│   ├── morewords.sql           # Supplementary word additions
│   └── extra-8plus.sql         # Additional 8+ letter words
```

### 11.4 Svelte-Specific Design Decisions

- **Svelte 5 runes**: The project uses Svelte 5 with `compilerOptions.runes: true` (no legacy `componentApi` compatibility). All components use `$state()`, `$props()`, `$derived()`, and `$effect()` exclusively. No `$:` Svelte 4 reactive declarations exist anywhere in the codebase. Props use TypeScript generics with `$props()`. Template event handlers use the runes-compatible `onclick=`, `onkeydown=` syntax.
- **Single-page app**: The game has three screens (VariantSelect, Game, GameOver) plus overlays (Settings, Report, DailyChallenge) but only one route. Screen switching is driven by the `$gameState` Svelte store, not SvelteKit routing. This keeps game state in memory without page navigations.
- **Stores for cross-component state**: Svelte writable stores for `sessionScore`, `highScore`, `streak`, `playedIds`, `achievements`, `variant`, `gameState`, `currentWord`, and `currentAttempt`. Components receive data as props where possible; only screen-level components (VariantSelect, SettingsSheet) write to stores.
- **Transitions**: `fly` for tier-up toasts, `slide` for bottom sheets and overlays, `fade` for backdrop, CSS `@keyframes` for shake, pulse, confetti, and shimmer effects. All animations respect `prefers-reduced-motion`.
- **Static adapter**: `@sveltejs/adapter-static` — builds to a `build/` directory deployed to Cloudflare Pages.
- **`+layout.svelte`**: Required to import `app.css` globally so CSS custom properties (`--color-primary`, `--font-size-2xl`, etc.) are available to all components. Also applies persisted theme preference on mount via `data-theme` attribute.
- **Service worker**: SvelteKit's built-in service worker (`src/service-worker.ts`) caches all build assets and files at install time, enabling offline loading. Registration is handled by SvelteKit via `kit.serviceWorker.register: true`.
- **PWA**: A `manifest.json` (name, short_name, icons, display: standalone, theme_color) and two PWA icons (192×192, 512×512) enable installable app behaviour.
- **Dark Mode**: Three-state theme toggle (System / Light / Dark) persisted to `localStorage`. Uses CSS custom properties with `@media (prefers-color-scheme: dark)` and a `[data-theme="dark"]` / `[data-theme="light"]` override with higher specificity. The theme preference is applied in `+layout.svelte` on mount.
- **OKLCH colour palette**: All colours use the OKLCH colour space (`oklch(45% 0.18 250)`), providing perceptually uniform lightness and consistent saturation across light and dark themes. Named "Scholar's Ink" palette.
- **Sound & Haptics**: Synthesised via Web Audio API (no external files) in `audio.ts`. Separate functions for correct, wrong, tier-up, game-over, and achievement sounds. Haptic feedback via `navigator.vibrate(15)` on capable devices. Audio context is created lazily on first user gesture (`initAudio()`). All sounds are no-ops when `prefers-reduced-motion: reduce` is active or when Web Audio is unavailable.
- **Share Results**: Game-over screen includes a "Share Results" button using the Web Share API with clipboard fallback. Generates a formatted share card with date, score, rank, streak, tier, and emoji grid of attempt outcomes. Daily Challenge also has its own share card generator.
- **Daily Challenge**: A separate overlay available from the Variant Select screen. Fetches a deterministic word via `GET /api/daily?variant=...` where the word ID is derived from a numeric hash of `date + variant`. Single attempt only — persists the boolean result to `localStorage`. Share button generates a daily-specific share card.
- **Streak Safety Net**: The first game-over of each session is converted to a streak reset instead of ending the game. The player continues with streak = 0 and the safety net icon grays out. A green toast notification announces the save. This reduces frustration while keeping streaks meaningful.
- **`color-scheme` meta tag**: `app.html` includes `<meta name="color-scheme" content="light dark">` so browser chrome and scrollbars adapt to the selected theme.

### 11.5 Deployment Commands

```bash
# Local development (convenience script — fresh D1 + seed)
./dev.sh [port]

# Build static output
npm run build

# Create D1 database (first deploy only)
npx wrangler d1 create spelling-bee-db

# Apply migrations (local dev)
npx wrangler d1 migrations apply spelling-bee-db --local

# Seed word list (local dev — use the unified file)
npx wrangler d1 execute spelling-bee-db --local --file=seed/words.sql

# Apply migrations (production)
npx wrangler d1 migrations apply spelling-bee-db --remote

# Seed word list (production)
npx wrangler d1 execute spelling-bee-db --remote --file=seed/words.sql

# Deploy to Cloudflare Pages
npx wrangler pages deploy build --project-name=spelling-bee
```

**Note**: The `wrangler.jsonc` includes `database_id` for production. For local dev, `dev.sh` strips the `database_id` line so `pages dev` and `d1 execute` share the same `.wrangler/state` directory (restored on exit via trap).

### 11.6 Continuous Deployment

[GitHub Actions](https://github.com/beerobee/spelling-bee/blob/main/.github/workflows/deploy.yml) automatically deploys to Cloudflare Pages on every push to `main`:

```
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy build --project-name=spelling-bee
```

Required secrets in the repository: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

---

## 12. Data Correction Feedback

A lightweight reporting mechanism so users can flag mistakes in the word list. No auth required — reports are anonymous. This provides crowdsourced QA without any backend complexity beyond a single write-enabled table.

### 12.1 D1 Table: `reports`

```sql
CREATE TABLE reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id     INTEGER NOT NULL REFERENCES words(id),
  reason      TEXT NOT NULL CHECK(reason IN ('wrong_spelling', 'wrong_definition', 'wrong_variant', 'other')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved    INTEGER NOT NULL DEFAULT 0
);
```

This is the only D1 table that accepts **runtime writes**. All other tables are read-only during gameplay.

### 12.2 API Endpoint

```
POST /api/report
Content-Type: application/json
```

**Request Body**

```json
{
  "word_id": 42,
  "reason": "wrong_definition",
  "note": "A theatre is a building, not a vehicle"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `word_id` | integer | Yes | The word being reported |
| `reason` | string | Yes | One of: `'wrong_spelling'`, `'wrong_definition'`, `'wrong_variant'`, `'other'` |
| `note` | string | No | Free-text elaboration from the user |

**Success Response (200)**

```json
{ "ok": true }
```

### 12.3 Frontend Behaviour

- A small 🚩 icon appears:
  - On the **definition card** during gameplay (user may spot a bad definition before seeing the answer).
  - Next to the **revealed spelling** on the game-over screen (user now knows the word and can flag a misspelling or wrong variant).
- Icon is deliberately **unobtrusive** — not a primary action.
- Tapping it opens a compact **bottom sheet** (mobile-first) with a reason picker (radio buttons) and optional free-text note field.
- On submit: `POST /api/report`, dismiss bottom sheet, show brief "Thank you" confirmation toast.
- No rate limiting beyond what Pages Functions free tier provides (100K req/day).

### 12.4 Operator Workflow

For v1, reports are reviewed via raw SQL. No admin dashboard.

```bash
# View all unresolved reports with word context
wrangler d1 execute spelling-bee-db --remote \
  --command="SELECT r.id, r.reason, r.note, w.spelling, w.definition
             FROM reports r JOIN words w ON r.word_id = w.id
             WHERE r.resolved = 0 ORDER BY r.created_at DESC"

# Mark a report as resolved after fixing the word
wrangler d1 execute spelling-bee-db --remote \
  --command="UPDATE reports SET resolved = 1 WHERE id = 5"
```

A v2 refinement could include a simple admin page behind Cloudflare Access, but raw SQL is functional for a curated word list of this scale.

---

## 13. Open Decisions

The following items are intentionally deferred for future consideration or discussion.

| # | Decision | Options | Status |
|---|----------|---------|--------|
| 1 | **Difficult words after wrong attempt** — On a wrong first attempt, should the second-attempt word be the same word or a new, easier word? | A) Same word (current spec) / B) New, 1-tier-lower word | **Implemented: A** |
| 2 | **Leaderboard + SSO** — Global leaderboard with Google/Apple sign-in? | A) Yes, with user accounts / B) No, keep it local-only | Deferred to v2 |
| 3 | **Timer per word** — Add a time pressure element? | A) Yes, configurable countdown / B) No timer | Deferred |
| 4 | **TTS pronunciation quality** — Improve pronunciation of complex words via better voice selection, slower rate for long words, and optional phonetic hints | A) Client-side voice/rate tuning / B) Phonetic column in DB / C) Both | **Deferred** — see src/lib/speech.ts |
| 5 | **Daily Challenge** — One deterministic word per day per variant | A) Implemented via date+variant hash / B) Manual curation per day | **Implemented: A** |
| 6 | **Sound & Haptics** — Synthesised sound effects and haptic feedback | A) Web Audio API synthesis + navigator.vibrate / B) Pre-recorded audio files | **Implemented: A** |
| 7 | **Share Results** — Share game results via Web Share API or clipboard | A) Web Share API with clipboard fallback / B) Share image generation | **Implemented: A** |
| 8 | **Streak Safety Net** — Convert first game-over to streak reset | A) One free save per session / B) No safety net | **Implemented: A** |
| 9 | **Dark Mode** — Light/Dark/System theme toggle | A) CSS custom properties with media query + data-theme override / B) Separate CSS files | **Implemented: A** |
| 10 | **PWA** — Installable web app with service worker | A) SvelteKit service worker + manifest.json + icons / B) No PWA | **Implemented: A** |
