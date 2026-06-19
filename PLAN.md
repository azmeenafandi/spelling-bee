# Spelling Bee — Feature Plan

> **Date**: 2026-06-19  
> **Status**: Release 1 complete ✅ — Release 2 next  
> **Current state**: 477 words, British/American modes, streak-based tier progression, scoring/ranks/achievements, two-attempt mechanic, anonymous error reporting, Svelte 5 full runes, Scholar's Ink design system.

---

## Ranking Philosophy

The app works. Players can play, score, and progress. What's missing is **reasons to come back** and **reasons to tell a friend**. The top 3 features target retention and virality. The middle 4 deepen the experience. The bottom 3 polish it.

Every feature must serve at least one design principle. If it doesn't, it's decoration — cut it.

---

## Priority 1 — Ship Next

These three form a cohesive "retention + growth" release. Ship them together.

### 1. Daily Challenge

**What**: One curated word per day, same for all players, deterministic from the date. Separate from the main game — a single word, one shot, shareable result.  
**Why**: This is the retention engine. Wordle proved that a daily ritual with a shared moment ("did you get today's?") creates habitual return. The main game is great for binge sessions, but without a daily anchor, there's no pull to open the app tomorrow. A daily word also gives the social share feature something to share *about*.  
**Complexity**: Low. Deterministic seed from `YYYY-MM-DD` → `SELECT ... WHERE id = seed % count`. No new tables needed. One new component, one new API endpoint (`GET /api/daily`). Persist today's result in `localStorage` to prevent replay.  
**Principle**: *Progress is visible* — the daily streak becomes a visible, persistent metric. Also *Challenge without intimidation* — one word is approachable, not overwhelming.

---

### 2. Sound Design & Haptic Feedback

**What**: Audio cues for correct answer (bright chime), wrong answer (low thud), tier-up (ascending fanfare), game-over (soft descending tone), and achievement unlock (distinctive sparkle). Haptic pulses via the Vibration API on mobile for the same events.  
**Why**: This is a *spelling* app — sound is half the identity. The pronounce button exists, but the feedback loop is silent. A correct answer should *feel* rewarding through multiple senses. Right now, a correct answer produces a brief green flash. That's not enough. The "Scholar's toolkit" principle demands that interactions feel crafted, not mechanical. Audio is the cheapest way to add 10× perceived polish.  
**Complexity**: Low–Medium. Web Audio API for synthesized tones (no asset files needed — generate chimes programmatically or use a tiny library like `sfxr`). Vibration API is a one-liner. The main work is tuning the sounds to feel right and respecting `prefers-reduced-motion` (mute audio/vibration when set).  
**Principle**: *Tactile confidence* — every interaction should feel responsive and intentional. Sound and haptics complete the feedback loop that visuals alone cannot.

---

### 3. Share Results (Wordle-Style)

**What**: After game over (and after each daily challenge), generate a compact emoji grid summarising the session — tier reached, score, streak, attempt pattern — and copy it to the clipboard. One-tap share to social/messaging.  
**Why**: Free virality. Every player who shares is an organic acquisition channel. The emoji grid format is instantly recognisable and curiosity-provoking ("what's this?"). Combined with the Daily Challenge, it creates a shared cultural moment. Without sharing, the app is invisible.  
**Complexity**: Low. Generate a string from session data. No server call. Use `navigator.clipboard.writeText()` with a fallback. Example output:

```
🐝 Spelling Bee — June 18
⭐ 1,247 pts · 🔥 12 streak · Tier 5
✅✅✅✅✅✅✅❌
📗 Scholar rank
https://spelling-bee.pages.dev
```

**Principle**: *Progress is visible* — the share card is a condensed visual proof of achievement. Also reinforces *Challenge without intimidation* — seeing friends' scores normalizes the difficulty.

---

## Priority 4–6 — Next Sprint

Deepen the experience. Players who return need more to do and more to see.

### 4. Statistics Dashboard

**What**: A persistent stats screen (accessible from settings or game-over) showing: games played, total words spelled, accuracy rate, average score, best score, best streak, highest tier reached, time spent playing, words spelled correctly by obscurity level, and a heatmap of play activity (days played in the last 30).  
**Why**: "Progress is visible" is the principle, but right now progress resets every game. The session score vanishes. The high score is a single number. Players who invest time want to see their journey — not just a leaderboard position, but a personal record of growth. Stats also create shareable moments ("I've spelled 500 words!") and give long-term players something to optimise beyond one-run scores.  
**Complexity**: Medium. All data persists in `localStorage` — no server changes. The main work is designing the dashboard UI to be informative without feeling like a SaaS analytics page (anti-reference). A clean list or card layout, not charts-for-the-sake-of-charts.  
**Principle**: *Progress is visible* — the entire purpose of stats. Also *Scholar's toolkit* — a well-organised record of one's own performance.

---

### 5. PWA / Installable App

**What**: Add a web app manifest and service worker. Make the app installable to the home screen on iOS and Android. Cache the app shell and word data for offline play of previously-seen words. Show an "Install" prompt on second visit.  
**Why**: A mobile-first app that isn't installable is a website pretending to be an app. The home screen icon, the standalone window, the absence of browser chrome — these signal permanence and commitment. Offline capability means the app works on the Tube, in airplane mode, in spotty coverage. For a practice app, reliability is trust.  
**Complexity**: Medium. SvelteKit has good PWA support via `@vite-pwa/sveltekit` or manual service worker registration. The manifest is straightforward. Caching strategy: cache the app shell on install, cache API responses (word data) with a stale-while-revalidate strategy. Offline play of cached words is a stretch goal — the main win is the install experience.  
**Principle**: *Scholar's toolkit* — a well-crafted instrument that's always available. Also *Tactile confidence* — no lag, no "you're offline" dead ends.

---

### 6. Word Review (Post-Game Learning)

**What**: On the game-over screen, show a scrollable list of all words encountered this session — the definition, the correct spelling, and whether the player got it right (green), right on second attempt (amber), or wrong (red). Include a "Practice these words" button that launches a practice session (see #7).  
**Why**: The game ends, the correct spelling of the *final* word is revealed, and then... nothing. The player has no record of what they learned. For a practice app, this is a missed educational opportunity. Reviewing words reinforces learning. Seeing "you got 8/12 right, here are the 4 you missed" is both informative and motivating — it gives players a concrete target for next time.  
**Complexity**: Medium. Requires storing the session's word list in memory (already exists as `playedIds`, but needs to be expanded to include the word data and attempt outcomes). The UI is a simple list — the main work is capturing the data during gameplay and designing the review layout.  
**Principle**: *Progress is visible* — learning is progress. Also *Challenge without intimidation* — seeing what you got wrong in a safe context (review, not penalty) encourages improvement.

---

## Priority 7–10 — Soon

Polish and depth. These make the app feel complete.

### 7. Practice Mode

**What**: A separate mode (accessible from the main menu or after game over) where the player practices words without the game-over penalty. No score, no streak, no tier progression. Just word after word, with feedback on each attempt. Players can filter by: words they've gotten wrong before, specific obscurity levels, or specific lengths.  
**Why**: The main game is a pressure cooker — one wrong second attempt and you're done. That's great for engagement, but it's terrible for learning. Players who want to *improve* need a low-stakes environment to practice. This is the "Challenge without intimidation" principle taken to its logical conclusion: challenge without *any* consequence. It also gives the app a use case beyond "compete with yourself" — structured practice for actual spelling bee preparation.  
**Complexity**: Medium. Requires a new game mode state, a menu toggle, and a filter UI. The API already supports querying by length/obscurity. The main design decision: should practice words come from the player's "missed words" list (from #6) or from the general pool? Probably both, with missed words prioritised.  
**Principle**: *Challenge without intimidation* — practice without penalty. Also serves the core user (spelling bee students) who need deliberate practice, not just competitive play.

---

### 8. Streak Safety Net (One Mulligan Per Game)

**What**: Once per game, the player can survive a second-attempt failure. The word is marked wrong (no points, streak resets to 0), but the game continues instead of ending. A subtle indicator shows whether the safety net is still available (e.g., a shield icon that dims after use).  
**Why**: Game over on the second wrong attempt is brutal. It's the right design for tension, but it creates a frustration cliff — especially at higher tiers where the player has invested significant time. A single mulligan preserves the stakes (you only get one, and streak resets) while softening the blow. This is "Challenge without intimidation" in its purest form: the challenge remains, but the punishment is proportionate.  
**Complexity**: Low. One new boolean in session state (`safetyNetAvailable`). Modify the game-over logic to check it. Add a visual indicator. No API changes.  
**Principle**: *Challenge without intimidation* — wrong answers should sting momentarily, not humiliate. A mulligan turns a rage-quit moment into a "I can still recover" moment.

---

### 9. Dark Mode

**What**: Respect `prefers-color-scheme` automatically, with a manual toggle in settings. Dark palette uses the same design tokens (CSS custom properties) with inverted values — rich dark backgrounds, warm light text, adjusted accent colours.  
**Why**: The Scholar's Ink design system is distinctive in light mode. But the majority of phone usage is in dim environments — evening, bedtime, low light. A bright white screen in the dark is hostile. Dark mode is table stakes for any modern mobile app. With CSS custom properties already in place, this is low-hanging fruit.  
**Complexity**: Low. Define a `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)` set of CSS custom properties. Add a toggle in settings that writes to `localStorage`. The main design work is ensuring the colour palette maintains the "Scholar's toolkit" personality in dark mode — not just inverting to generic dark grey.  
**Principle**: *Scholar's toolkit* — a well-crafted instrument that respects the player's environment. Also *Tactile confidence* — no visual discomfort.

---

### 10. Adaptive Difficulty Calibration

**What**: Track the player's accuracy per obscurity level and word length across sessions. When selecting the next word, bias toward the player's weak areas (e.g., if they consistently miss obscurity-3 words, serve more of them at the appropriate tier). Optionally surface this as a "Your weak spots" indicator on the stats dashboard.  
**Why**: The current tier system is linear — everyone follows the same progression. But players have different weaknesses. One player might struggle with long words; another with obscure definitions. Adaptive difficulty keeps each player at *their* edge of ability, which is where flow state happens. It also prevents the common failure mode where a player breezes through early tiers and then hits a wall at Tier 4 — the wall should be gradual, not sudden.  
**Complexity**: Medium–High. Requires persisting per-word-outcome data in `localStorage` (word ID, correct/wrong, attempt number, obscurity, length). The word selection algorithm becomes more sophisticated — not just random from the eligible pool, but weighted by weakness. The UI component ("Your weak spots") is optional but adds value.  
**Principle**: *Challenge without intimidation* — the difficulty curve should match the player, not the average. Also *Progress is visible* — seeing your weak spots is a form of progress awareness.

---

## Release 1 — Implementation Notes

### 1. Daily Challenge ✅
- **API**: `GET /api/daily?variant=british` — deterministic word from `YYYY-MM-DD` hash
- **Component**: `DailyChallenge.svelte` — centered overlay with backdrop, close button, pronounce, spelling input
- **Storage**: `localStorage` key `spelling-bee:daily:YYYY-MM-DD` — prevents replay
- **Integration**: Button rendered inside VariantSelect via `children` snippet → `daily-slot` div

### 2. Sound & Haptics ✅
- **Audio**: `src/lib/audio.ts` — Web Audio API synthesized tones (correct chime, wrong thud, tier-up fanfare, game-over descent, achievement sparkle)
- **Haptics**: `navigator.vibrate(15)` on mobile for correct/wrong/tier-up
- **Accessibility**: All functions no-op when `prefers-reduced-motion` is set
- **Init**: AudioContext created lazily on first user gesture (Start button / Play Again)

### 3. Share Results ✅
- **Share card**: `src/lib/share.ts` — Wordle-style emoji grid with `✅`/`🟡`/`❌` attempt pattern
- **Web Share API**: `navigator.share()` for native OS share sheet (Android/iOS/Chrome desktop)
- **Fallback**: Clipboard copy via `navigator.clipboard.writeText()` with `document.execCommand('copy')` backup
- **Integration**: Share buttons on GameOverScreen and DailyChallenge result

---

## Summary Table

| # | Feature | Complexity | Principle | Ship With |
|---|---------|-----------|-----------|-----------|
| 1 | Daily Challenge | Low | ✅ Complete | Progress is visible | **Release 1** |
| 2 | Sound & Haptics | Low–Med | ✅ Complete | Tactile confidence | **Release 1** |
| 3 | Share Results | Low | ✅ Complete | Progress is visible | **Release 1** |
| 4 | Statistics Dashboard | Medium | Progress is visible | Release 2 |
| 5 | PWA / Installable | Medium | Scholar's toolkit | Release 2 |
| 6 | Word Review | Medium | Progress is visible | Release 2 |
| 7 | Practice Mode | Medium | Challenge w/o intimidation | Release 3 |
| 8 | Streak Safety Net | Low | Challenge w/o intimidation | Release 3 |
| 9 | Dark Mode | Low | Scholar's toolkit | Release 3 |
| 10 | Adaptive Difficulty | Med–High | Challenge w/o intimidation | Release 4 |

---

## What We Said No To

These were considered and deliberately excluded or deferred:

- **Timer mode**: Adds anxiety, not challenge. Conflicts with "Challenge without intimidation." Deferred indefinitely.
- **Leaderboards**: Requires auth, accounts, anti-cheat. Complexity explosion for marginal value. The share card achieves social comparison without the infrastructure.
- **Word categories / themes**: Interesting for v2, but the current obscurity/length axis is sufficient. Categories fragment the word pool and create selection paralysis.
- **Multiplayer / challenge a friend**: Cool idea, massive complexity (real-time sync, matchmaking). Not for a free-tier Cloudflare Pages app.
- **Phonetic hints / IPA**: Niche value. The pronounce button already serves the "how do I say it?" need. IPA is intimidating to most players.
- **Mascot / character**: Anti-reference explicitly forbids "cartoon mascots, excessive decoration."
