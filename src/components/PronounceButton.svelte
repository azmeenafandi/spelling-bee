<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { speakWord } from '$lib/speech';

  export let spelling: string;
  export let lang: 'en-GB' | 'en-US' = 'en-GB';
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher<{ speaking: void; done: void }>();

  $: speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  let speaking = false;

  async function handlePronounce() {
    if (disabled || speaking || !speechSupported) return;

    speaking = true;
    dispatch('speaking');

    try {
      await speakWord(spelling, lang);
    } catch {
      // Speech error — silently recover
    } finally {
      speaking = false;
      dispatch('done');
    }
  }
</script>

<button
  class="pronounce-btn"
  class:speaking
  disabled={disabled || !speechSupported}
  on:click={handlePronounce}
  aria-label={speechSupported ? 'Pronounce word' : 'Speech not supported'}
  title={!speechSupported ? 'Speech not supported' : undefined}
>
  <span class="icon" aria-hidden="true">🔊</span>
  <span class="label">Pronounce</span>
</button>

<style>
  .pronounce-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-surface);
    border: 2px solid var(--color-primary);
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-4);
    color: var(--color-primary);
    font-size: var(--font-size-sm);
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: opacity var(--transition), background var(--transition),
      transform var(--transition);
    min-height: 44px;
  }

  .pronounce-btn:hover:not(:disabled),
  .pronounce-btn:focus-visible:not(:disabled) {
    background: var(--color-primary);
    color: var(--color-surface);
  }

  .pronounce-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .pronounce-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pronounce-btn.speaking {
    opacity: 0.6;
    border-color: var(--color-secondary);
    color: var(--color-secondary);
    animation: pulse 0.8s ease-in-out infinite;
  }

  .icon {
    font-size: var(--font-size-md);
    line-height: 1;
  }

  .label {
    font-size: var(--font-size-sm);
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.08);
    }
  }

  @media (max-width: 375px) {
    .pronounce-btn {
      padding: var(--space-2) var(--space-3);
    }
  }
</style>
