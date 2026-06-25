/**
 * localStorage helpers for Spelling Bee persistence layer.
 *
 * Persisted keys:
 *   spelling-bee:variant        — 'british' | 'american'
 *   spelling-bee:high-score     — number (JSON-encoded)
 *   spelling-bee:achievements   — string[] (JSON-encoded Set)
 */

const KEYS = {
  variant: 'spelling-bee:variant',
  highScore: 'spelling-bee:high-score',
  achievements: 'spelling-bee:achievements',
  dailyResult: 'spelling-bee:daily-result',
  theme: 'spelling-bee:theme',
} as const;

type Theme = 'system' | 'light' | 'dark';

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    /* silent */
  }
}

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEYS.theme);
    if (v === 'system' || v === 'light' || v === 'dark') return v;
  } catch {
    /* unavailable */
  }
  return 'system';
}

type Variant = 'british' | 'american';

/* ------------------------------------------------------------------
   Individual getters / setters
   ------------------------------------------------------------------ */

export function loadPersistedState(): {
  variant: Variant;
  highScore: number;
  achievements: Set<string>;
} {
  const variant = readVariant();
  const highScore = readHighScore();
  const achievements = readAchievements();
  return { variant, highScore, achievements };
}

// ── Daily result persistence ──
// Stored as { [date: string]: boolean } where true = correct

type DailyResults = Record<string, boolean>;

function readDailyResults(): DailyResults {
  try {
    const raw = localStorage.getItem(KEYS.dailyResult);
    if (raw !== null) {
      const obj = JSON.parse(raw);
      if (typeof obj === 'object' && obj !== null) return obj as DailyResults;
    }
  } catch {
    /* unavailable */
  }
  return {};
}

function writeDailyResults(data: DailyResults): void {
  try {
    localStorage.setItem(KEYS.dailyResult, JSON.stringify(data));
  } catch {
    /* silent */
  }
}

/** Save whether the player got today's daily word right or wrong. */
export function saveDailyResult(date: string, correct: boolean): void {
  const results = readDailyResults();
  results[date] = correct;
  writeDailyResults(results);
}

/** Return true (correct), false (wrong), or null (not attempted). */
export function getDailyResult(date: string): boolean | null {
  const results = readDailyResults();
  if (date in results) return results[date];
  return null;
}

export function saveVariant(v: Variant): void {
  try {
    localStorage.setItem(KEYS.variant, v);
  } catch {
    /* storage full or unavailable — silent no-op */
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(KEYS.highScore, JSON.stringify(score));
  } catch {
    /* silent */
  }
}

export function saveAchievements(achievements: Set<string>): void {
  try {
    localStorage.setItem(KEYS.achievements, JSON.stringify([...achievements]));
  } catch {
    /* silent */
  }
}

/* ------------------------------------------------------------------
   Export / Import — full round-trip as JSON
   ------------------------------------------------------------------ */

export function exportData(): string {
  return JSON.stringify({
    variant: readVariant(),
    highScore: readHighScore(),
    achievements: [...readAchievements()],
  });
}

export function importData(json: string): boolean {
  try {
    const data = JSON.parse(json) as {
      variant?: string;
      highScore?: number;
      achievements?: string[];
    };

    if (data.variant === 'british' || data.variant === 'american') {
      saveVariant(data.variant);
    }
    if (typeof data.highScore === 'number' && data.highScore >= 0) {
      saveHighScore(data.highScore);
    }
    if (Array.isArray(data.achievements)) {
      saveAchievements(new Set(data.achievements));
    }

    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------
   Private helpers
   ------------------------------------------------------------------ */

function readVariant(): Variant {
  try {
    const v = localStorage.getItem(KEYS.variant);
    if (v === 'british' || v === 'american') return v;
  } catch {
    /* unavailable */
  }
  return 'british';
}

function readHighScore(): number {
  try {
    const raw = localStorage.getItem(KEYS.highScore);
    if (raw !== null) {
      const n = JSON.parse(raw);
      if (typeof n === 'number' && n >= 0) return n;
    }
  } catch {
    /* unavailable */
  }
  return 0;
}

function readAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem(KEYS.achievements);
    if (raw !== null) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {
    /* unavailable */
  }
  return new Set();
}
