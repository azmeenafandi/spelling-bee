<script lang="ts">
  import { onMount } from 'svelte';

  let {
    attempt = 1,
    disabled = false,
    error = false,
    correctFlash = null,
    onSpelling,
  }: {
    attempt?: number;
    disabled?: boolean;
    error?: boolean;
    correctFlash?: 'green' | 'amber' | null;
    onSpelling?: (spelling: string) => void;
  } = $props();

  let inputEl: HTMLInputElement | undefined = $state();
  let shake = $state(false);

  let placeholder = $derived(
    attempt === 1 ? 'Type your spelling...' : 'One more try...'
  );

  // Trigger shake animation when error prop becomes true
  $effect(() => {
    if (error) {
      shake = true;
      const timeout = setTimeout(() => {
        shake = false;
      }, 500);
      return () => clearTimeout(timeout);
    }
  });

  onMount(() => {
    inputEl?.focus();
  });

  function handleSubmit() {
    if (disabled || !inputEl) return;

    const value = inputEl.value.trim();
    if (value.length === 0) return;

    onSpelling?.(value);
    inputEl.value = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }
</script>

<div class="input-wrapper" class:error={shake} class:correct-green={correctFlash === 'green'} class:correct-amber={correctFlash === 'amber'}>
  <input
    bind:this={inputEl}
    type="text"
    {placeholder}
    {disabled}
    autocomplete="off"
    autocapitalize="off"
    autocorrect="off"
    spellcheck="false"
    onkeydown={handleKeydown}
    class="spelling-input"
    aria-label="Type your spelling"
  />
  {#if correctFlash === 'green'}
    <span class="status-icon correct" aria-label="Correct">✓</span>
  {:else if correctFlash === 'amber'}
    <span class="status-icon warning" aria-label="Correct on second try">⚠</span>
  {:else if shake}
    <span class="status-icon error" aria-label="Incorrect">✗</span>
  {/if}
</div>

<style>
  .input-wrapper {
    position: relative;
  }

  .spelling-input {
    width: 100%;
    font-size: 16px; /* Prevents iOS zoom on focus */
    font-family: inherit;
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--color-text-secondary);
    border-radius: var(--radius);
    background: var(--color-surface);
    color: var(--color-text-primary);
    outline: none;
    transition: border-color var(--transition);
    min-height: 48px;
  }

  .spelling-input::placeholder {
    color: var(--color-text-secondary);
  }

  .status-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    line-height: 1;
    opacity: 0;
    animation: iconFadeIn 0.5s ease forwards;
    pointer-events: none;
  }

  .status-icon.correct {
    color: var(--color-success);
  }

  .status-icon.warning {
    color: var(--color-warning);
  }

  .status-icon.error {
    color: var(--color-error);
  }

  @keyframes iconFadeIn {
    0% {
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .status-icon {
      animation: none;
      opacity: 1;
    }
  }

  .spelling-input:focus {
    border-color: var(--color-primary);
  }

  .spelling-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--color-background);
  }

  .error .spelling-input {
    border-color: var(--color-error);
  }

  .correct-green .spelling-input {
    border-color: var(--color-success);
  }

  .correct-amber .spelling-input {
    border-color: var(--color-warning);
  }

  @media (prefers-reduced-motion: no-preference) {
    .error .spelling-input {
      animation: shake 0.5s ease-in-out;
    }

    .correct-green .spelling-input {
      animation: flashGreen 0.5s ease forwards;
    }

    .correct-amber .spelling-input {
      animation: flashAmber 0.5s ease forwards;
    }

    @keyframes shake {
      0%,
      100% {
        transform: translateX(0);
      }
      10%,
      50%,
      90% {
        transform: translateX(-6px);
      }
      30%,
      70% {
        transform: translateX(6px);
      }
    }

    @keyframes flashGreen {
      0% {
        border-color: var(--color-success);
        box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-success) 30%, transparent);
      }
      100% {
        border-color: var(--color-text-secondary);
        box-shadow: none;
      }
    }

    @keyframes flashAmber {
      0% {
        border-color: var(--color-warning);
        box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-warning) 30%, transparent);
      }
      100% {
        border-color: var(--color-text-secondary);
        box-shadow: none;
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .error .spelling-input {
      border-color: var(--color-error);
      animation: none;
    }

    .correct-green .spelling-input {
      border-color: var(--color-success);
      animation: none;
    }

    .correct-amber .spelling-input {
      border-color: var(--color-warning);
      animation: none;
    }
  }

  @media (max-width: 375px) {
    .spelling-input {
      font-size: 16px;
      padding: var(--space-2) var(--space-3);
    }
  }
</style>
