<script lang="ts">
  import { fade, fly, slide } from 'svelte/transition';
  import { fetchDaily, checkSpelling, type DailyResponse } from '$lib/api';
  import { saveDailyResult, getDailyResult } from '$lib/storage';
  import { generateDailyShareCard, shareResults } from '$lib/share';
  import { variant } from '$lib/stores';
  import PronounceButton from './PronounceButton.svelte';

  let { onClose }: { onClose?: () => void } = $props();

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── State ──
  let dailyWord: DailyResponse | null = $state(null);
  let loading = $state(false);
  let error: string | null = $state(null);
  let phase: 'idle' | 'playing' | 'result' = $state('idle');
  let attempt = $state('');
  let resultCorrect = $state(false);
  let submitted = $state(false);

  // ── Derived ──
  let today = $derived(new Date().toISOString().slice(0, 10));
  let monthName = $derived(new Date().toLocaleDateString('en-GB', { month: 'long', day: 'numeric' }));
  let lang = $derived(
    ($variant === 'british' ? 'en-GB' : 'en-US') as 'en-GB' | 'en-US'
  );
  let alreadyCompleted = $derived(getDailyResult(today));
  let sharePreview = $derived(() => {
    return generateDailyShareCard({
      date: today,
      correct: alreadyCompleted === true,
    });
  });
  let shareUrl = $derived(sharePreview().url);
  let shareCopied = $state(false);

  // ── Actions ──
  async function startDaily() {
    loading = true;
    error = null;
    try {
      dailyWord = await fetchDaily($variant);
      phase = 'playing';
    } catch (err) {
      error = 'Could not load today\'s challenge. Try again?';
    } finally {
      loading = false;
    }
  }

  async function submitAttempt() {
    if (!attempt.trim() || !dailyWord || submitted) return;

    const result = await checkSpelling({
      id: dailyWord.id,
      spelling: attempt.trim(),
      attempt: 1,
    });

    resultCorrect = result.correct;
    saveDailyResult(today, result.correct);
    submitted = true;
    phase = 'result';

    // alreadyCompleted re-evaluates via $derived
  }

  function handleClose() {
    onClose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && phase === 'playing' && attempt.trim()) {
      submitAttempt();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" transition:fade={{ duration: prefersReducedMotion ? 0 : 300 }}>
  <button class="backdrop" onclick={handleClose} aria-label="Close daily challenge"></button>
  <div class="sheet" transition:fly={{ y: 80, duration: prefersReducedMotion ? 0 : 400, delay: prefersReducedMotion ? 0 : 50 }}>
    <button class="close-btn" onclick={handleClose} aria-label="Close daily challenge">✕</button>

    {#if alreadyCompleted !== null}
      <!-- ── Already completed ── -->
      <div class="daily-header">
        <span class="daily-icon">📅</span>
        <span class="daily-title">Daily Challenge — {monthName}</span>
      </div>
      <div class="daily-status">
        <span class="status-check">{alreadyCompleted ? '✅' : '❌'}</span>
        <span class="status-text">{alreadyCompleted ? 'Completed!' : 'Better luck tomorrow!'}</span>
      </div>
      <p class="daily-hint">Come back tomorrow for a new word</p>
      <div class="share-preview">
        <pre>{sharePreview().text}</pre>
      </div>
    {:else if phase === 'idle'}
      <!-- ── Not attempted: show card ── -->
      <div
        class="daily-prompt"
        role="button"
        tabindex="0"
        onclick={startDaily}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startDaily(); } }}
      >
        <div class="daily-header">
          <span class="daily-icon">📅</span>
          <span class="daily-title">Daily Challenge — {monthName}</span>
        </div>
        {#if loading}
          <p class="daily-hint">Loading…</p>
        {:else}
          <p class="daily-hint">One word. One chance. Ready?</p>
        {/if}
      </div>
    {:else if phase === 'playing' && dailyWord}
      <!-- ── Playing: definition + input ── -->
      <div class="daily-header">
        <span class="daily-icon">📅</span>
        <span class="daily-title">Daily Challenge — {monthName}</span>
      </div>

      <div class="daily-definition">
        <p>{dailyWord.definition}</p>
      </div>

      <div class="daily-pronounce">
        <PronounceButton
          spelling={dailyWord._spelling}
          {lang}
          disabled={false}
        />
      </div>

      <div class="daily-input-group">
        <!-- svelte-ignore a11y_autofocus -->
        <input
          type="text"
          class="daily-input"
          placeholder="Type your spelling…"
          bind:value={attempt}
          onkeydown={handleKeydown}
          autocomplete="off"
          autocapitalize="off"
          autofocus
        />
        <button
          class="daily-submit"
          onclick={submitAttempt}
          disabled={!attempt.trim()}
        >
          Enter
        </button>
      </div>
    {:else if phase === 'result'}
      <!-- ── Result ── -->
      <div class="daily-header">
        <span class="daily-icon">📅</span>
        <span class="daily-title">Daily Challenge — {monthName}</span>
      </div>

      {#if resultCorrect}
        <div class="result-success" in:fade={{ duration: 200 }}>
          <span class="result-emoji">✅</span>
          <span class="result-text">You got today's word!</span>
          {#if dailyWord}
            <span class="result-word">{dailyWord._spelling}</span>
          {/if}
        </div>
      {:else}
        <div class="result-fail" in:fade={{ duration: 200 }}>
          <span class="result-emoji">❌</span>
          <span class="result-text">Today's word was:</span>
          {#if dailyWord}
            <span class="result-word">{dailyWord._spelling}</span>
          {/if}
        </div>
      {/if}

      <button class="share-btn" onclick={async (e) => {
        e.stopPropagation();
        const { text, url } = sharePreview();
        const ok = await shareResults(text, url);
        if (ok) {
          shareCopied = true;
          setTimeout(() => { shareCopied = false; }, 2000);
        }
      }}>
        📤 {shareCopied ? 'Copied!' : 'Share'}
      </button>

      <div class="share-preview">
        <pre>{sharePreview().text}</pre>
      </div>
    {/if}
  </div>
</div>

{#if error}
  <div class="daily-error" transition:slide={{ duration: prefersReducedMotion ? 0 : 200 }}>
    <p>{error}</p>
    <button onclick={() => { error = null; phase = 'idle'; }}>Dismiss</button>
  </div>
{/if}

<style>
  /* ── Overlay ── */
  .overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    cursor: pointer;
    z-index: 0;
  }

  /* ── Sheet card ── */
  .sheet {
    position: relative;
    width: 100%;
    max-width: 360px;
    background: var(--color-surface);
    border-radius: calc(var(--radius) * 2);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    text-align: center;
    max-height: 90dvh;
    overflow-y: auto;
    font-family: inherit;
    color: var(--color-text-primary);
  }

  /* ── Close button ── */
  .close-btn {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: var(--color-background);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background var(--transition), color var(--transition);
    z-index: 1;
  }

  .close-btn:hover {
    background: var(--color-error);
    color: white;
  }

  /* ── Idle prompt (clickable area inside sheet) ── */
  .daily-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    cursor: pointer;
    border: 2px solid var(--color-secondary);
    border-radius: var(--radius);
    padding: var(--space-4);
    transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition);
  }

  .daily-prompt:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: var(--color-primary);
  }

  /* ── Header ── */
  .daily-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .daily-icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  .daily-title {
    font-weight: 700;
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }

  /* ── Hint ── */
  .daily-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 0;
  }

  /* ── Definition ── */
  .daily-definition {
    font-size: var(--font-size-md);
    color: var(--color-text-primary);
    line-height: 1.4;
    padding: 0 var(--space-2);
  }

  /* ── Pronounce ── */
  .daily-pronounce {
    display: flex;
    justify-content: center;
  }

  /* ── Input group ── */
  .daily-input-group {
    display: flex;
    gap: var(--space-2);
    width: 100%;
    max-width: 300px;
  }

  .daily-input {
    flex: 1;
    padding: var(--space-3);
    border: 2px solid var(--color-background);
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-sm);
    background: var(--color-background);
    color: var(--color-text-primary);
    transition: border-color var(--transition);
    outline: none;
  }

  .daily-input:focus {
    border-color: var(--color-primary);
  }

  .daily-submit {
    padding: var(--space-3) var(--space-4);
    background: var(--color-primary);
    color: var(--color-surface);
    border: none;
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-xs);
    font-weight: 700;
    cursor: pointer;
    transition: opacity var(--transition), transform var(--transition);
    min-height: 44px;
  }

  .daily-submit:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .daily-submit:not(:disabled):hover {
    transform: translateY(-1px);
  }

  /* ── Result ── */
  .result-success,
  .result-fail {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .result-emoji {
    font-size: 2rem;
    line-height: 1;
  }

  .result-text {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .result-word {
    font-size: var(--font-size-lg);
    font-weight: 800;
    color: var(--color-primary);
    letter-spacing: 0.02em;
  }

  .result-fail .result-word {
    color: var(--color-error);
  }

  /* ── Completed state ── */
  .daily-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .status-check {
    font-size: 1.25rem;
    line-height: 1;
  }

  .status-text {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  /* ── Share button ── */
  .share-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-background);
    color: var(--color-text-primary);
    border: 1px solid var(--color-background);
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-xs);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transition);
  }

  .share-btn:hover {
    background: color-mix(in oklch, var(--color-background) 80%, var(--color-text-secondary));
  }

  /* ── Share preview ── */
  .share-preview {
    width: 100%;
    background: var(--color-background);
    border-radius: var(--radius);
    padding: var(--space-3);
    overflow-x: auto;
  }

  .share-preview pre {
    margin: 0;
    font-family: inherit;
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    white-space: pre-wrap;
    word-break: break-word;
    text-align: left;
  }

  /* ── Error ── */
  .daily-error {
    position: fixed;
    bottom: var(--space-4);
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 360px;
    z-index: calc(var(--z-overlay) + 1);
    background: color-mix(in oklch, var(--color-error) 8%, var(--color-surface));
    border: 1px solid color-mix(in oklch, var(--color-error) 25%, transparent);
    border-radius: var(--radius);
    padding: var(--space-3) var(--space-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .daily-error p {
    font-size: var(--font-size-xs);
    color: var(--color-error);
    flex: 1;
    margin: 0;
  }

  .daily-error button {
    padding: var(--space-1) var(--space-3);
    background: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-xs);
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }

  /* ── Mobile ── */
  @media (max-width: 375px) {
    .sheet {
      padding: var(--space-4);
      gap: var(--space-3);
      max-height: 85dvh;
    }

    .daily-title {
      font-size: var(--font-size-xs);
    }

    .daily-input-group {
      max-width: 260px;
    }
  }
</style>
