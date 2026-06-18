<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let attempt: number = 1;
  export let disabled: boolean = false;
  export let error: boolean = false;
  export let correctFlash: 'green' | 'amber' | null = null;

  const dispatch = createEventDispatcher<{ spelling: string }>();

  let inputEl: HTMLInputElement;
  let shake = false;

  $: placeholder =
    attempt === 1 ? 'Type your spelling...' : 'One more try...';

  // Trigger shake animation when error prop becomes true
  $: if (error) {
    shake = true;
    // Reset shake after animation completes
    const timeout = setTimeout(() => {
      shake = false;
    }, 500);
  }

  onMount(() => {
    inputEl?.focus();
  });

  function handleSubmit() {
    if (disabled || !inputEl) return;

    const value = inputEl.value.trim();
    if (value.length === 0) return;

    dispatch('spelling', value);
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
    spellcheck="false"
    on:keydown={handleKeydown}
    class="spelling-input"
    aria-label="Type your spelling"
  />
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
    animation: shake 0.5s ease-in-out;
  }

  .correct-green .spelling-input {
    border-color: var(--color-success);
    animation: flashGreen 0.5s ease forwards;
  }

  .correct-amber .spelling-input {
    border-color: var(--color-warning);
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

  @media (max-width: 375px) {
    .spelling-input {
      font-size: 16px;
      padding: var(--space-2) var(--space-3);
    }
  }
</style>
