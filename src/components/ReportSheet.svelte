<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { reportIssue } from '$lib/api';

  export let wordId: number;
  export let open: boolean = false;

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $: motionDuration = (ms: number) => prefersReducedMotion ? 0 : ms;

  const dispatch = createEventDispatcher<{ close: void }>();

  const REASONS = [
    { value: 'wrong_spelling', label: 'Incorrect spelling' },
    { value: 'wrong_definition', label: 'Incorrect definition' },
    { value: 'wrong_variant', label: 'Wrong variant (should be British / American)' },
    { value: 'other', label: 'Other' },
  ] as const;

  let selectedReason: string = '';
  let note: string = '';
  let submitting = false;
  let error: string | null = null;
  let submitted = false;

  function close() {
    open = false;
    dispatch('close');
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      close();
    }
  }

  function resetForm() {
    selectedReason = '';
    note = '';
    error = null;
    submitted = false;
  }

  async function handleSubmit() {
    if (!selectedReason || submitting) return;

    submitting = true;
    error = null;

    try {
      await reportIssue({
        word_id: wordId,
        reason: selectedReason,
        note: note.trim() || undefined,
      });
      submitted = true;
      setTimeout(() => {
        close();
        resetForm();
      }, 1500);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to submit report';
    } finally {
      submitting = false;
    }
  }

  function handleCancel() {
    resetForm();
    close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="backdrop"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    transition:fade={{ duration: motionDuration(200) }}
    role="presentation"
  >
    <div class="sheet" transition:slide={{ duration: motionDuration(300), axis: 'y' }} role="dialog" aria-label="Report an issue">
      {#if submitted}
        <div class="confirmation">
          <span class="confirm-icon">✅</span>
          <p class="confirm-text">Thank you for your report!</p>
        </div>
      {:else}
        <h2 class="heading">Report an issue</h2>

        <fieldset class="reason-group">
          <legend class="reason-label">What's wrong?</legend>
          {#each REASONS as reason (reason.value)}
            <label class="reason-option">
              <input
                type="radio"
                name="report-reason"
                value={reason.value}
                bind:group={selectedReason}
              />
              <span class="radio-custom"></span>
              <span class="reason-text">{reason.label}</span>
            </label>
          {/each}
        </fieldset>

        <div class="note-section">
          <label for="report-note" class="note-label">Additional details (optional)</label>
          <textarea
            id="report-note"
            bind:value={note}
            placeholder="What's wrong? (optional)"
            rows="3"
            class="note-input"
          ></textarea>
        </div>

        {#if error}
          <p class="error-text">{error}</p>
        {/if}

        <div class="actions">
          <button class="btn btn-cancel" on:click={handleCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            class="btn btn-submit"
            on:click={handleSubmit}
            disabled={!selectedReason || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
  }

  .sheet {
    background: var(--color-surface);
    border-radius: var(--radius) var(--radius) 0 0;
    padding: var(--space-6) var(--space-5) var(--space-8);
    width: 100%;
    max-width: 480px;
    max-height: 80dvh;
    overflow-y: auto;
  }

  .heading {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: var(--space-5);
  }

  .reason-group {
    border: none;
    padding: 0;
    margin: 0;
  }

  .reason-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-3);
    display: block;
  }

  .reason-option {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    cursor: pointer;
    border-radius: var(--radius);
    transition: background var(--transition);
    margin-bottom: var(--space-1);
  }

  .reason-option:hover {
    background: var(--color-background);
  }

  .reason-option input[type='radio'] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .radio-custom {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-text-secondary);
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
    transition: border-color var(--transition);
  }

  .reason-option input[type='radio']:checked + .radio-custom {
    border-color: var(--color-primary);
  }

  .reason-option input[type='radio']:checked + .radio-custom::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-primary);
  }

  .reason-option input[type='radio']:focus-visible + .radio-custom {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .reason-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }

  .note-section {
    margin-top: var(--space-4);
  }

  .note-label {
    display: block;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
  }

  .note-input {
    width: 100%;
    font-family: inherit;
    font-size: var(--font-size-sm);
    padding: var(--space-3);
    border: 1px solid var(--color-text-secondary);
    border-radius: var(--radius);
    background: var(--color-surface);
    color: var(--color-text-primary);
    resize: vertical;
    min-height: 80px;
    outline: none;
    transition: border-color var(--transition);
  }

  .note-input::placeholder {
    color: var(--color-text-secondary);
  }

  .note-input:focus {
    border-color: var(--color-primary);
  }

  .error-text {
    font-size: var(--font-size-xs);
    color: var(--color-error);
    margin-top: var(--space-3);
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-5);
  }

  .btn {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-sm);
    font-weight: 600;
    cursor: pointer;
    transition: opacity var(--transition), background var(--transition);
    min-height: 48px;
    border: none;
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .btn-cancel {
    background: var(--color-background);
    color: var(--color-text-primary);
  }

  .btn-cancel:not(:disabled):hover {
    background: var(--color-background);
  }

  .btn-submit {
    background: var(--color-primary);
    color: var(--color-surface);
  }

  .btn-submit:not(:disabled):hover {
    background: color-mix(in oklch, var(--color-primary) 85%, black);
  }

  .confirmation {
    text-align: center;
    padding: var(--space-6) 0;
  }

  .confirm-icon {
    font-size: var(--font-size-2xl);
    display: block;
    margin-bottom: var(--space-3);
  }

  .confirm-text {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-success);
  }

  @media (max-width: 375px) {
    .sheet {
      padding: var(--space-5) var(--space-4) var(--space-6);
    }

    .actions {
      flex-direction: column;
    }
  }
</style>
