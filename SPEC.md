# Spelling Bee — System Specification

> **Status**: Draft  
> **Hosting**: Cloudflare Pages (free tier)  
> **Last updated**: 2026-06-13

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
│  │  • Definition display    │  │  POST /api/check            │ │
│  │  • Pronounce button      │  │                             │ │
│  │  • Spelling input        │  │  POST /api/check            │ │
│  │  • Report flag (🚩)      │  │  POST /api/report           │ │
│  │  • Streak + tier tracker │  │  Stateless — no sessions,   │ │
│  │  • Score display         │  │  no auth. Reports write to  │ │
│  │  • Achievement toasts    │  │  D1; all else is read-only.  │ │
│  └──────────────────────────┘              │                   │
└────────────────────────────────────────────┼───────────────────┘
                                             │ D1 binding
                                    ┌────────▼──────────┐
                                    │   D1 Database       │
                                    │   words table       │
                                    │   Read-only at      │
                                    │   runtime           │
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
  "definition": "A building for dramatic performances"
}
```

The `spelling` field is intentionally absent. The correct spelling never reaches the client at this stage.

**Error Response (404)**

```json
{
  "error": "No words match the given criteria"
}
```

Returned when all eligible words have been exhausted (e.g., the player has cycled through the entire pool for a given variant/obscurity/length combination).

**SQL Implementation**

```sql
SELECT id, definition
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
| Hard word, late | 4 | 4 | 9 | 1st | **138** |
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
| **Game** | Definition text (large, centred), "🔊 Pronounce" button, text input field, "Enter" button, live score + rank, tier indicator, streak counter, high score. |
| **Game Over** | Correct spelling revealed, final score, rank earned, comparison to high score ("New high score!" or "Best: X — you were Y points short"), "Play Again" button, list of any achievements unlocked this session. |

### 7.2 Pronounce Button

- Calls `window.speechSynthesis.speak()` with a `SpeechSynthesisUtterance` object.
- Uses the spelling text (fetched silently via a server-held reference — see note below).
- `lang` is set to `'en-GB'` for British mode, `'en-US'` for American mode.
- The spelling is pronounced **client-side** but the text is stored only in JavaScript memory for the current word — it is not displayed, not stored in `localStorage`, and not rendered in the DOM.
- Button is disabled during audio playback. A visual indicator (pulsing speaker icon) shows while speaking.

**How the spelling reaches the TTS engine without being displayed**: The `/api/check` endpoint (on a correct answer) or the game-over response can optionally return an `audio_token` — a short-lived reference used by the client to play the pronunciation. Alternatively, the spelling can be included in the `/api/word` response inside a `pronunciation` field that the frontend feeds directly to `speechSynthesis` without rendering it to the DOM or storing it in observable state.

> **Recommendation**: For simplicity in v1, include the spelling alongside the definition in the `/api/word` response under a separate field. The frontend passes it to `speechSynthesis` and does not render it. This avoids additional round-trips. The field should be named `_spelling` (underscore convention) to signal "internal use only — do not display."

### 7.3 Spelling Input

- `<input type="text">` with `autocomplete="off"` and `autocapitalize="off"`.
- Pressing **Enter** triggers the check (equivalent to clicking the "Enter" button).
- Input is trimmed of leading/trailing whitespace before submission.
- After submitting, the input is **cleared** and re-focused for the next word (if the game continues).

---

## 8. Client-Side State

All state lives in the browser. No server-side sessions, no cookies, no authentication.

| State | Storage Location | Persists Across... |
|-------|-----------------|-------------------|
| Selected variant | `localStorage` | Page refresh, browser restart |
| High score | `localStorage` | Page refresh, browser restart |
| Earned achievements | `localStorage` (Set of achievement keys) | Page refresh, browser restart (forever) |
| Session score | JavaScript variable | Lost on page refresh or game over |
| Streak counter | JavaScript variable | Lost on page refresh or game over |
| Current tier | Derived from streak (JS variable) | Lost on page refresh or game over |
| Played word IDs | `Set<number>` in JS | Lost on page refresh or game over |
| Current word spelling | JavaScript variable (never in DOM) | Erased after pronunciation and check |

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

### 11.2 Framework Choice: Svelte

**Rationale**: Svelte compiles components to vanilla JS at build time — no virtual DOM, no runtime framework shipped to the browser. The result is a bundle measured in kilobytes, ideal for mobile-first. Svelte's built-in `transition:` and `animate:` directives map directly to our visual feedback requirements (red shake, green flash, tier-up toasts, confetti). Its reactive declarations (`$:`) eliminate boilerplate for derived state like tier from streak, or rank from score.

Build output is static (no SSR needed) — deployed as a standard Pages static site with Functions for the API layer.

### 11.3 Project Structure (Proposed)

```
spelling_bee/
├── SPEC.md                     # This document
├── wrangler.jsonc              # Pages + D1 configuration
├── package.json
├── svelte.config.js
├── vite.config.ts
├── src/
│   ├── app.html                # Svelte shell (mount point)
│   ├── app.css                 # Global styles, CSS custom properties
│   ├── lib/
│   │   ├── api.ts              # /api/word and /api/check fetch wrappers
│   │   ├── game.ts             # Scoring engine, tier logic, constants
│   │   ├── speech.ts           # Web Speech API wrapper (pronunciation)
│   │   └── storage.ts          # localStorage helpers (high score, achievements, variant)
│   ├── routes/
│   │   └── +page.svelte        # Main game page (single-page app with screen switching)
│   └── components/
│       ├── VariantSelect.svelte
│       ├── GameScreen.svelte
│       ├── GameOverScreen.svelte
│       ├── DefinitionDisplay.svelte
│       ├── PronounceButton.svelte
│       ├── SpellingInput.svelte
│       ├── ScoreBoard.svelte
│       ├── TierIndicator.svelte
│       ├── RankBadge.svelte
│       └── AchievementToast.svelte
├── functions/                  # Pages Functions (API)
│   └── api/
│       ├── word.ts             # GET /api/word
│       ├── check.ts            # POST /api/check
│       └── report.ts           # POST /api/report
├── migrations/                 # D1 migrations
│   └── 0001_create_words.sql
└── seed/                       # Word list seeding scripts
    └── seed.sql
├── migrations/
│   ├── 0001_create_words.sql
│   └── 0002_create_reports.sql
```

### 11.4 Svelte-Specific Design Decisions

- **Single-page app**: The game has three screens (VariantSelect, Game, GameOver) but only one route. Screen switching is done via a reactive `currentScreen` variable, not SvelteKit routing. This keeps the entire game state in memory without page navigations.
- **Stores for cross-component state**: Svelte writable stores for `sessionScore`, `highScore`, `streak`, `tier`, `playedIds`, and `achievements`. Components subscribe reactively.
- **Transitions**: `fly` for tier-up toasts, `scale` for game-over overlay, a custom `shake` transition for wrong answers, `confetti` effect for new high score.
- **Static adapter**: `@sveltejs/adapter-static` — builds to a `build/` directory that gets deployed to Cloudflare Pages.

### 11.5 Deployment Commands

```bash
# Local development (SvelteKit + Pages Functions)
npx wrangler pages dev build -- npm run dev

# Build static output
npm run build

# Create D1 database
npx wrangler d1 create spelling-bee-db

# Apply migrations
npx wrangler d1 migrations apply spelling-bee-db --remote

# Seed word list
npx wrangler d1 execute spelling-bee-db --remote --file=seed/seed.sql

# Deploy to Cloudflare Pages
npx wrangler pages deploy build --project-name=spelling-bee
```

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
| 1 | **Difficult words after wrong attempt** — On a wrong first attempt, should the second-attempt word be the same word or a new, easier word? | A) Same word (current spec) / B) New, 1-tier-lower word | Deferred |
| 2 | **Leaderboard + SSO** — Global leaderboard with Google/Apple sign-in? | A) Yes, with user accounts / B) No, keep it local-only | Deferred to v2 |
| 3 | **Timer per word** — Add a time pressure element? | A) Yes, configurable countdown / B) No timer | Deferred |
| 4 | **Daily challenge** — A fixed word sequence for all players each day? | A) Yes, seed-based deterministic shuffle / B) Always random | Deferred |
