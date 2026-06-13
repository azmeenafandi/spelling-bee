<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let definition: string;
  export let wordId: number;

  const dispatch = createEventDispatcher<{ report: number }>();

  function handleReport() {
    dispatch('report', wordId);
  }
</script>

{#if definition}
  <div class="definition-card">
    <p class="definition-text">{definition}</p>
    <button
      class="report-flag"
      on:click={handleReport}
      aria-label="Report this definition"
      title="Report an issue"
    >
      🚩
    </button>
  </div>
{/if}

<style>
  .definition-card {
    position: relative;
    background: var(--color-surface);
    border-radius: var(--radius);
    padding: var(--space-6) var(--space-6) var(--space-5);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .definition-text {
    font-size: var(--font-size-xl);
    line-height: 1.6;
    text-align: center;
    color: var(--color-text-primary);
    padding-right: var(--space-6);
    overflow-wrap: break-word;
    word-wrap: break-word;
  }

  .report-flag {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    background: none;
    border: none;
    font-size: var(--font-size-sm);
    cursor: pointer;
    opacity: 0.3;
    transition: opacity var(--transition);
    padding: var(--space-1);
    line-height: 1;
    border-radius: var(--radius);
  }

  .report-flag:hover,
  .report-flag:focus-visible {
    opacity: 1;
  }

  .report-flag:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 375px) {
    .definition-text {
      font-size: var(--font-size-lg);
    }
  }
</style>
