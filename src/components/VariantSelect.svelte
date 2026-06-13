<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { variant } from '$lib/stores';

  const dispatch = createEventDispatcher<{ start: void }>();

  let selected: 'british' | 'american' | null = $variant || null;

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function selectVariant(v: 'british' | 'american') {
    selected = v;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      $variant = v;
    }, 50);
  }

  function handleStart() {
    if (!selected) return;
    dispatch('start');
  }
</script>

<div class="variant-screen">
  <div class="header">
    <h1 class="title">Spelling Bee</h1>
    <p class="subtitle">Choose your spelling rules</p>
  </div>

  <div class="cards">
    <button
      class="card"
      class:selected={selected === 'british'}
      on:click={() => selectVariant('british')}
      aria-pressed={selected === 'british'}
    >
      <span class="card-flag">🇬🇧</span>
      <span class="card-label">British English</span>
    </button>

    <button
      class="card"
      class:selected={selected === 'american'}
      on:click={() => selectVariant('american')}
      aria-pressed={selected === 'american'}
    >
      <span class="card-flag">🇺🇸</span>
      <span class="card-label">American English</span>
    </button>
  </div>

  <button
    class="start-btn"
    disabled={!selected}
    on:click={handleStart}
  >
    Start Game
  </button>
</div>

<style>
  .variant-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    padding: var(--space-6);
    gap: var(--space-8);
  }

  .header {
    text-align: center;
  }

  .title {
    font-size: var(--font-size-2xl);
    font-weight: 800;
    color: var(--color-primary);
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-top: var(--space-2);
  }

  .cards {
    display: flex;
    gap: var(--space-4);
    width: 100%;
    max-width: 360px;
  }

  .card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6) var(--space-4);
    background: var(--color-surface);
    border: 2px solid transparent;
    border-radius: var(--radius);
    cursor: pointer;
    transition:
      border-color var(--transition),
      box-shadow var(--transition),
      transform var(--transition);
    font-family: inherit;
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    min-height: 120px;
    justify-content: center;
  }

  .card:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .card:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .card.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .card-flag {
    font-size: 2.5rem;
    line-height: 1;
  }

  .card-label {
    font-weight: 600;
    font-size: var(--font-size-xs);
    text-align: center;
    line-height: 1.3;
  }

  .start-btn {
    width: 100%;
    max-width: 360px;
    padding: var(--space-4);
    background: var(--color-primary);
    color: #ffffff;
    border: none;
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-md);
    font-weight: 700;
    cursor: pointer;
    transition: opacity var(--transition), transform var(--transition);
    min-height: 52px;
  }

  .start-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .start-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .start-btn:not(:disabled):hover {
    transform: translateY(-1px);
  }

  @media (max-width: 375px) {
    .variant-screen {
      padding: var(--space-4);
      gap: var(--space-6);
    }

    .title {
      font-size: var(--font-size-xl);
    }

    .cards {
      gap: var(--space-3);
    }

    .card {
      padding: var(--space-4) var(--space-3);
      min-height: 100px;
    }

    .card-flag {
      font-size: 2rem;
    }
  }
</style>
