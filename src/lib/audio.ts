/**
 * Sound effects & haptic feedback for Spelling Bee.
 *
 * All tones are synthesized with the Web Audio API — no external files.
 * Every exported function is a safe no-op when:
 *   - the document is SSR (`typeof window === 'undefined'`)
 *   - `prefers-reduced-motion: reduce` is active
 *   - the AudioContext has not been created yet (call initAudio first)
 */

let ctx: AudioContext | null = null;

/** Respect user motion preferences (checked once per call). */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------------------ */
/*  Initialisation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Must be called once after a user gesture (click / tap) so browsers
 * allow audio playback. Creates the AudioContext.
 */
export function initAudio(): void {
  try {
    if (typeof window === 'undefined') return;
    if (!ctx) {
      ctx = new AudioContext();
    }
    // Resume if suspended (autoplay policy after first gesture)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        /* silent — browser may still block */
      });
    }
  } catch {
    /* Web Audio not supported — all play functions will silently no-op */
  }
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/** Play a single tone at the given frequency. */
function playTone(
  frequency: number,
  startTime: number,
  duration: number,
  {
    type = 'sine' as OscillatorType,
    gain = 0.3,
    decay = false,
  } = {},
): void {
  if (!ctx || prefersReducedMotion()) return;

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(gain, startTime);

  if (decay) {
    // Exponential decay — floor at 0.001 to avoid clicking
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  } else {
    // Linear fade-out in the last 10% for a clean release
    const fadeStart = startTime + duration * 0.8;
    gainNode.gain.setValueAtTime(gain, fadeStart);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
  }

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01); // tiny buffer
}

/* ------------------------------------------------------------------ */
/*  Public play functions                                              */
/* ------------------------------------------------------------------ */

/** Bright ascending chime — two quick notes (C5 → E5). */
export function playCorrect(): void {
  if (!ctx || prefersReducedMotion()) return;
  try {
    const now = ctx.currentTime;
    playTone(523.25, now, 0.10);       // C5
    playTone(659.26, now + 0.10, 0.10); // E5
  } catch {
    /* ignore */
  }
}

/** Low dull thud — C3 with rapid decay. */
export function playWrong(): void {
  if (!ctx || prefersReducedMotion()) return;
  try {
    const now = ctx.currentTime;
    playTone(130.81, now, 0.20, { gain: 0.35, decay: true });
  } catch {
    /* ignore */
  }
}

/** Ascending fanfare — three notes (C4 → E4 → G4). */
export function playTierUp(): void {
  if (!ctx || prefersReducedMotion()) return;
  try {
    const now = ctx.currentTime;
    const noteDuration = 0.08;
    const gap = 0.11; // 80 ms note + 30 ms gap
    playTone(261.63, now, noteDuration);                  // C4
    playTone(329.63, now + gap, noteDuration);            // E4
    playTone(392.0, now + gap * 2, noteDuration);        // G4
  } catch {
    /* ignore */
  }
}

/** Soft descending tone — E4 → C4. */
export function playGameOver(): void {
  if (!ctx || prefersReducedMotion()) return;
  try {
    const now = ctx.currentTime;
    playTone(329.63, now, 0.20, { gain: 0.2 });          // E4
    playTone(261.63, now + 0.20, 0.20, { gain: 0.2 });   // C4
  } catch {
    /* ignore */
  }
}

/** Distinctive sparkle — high shimmer with frequency wobble. */
export function playAchievement(): void {
  if (!ctx || prefersReducedMotion()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    // Start at C6 and wobble ±20 Hz via LFO
    osc.frequency.setValueAtTime(1046.5, now);

    // Subtle frequency wobble for shimmer
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(8, now);   // 8 Hz wobble
    lfoGain.gain.setValueAtTime(20, now);   // ±20 Hz depth
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Quick attack → sustain → fade
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gainNode.gain.setValueAtTime(0.25, now + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);
    osc.stop(now + 0.42);
    lfo.stop(now + 0.42);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Haptic feedback                                                    */
/* ------------------------------------------------------------------ */

/** Short vibration pulse (15 ms) — no-op on desktop or if unsupported. */
export function triggerHaptic(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  } catch {
    /* ignore */
  }
}
