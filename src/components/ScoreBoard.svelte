<script lang="ts">
  import type { RankEntry } from '$lib/game';

  export let sessionScore: number = 0;
  export let highScore: number = 0;
  export let rank: RankEntry = { minScore: 0, title: 'Apprentice', emoji: '🥚' };

  let prevScore = 0;
  let animate = false;

  // Trigger scale animation when score changes
  $: if (sessionScore !== prevScore) {
    animate = true;
    prevScore = sessionScore;
    const timeout = setTimeout(() => {
      animate = false;
    }, 300);
  }
</script>

<div class="scoreboard">
  <div class="score-block session">
    <span class="score-label">SCORE</span>
    <span class="score-value" class:animate>{sessionScore.toLocaleString()}</span>
  </div>

  <div class="rank-block">
    <span class="rank-emoji">{rank.emoji}</span>
    <span class="rank-title">{rank.title}</span>
  </div>

  <div class="score-block best">
    <span class="score-label">BEST</span>
    <span class="score-value secondary">{highScore.toLocaleString()}</span>
  </div>
</div>

<style>
  .scoreboard {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-surface);
    border-radius: var(--radius);
    padding: var(--space-3) var(--space-4);
    gap: var(--space-2);
  }

  .score-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
  }

  .score-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .score-value {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1.2;
    transition: transform 0.3s ease;
  }

  .score-value.animate {
    animation: scorePop 0.3s ease;
  }

  .score-value.secondary {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .rank-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  .rank-emoji {
    font-size: var(--font-size-xl);
    line-height: 1;
  }

  .rank-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  @keyframes scorePop {
    0% {
      transform: scale(1);
    }
    40% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }

  @media (max-width: 375px) {
    .scoreboard {
      padding: var(--space-2) var(--space-3);
    }

    .score-value {
      font-size: var(--font-size-lg);
    }

    .score-value.secondary {
      font-size: var(--font-size-sm);
    }

    .rank-emoji {
      font-size: var(--font-size-lg);
    }
  }
</style>
