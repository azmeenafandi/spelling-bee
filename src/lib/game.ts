/**
 * Scoring engine, tier configuration, rank titles, and achievement definitions.
 *
 * All values are pure — no side effects, no imports from other lib modules.
 * The scoring formula is:
 *   floor(obscurity × 10 × (0.7 + length × 0.05) × (1 + (tier − 1) × 0.5) × (attempt === 1 ? 1 : 0.5))
 */

/* ===================================================================
   Tier Configuration
   =================================================================== */

export interface TierConfig {
  tier: number;
  streakRequired: number;
  lengthMin: number;
  lengthMax: number;
  maxObscurity: number;
}

/**
 * Tier progression is streak-based.
 * The player advances when their consecutive correct streak hits the threshold.
 *
 * | Tier | Streak | Length | Obscurity |
 * |------|--------|--------|-----------|
 * |  1   |   0    |  6     |  1        |
 * |  2   |   3    |  6     |  2        |
 * |  3   |   6    |  7–8   |  2        |
 * |  4   |  10    |  7–8   |  3        |
 * |  5   |  15    |  9–10  |  4        |
 * |  6   |  21    | 10+    |  5        |
 */
export const TIER_CONFIG: TierConfig[] = [
  { tier: 1, streakRequired: 0,  lengthMin: 6,  lengthMax: 6,    maxObscurity: 1 },
  { tier: 2, streakRequired: 3,  lengthMin: 6,  lengthMax: 6,    maxObscurity: 2 },
  { tier: 3, streakRequired: 6,  lengthMin: 7,  lengthMax: 8,    maxObscurity: 2 },
  { tier: 4, streakRequired: 10, lengthMin: 7,  lengthMax: 8,    maxObscurity: 3 },
  { tier: 5, streakRequired: 15, lengthMin: 9,  lengthMax: 10,   maxObscurity: 4 },
  { tier: 6, streakRequired: 21, lengthMin: 10, lengthMax: 999,  maxObscurity: 5 },
];

/* ===================================================================
   Rank Titles
   =================================================================== */

export interface RankEntry {
  minScore: number;
  title: string;
  emoji: string;
}

export const RANK_TITLES: RankEntry[] = [
  { minScore: 0,    title: 'Apprentice',     emoji: '🥚' },
  { minScore: 50,   title: 'Speller',        emoji: '📖' },
  { minScore: 200,  title: 'Wordsmith',      emoji: '✒️' },
  { minScore: 500,  title: 'Scholar',        emoji: '🎓' },
  { minScore: 1000, title: 'Linguist',       emoji: '🧠' },
  { minScore: 2500, title: 'Lexicographer',  emoji: '👑' },
];

/* ===================================================================
   Achievement Definitions
   =================================================================== */

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_steps',         name: 'First Steps',         description: 'Score your first 10 points' },
  { key: 'perfect_start',       name: 'Perfect Start',       description: 'First 3 words correct, all on first attempt' },
  { key: 'century_mark',        name: 'Century Mark',        description: 'Reach 100 points in a single game' },
  { key: 'deep_end',            name: 'Deep End',            description: 'Reach Tier 5' },
  { key: 'clutch',              name: 'Clutch',              description: 'Correct on second attempt at Tier 4+' },
  { key: 'sharp_eye',           name: 'Sharp Eye',           description: '5 consecutive first-attempt correct answers' },
  { key: 'god_save_the_queen',  name: 'God Save the Queen',  description: 'British mode, length ≥ 10, first attempt, Tier 3+' },
  { key: 'stars_and_stripes',   name: 'Stars and Stripes',   description: 'American mode, length ≥ 10, first attempt, Tier 3+' },
  { key: 'lexicographer',       name: 'Lexicographer',       description: 'Reach the Lexicographer rank (2,500+ points)' },
];

/* ===================================================================
   Scoring
   =================================================================== */

/**
 * Calculate points for a single correct answer.
 *
 * Formula:
 *   floor(obscurity * 10 * (0.7 + length * 0.05) * (1 + (tier - 1) * 0.5) * (attempt === 1 ? 1 : 0.5))
 *
 * Verified: tier 5, obscurity 5, length 10, attempt 1 → 180
 */
export function calculateScore(
  obscurity: number,
  length: number,
  tier: number,
  attempt: number,
): number {
  const base = obscurity * 10;
  const lengthMultiplier = 0.7 + length * 0.05;
  const tierMultiplier = 1 + (tier - 1) * 0.5;
  const attemptFactor = attempt === 1 ? 1 : 0.5;

  return Math.floor(base * lengthMultiplier * tierMultiplier * attemptFactor);
}

/* ===================================================================
   Tier & Rank Helpers
   =================================================================== */

/**
 * Derive the current tier from a streak value.
 * Walks the TIER_CONFIG from highest to lowest and returns the first
 * tier whose streak threshold is ≤ the given streak.
 */
export function getTierFromStreak(streak: number): number {
  for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
    if (streak >= TIER_CONFIG[i].streakRequired) {
      return TIER_CONFIG[i].tier;
    }
  }
  return 1; // fallback — should never happen
}

/**
 * Return the rank entry for a given session score.
 */
export function getRank(score: number): RankEntry {
  let rank = RANK_TITLES[0];
  for (const entry of RANK_TITLES) {
    if (score >= entry.minScore) {
      rank = entry;
    }
  }
  return rank;
}

/* ===================================================================
   Achievement Evaluation
   =================================================================== */

export interface AchievementContext {
  sessionScore: number;
  streak: number;
  tier: number;
  variant: string;
  wordLength: number;
  attempt: number;
  /** How many of the last N words were spelled correctly on the first attempt. */
  consecutiveFirstAttempt: number;
}

/**
 * Compare current game context against all achievement definitions.
 * Returns an array of newly-earned achievement keys (empty if none).
 */
export function evaluateAchievements(
  earned: Set<string>,
  ctx: AchievementContext,
): string[] {
  const newlyEarned: string[] = [];

  function award(key: string) {
    if (!earned.has(key)) {
      newlyEarned.push(key);
    }
  }

  // First Steps — score ≥ 10
  if (ctx.sessionScore >= 10) {
    award('first_steps');
  }

  // Perfect Start — streak ≥ 3 and all on first attempt
  // (streak is already incremented *after* correct; so streak >= 3 means 3 in a row)
  // We verify that consecutiveFirstAttempt covers the full streak
  if (ctx.streak >= 3 && ctx.consecutiveFirstAttempt >= 3) {
    award('perfect_start');
  }

  // Century Mark — 100 points in a single game
  if (ctx.sessionScore >= 100) {
    award('century_mark');
  }

  // Deep End — Tier 5
  if (ctx.tier >= 5) {
    award('deep_end');
  }

  // Clutch — correct on second attempt at Tier 4+
  if (ctx.tier >= 4 && ctx.attempt === 2) {
    award('clutch');
  }

  // Sharp Eye — 5 consecutive first-attempt correct answers
  if (ctx.consecutiveFirstAttempt >= 5) {
    award('sharp_eye');
  }

  // God Save the Queen — British, length ≥ 10, first attempt, Tier 3+
  if (
    ctx.variant === 'british' &&
    ctx.wordLength >= 10 &&
    ctx.attempt === 1 &&
    ctx.tier >= 3
  ) {
    award('god_save_the_queen');
  }

  // Stars and Stripes — American, length ≥ 10, first attempt, Tier 3+
  if (
    ctx.variant === 'american' &&
    ctx.wordLength >= 10 &&
    ctx.attempt === 1 &&
    ctx.tier >= 3
  ) {
    award('stars_and_stripes');
  }

  // Lexicographer — reach the Lexicographer rank (2,500+)
  if (ctx.sessionScore >= 2500) {
    award('lexicographer');
  }

  return newlyEarned;
}
