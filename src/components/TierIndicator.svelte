<script lang="ts">
  export let tier: number = 1;
  export let streak: number = 0;
  export let nextTierAt: number = 3;
  export let animating: boolean = false;

  const MAX_TIER = 6;

  $: isMaxTier = tier >= MAX_TIER;

  // Progress toward next tier: percentage of streak relative to nextTierAt
  $: progress = isMaxTier ? 100 : Math.min((streak / nextTierAt) * 100, 100);

  // Tier-up animation state
  let shimmer = false;

  $: if (animating) {
    shimmer = true;
    const timeout = setTimeout(() => {
      shimmer = false;
    }, 800);
  }
</script>

<div class="tier-strip" class:shimmer>
  <div class="tier-label">
    {#if isMaxTier}
      <span class="crown" aria-hidden="true">👑</span>
      <span class="tier-text">MAX TIER</span>
    {:else}
      <span class="tier-text">Tier {tier}</span>
    {/if}
  </div>

  <div class="progress-track">
    <div
      class="progress-fill"
      class:animate={animating}
      style="width: {progress}%"
    ></div>
  </div>

  {#if !isMaxTier}
    <span class="streak-info">{streak}/{nextTierAt}</span>
  {/if}
</div>

<style>
  .tier-strip {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface);
    border-radius: var(--radius);
  }

  @media (prefers-reduced-motion: no-preference) {
    .tier-strip {
      transition: box-shadow 0.3s ease;
    }

    .tier-strip.shimmer {
      animation: shimmerGlow 0.8s ease;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tier-strip.shimmer {
      animation: none;
      box-shadow: none;
    }
  }

  .tier-label {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .crown {
    font-size: var(--font-size-md);
    line-height: 1;
  }

  .tier-text {
    font-size: var(--font-size-xs);
    font-weight: 700;
    color: var(--color-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .progress-track {
    flex: 1;
    height: 6px;
    background: var(--color-background);
    border-radius: 3px;
    overflow: hidden;
    min-width: 60px;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  @media (prefers-reduced-motion: no-preference) {
    .progress-fill.animate {
      animation: tierUpPulse 0.6s ease;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .progress-fill.animate {
      animation: none;
    }
  }

  .streak-info {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-secondary);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  @media (prefers-reduced-motion: no-preference) {
    @keyframes shimmerGlow {
      0% {
        box-shadow: 0 0 0 0 color-mix(in oklch, var(--color-primary) 0%, transparent);
      }
      30% {
        box-shadow: 0 0 12px 2px color-mix(in oklch, var(--color-primary) 30%, transparent);
      }
      100% {
        box-shadow: 0 0 0 0 color-mix(in oklch, var(--color-primary) 0%, transparent);
      }
    }

    @keyframes tierUpPulse {
      0% {
        transform: scaleY(1);
      }
      40% {
        transform: scaleY(1.8);
      }
      100% {
        transform: scaleY(1);
      }
    }
  }

  @media (max-width: 375px) {
    .tier-strip {
      padding: var(--space-1) var(--space-3);
      gap: var(--space-2);
    }

    .tier-text {
      font-size: var(--font-size-xs);
    }

    .progress-track {
      height: 5px;
    }

    .streak-info {
      font-size: var(--font-size-xs);
    }
  }
</style>
