<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import type { RankEntry } from '$lib/game';
  import { generateGameShareCard, shareResults } from '$lib/share';

  let {
    sessionScore,
    highScore,
    isNewHighScore,
    answer,
    rank,
    newAchievements = [],
    wordId,
    wordsTotal = 0,
    wordsCorrect = 0,
    attemptPattern = [],
    streak = 0,
    tier = 1,
    onRestart,
    onReport,
  }: {
    sessionScore: number;
    highScore: number;
    isNewHighScore: boolean;
    answer: string;
    rank: RankEntry;
    newAchievements: Array<{ key: string; name: string; emoji: string }>;
    wordId: number;
    wordsTotal: number;
    wordsCorrect: number;
    attemptPattern: Array<'correct' | 'second' | 'wrong'>;
    streak: number;
    tier: number;
    onRestart: () => void;
    onReport: (wordId: number) => void;
  } = $props();

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let shareCopied = $state(false);
  let shareTimeout: ReturnType<typeof setTimeout> | undefined;

  let confettiPieces: Array<{
    id: number;
    x: number;
    delay: number;
    duration: number;
    color: string;
    rotation: number;
  }> = $state([]);

  const CONFETTI_COLORS = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-error)', 'var(--color-secondary)'];

  onMount(() => {
    if (isNewHighScore) {
      confettiPieces = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.5 + Math.random() * 1.5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
      }));
    }
  });

  function handleReport() {
    onReport(wordId);
  }

  function handleRestart() {
    onRestart();
  }

  async function handleShare() {
    const { text, url } = generateGameShareCard({
      date: new Date().toISOString().slice(0, 10),
      score: sessionScore,
      rank: `${rank.emoji} ${rank.title}`,
      streak: streak,
      tier: tier,
      wordsAttempted: wordsTotal,
      wordsCorrect: wordsCorrect,
      attemptPattern,
    });
    const ok = await shareResults(text, url);
    if (ok) {
      shareCopied = true;
      clearTimeout(shareTimeout);
      shareTimeout = setTimeout(() => {
        shareCopied = false;
      }, 2000);
    }
  }

  let pointsBehind = $derived(Math.max(0, highScore - sessionScore));
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" transition:fade={{ duration: prefersReducedMotion ? 0 : 300 }}>
  <div class="sheet" transition:fly={{ y: 80, duration: prefersReducedMotion ? 0 : 400, delay: prefersReducedMotion ? 0 : 50 }}>
    <h1 class="heading">Game Over</h1>

    <div class="answer-section">
      <p class="answer-label">The word was:</p>
      <p class="answer-word">{answer}</p>
      <button
        class="report-word"
        onclick={handleReport}
        aria-label="Report an issue with this word"
        title="Report an issue"
      >
        🚩 Report
      </button>
    </div>

    {#if isNewHighScore}
      <div class="high-score-banner">
        <span class="trophy">🏆</span>
        <span class="high-score-text">NEW HIGH SCORE!</span>
      </div>
    {:else}
      <p class="best-score">
        Best: {highScore.toLocaleString()} — you were {pointsBehind.toLocaleString()} points short
      </p>
    {/if}

    <div class="score-display">
      <span class="score-value">{sessionScore.toLocaleString()}</span>
      <span class="score-label">points</span>
    </div>

    <div class="rank-display">
      <span class="rank-emoji">{rank.emoji}</span>
      <span class="rank-title">{rank.title}</span>
    </div>

    {#if newAchievements.length > 0}
      <div class="achievements-section">
        <h2 class="achievements-heading">Achievements Unlocked</h2>
        <ul class="achievements-list">
          {#each newAchievements as ach (ach.key)}
            <li class="achievement-item">
              <span class="achievement-emoji">{ach.emoji}</span>
              <span class="achievement-name">{ach.name}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <button class="play-again-btn" onclick={handleRestart}>
      Play Again
    </button>

    <button class="share-btn" onclick={handleShare}>
      📤 {shareCopied ? 'Copied!' : 'Share Results'}
    </button>
  </div>
</div>

{#if isNewHighScore && confettiPieces.length > 0}
  <div class="confetti-container" aria-hidden="true">
    {#each confettiPieces as piece (piece.id)}
      <div
        class="confetti-piece"
        style="
          left: {piece.x}%;
          animation-delay: {piece.delay}s;
          animation-duration: {piece.duration}s;
          background: {piece.color};
          --rotation: {piece.rotation}deg;
        "
      ></div>
    {/each}
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    padding: var(--space-4);
  }

  .sheet {
    background: var(--color-surface);
    border-radius: calc(var(--radius) * 2);
    padding: var(--space-8) var(--space-6);
    width: 100%;
    max-width: 400px;
    max-height: 90dvh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
  }

  .heading {
    font-size: var(--font-size-2xl);
    font-weight: 800;
    color: var(--color-text-primary);
  }

  .answer-section {
    text-align: center;
  }

  .answer-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-1);
  }

  .answer-word {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-primary);
    word-break: break-word;
  }

  .report-word {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-top: var(--space-2);
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-family: inherit;
    font-size: var(--font-size-xs);
    cursor: pointer;
    opacity: 0.6;
    transition: opacity var(--transition);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius);
  }

  .report-word:hover,
  .report-word:focus-visible {
    opacity: 1;
  }

  .report-word:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .high-score-banner {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: linear-gradient(135deg, color-mix(in oklch, var(--color-warning) 15%, transparent), color-mix(in oklch, var(--color-secondary) 20%, transparent));
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius);
    animation: bannerPulse 1s ease-in-out infinite alternate;
  }

  .trophy {
    font-size: var(--font-size-xl);
    line-height: 1;
  }

  .high-score-text {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: color-mix(in oklch, var(--color-secondary) 80%, black);
    letter-spacing: 0.03em;
  }

  .best-score {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-align: center;
  }

  .score-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .score-value {
    font-size: var(--font-size-2xl);
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1;
  }

  .score-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rank-display {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-background);
    border-radius: var(--radius);
  }

  .rank-emoji {
    font-size: var(--font-size-lg);
    line-height: 1;
  }

  .rank-title {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-secondary);
  }

  .achievements-section {
    width: 100%;
    border-top: 1px solid var(--color-background);
    padding-top: var(--space-4);
  }

  .achievements-heading {
    font-size: var(--font-size-xs);
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
    margin-bottom: var(--space-3);
  }

  .achievements-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .achievement-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-background);
    border-radius: var(--radius);
  }

  .achievement-emoji {
    font-size: var(--font-size-md);
    line-height: 1;
    flex-shrink: 0;
  }

  .achievement-name {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .play-again-btn {
    width: 100%;
    padding: var(--space-4);
    background: var(--color-primary);
    color: var(--color-surface);
    border: none;
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-md);
    font-weight: 700;
    cursor: pointer;
    transition: transform var(--transition);
    min-height: 52px;
    margin-top: var(--space-2);
  }

  .play-again-btn:hover {
    transform: translateY(-1px);
  }

  .play-again-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .share-btn {
    width: 100%;
    padding: var(--space-4);
    background: var(--color-background);
    color: var(--color-text-primary);
    border: 1px solid color-mix(in oklch, var(--color-text-secondary) 30%, transparent);
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-md);
    font-weight: 700;
    cursor: pointer;
    transition: transform var(--transition), background var(--transition);
    min-height: 52px;
  }

  .share-btn:hover {
    transform: translateY(-1px);
    background: color-mix(in oklch, var(--color-background) 90%, var(--color-primary));
  }

  .share-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Confetti */
  .confetti-container {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: calc(var(--z-overlay) + 1);
    overflow: hidden;
  }

  .confetti-piece {
    position: absolute;
    top: -10px;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    animation: confettiFall linear forwards;
    opacity: 0.9;
  }

  @media (prefers-reduced-motion: no-preference) {
    @keyframes confettiFall {
      0% {
        transform: translateY(0) rotate(0deg) scale(1);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(720deg) scale(0.5);
        opacity: 0;
      }
    }

    @keyframes bannerPulse {
      0% {
        transform: scale(1);
      }
      100% {
        transform: scale(1.03);
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .confetti-piece {
      animation: none;
      opacity: 0;
    }

    .high-score-banner {
      animation: none;
    }
  }

  @media (max-width: 375px) {
    .sheet {
      padding: var(--space-6) var(--space-4);
      gap: var(--space-4);
      max-height: 85dvh;
    }

    .heading {
      font-size: var(--font-size-xl);
    }

    .score-value {
      font-size: var(--font-size-xl);
    }
  }
</style>
