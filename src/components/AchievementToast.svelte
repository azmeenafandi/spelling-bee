<script lang="ts">
  import { onDestroy } from 'svelte';
  import { slide } from 'svelte/transition';

  let { achievement = null }: { achievement?: { key: string; name: string; emoji: string } | null } = $props();

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let visible = $state(false);
  let currentAchievement: { key: string; name: string; emoji: string } | null = $state(null);

  $effect(() => {
    if (achievement) {
      // New achievement arrived — dismiss current if any, show new one
      clearTimeout(timer);
      visible = false;
      currentAchievement = achievement;

      // Small delay for exit transition before re-entering
      setTimeout(() => {
        visible = true;
        startDismissTimer();
      }, 50);
    }
  });

  function startDismissTimer() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      visible = false;
      currentAchievement = null;
    }, 3000);
  }

  onDestroy(() => {
    clearTimeout(timer);
  });
</script>

{#if visible && currentAchievement}
  <div
    class="toast"
    role="status"
    aria-live="polite"
    transition:slide={{ duration: prefersReducedMotion ? 0 : 300, axis: 'y' }}
  >
    <span class="toast-emoji">{currentAchievement.emoji}</span>
    <span class="toast-name">{currentAchievement.name}</span>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    top: var(--space-4);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-toast);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-surface);
    border: 1px solid var(--color-background);
    border-radius: var(--radius);
    padding: var(--space-3) var(--space-5);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    pointer-events: none;
    max-width: calc(100vw - 2 * var(--space-4));
  }

  .toast-emoji {
    font-size: var(--font-size-lg);
    line-height: 1;
    flex-shrink: 0;
  }

  .toast-name {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 375px) {
    .toast {
      padding: var(--space-2) var(--space-4);
      top: var(--space-3);
    }

    .toast-emoji {
      font-size: var(--font-size-md);
    }

    .toast-name {
      font-size: var(--font-size-xs);
    }
  }
</style>
