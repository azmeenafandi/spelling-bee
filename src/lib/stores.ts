/**
 * Svelte writable stores for Spelling Bee.
 *
 * Persisted stores (variant, highScore, achievements) sync to localStorage
 * via the storage module on every set(). On module load, initial values are
 * read from localStorage.
 *
 * Session stores are ephemeral — lost on page refresh / game over.
 */

import { writable } from 'svelte/store';
import {
  loadPersistedState,
  saveVariant,
  saveHighScore,
  saveAchievements,
} from './storage';

/* ------------------------------------------------------------------
   Persisted stores — backed by localStorage
   ------------------------------------------------------------------ */

const persisted = loadPersistedState();

/**
 * Selected spelling variant. Persisted.
 */
export const variant = writable<'british' | 'american'>(persisted.variant);
variant.subscribe((v) => saveVariant(v));

/**
 * All-time high score. Persisted.
 */
export const highScore = writable<number>(persisted.highScore);
highScore.subscribe((v) => saveHighScore(v));

/**
 * Set of earned achievement keys. Persisted forever.
 */
export const achievements = writable<Set<string>>(persisted.achievements);
achievements.subscribe((v) => saveAchievements(v));

/* ------------------------------------------------------------------
   Session stores — ephemeral
   ------------------------------------------------------------------ */

/** Points accumulated in the current game session. */
export const sessionScore = writable<number>(0);

/** Current consecutive correct streak. */
export const streak = writable<number>(0);

/** Current tier (1–6). Derived from streak but stored separately for reactivity. */
export const currentTier = writable<number>(1);

/** Word IDs already played this session. Prevents repeats. */
export const playedIds = writable<Set<number>>(new Set());

/**
 * The current word awaiting a spelling attempt.
 * Contains only the data needed for display + speech — never the correct
 * spelling (that is held server-side until game over).
 */
export const currentWord = writable<{
  id: number;
  definition: string;
  _spelling: string;
  _obscurity: number;
  _length: number;
} | null>(null);

/**
 * Finite-state machine for the game flow.
 *
 * variant-select → playing → checking → playing (loop)
 *                         ↘ wrong → playing (retry same word)
 *                         ↘ wrong (2nd attempt) → game-over
 * game-over → variant-select (Play Again)
 */
export const gameState = writable<
  'variant-select' | 'loading' | 'playing' | 'checking' | 'wrong' | 'game-over'
>('variant-select');

/** Which attempt the player is on for the current word (1 or 2). */
export const currentAttempt = writable<number>(1);
