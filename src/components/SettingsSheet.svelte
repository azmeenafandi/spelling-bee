<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { variant } from '$lib/stores';
  import { exportData, importData } from '$lib/storage';

  export let open: boolean = false;

  const dispatch = createEventDispatcher<{ close: void }>();

  let fileInput: HTMLInputElement;
  let importing = false;
  let importError: string | null = null;
  let importSuccess = false;
  let showResetConfirm = false;

  function close() {
    open = false;
    showResetConfirm = false;
    importError = null;
    importSuccess = false;
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

  function toggleVariant() {
    $variant = $variant === 'british' ? 'american' : 'british';
  }

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spelling-bee-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function triggerImport() {
    fileInput?.click();
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importing = true;
    importError = null;
    importSuccess = false;

    try {
      const text = await file.text();
      const success = importData(text);
      if (success) {
        importSuccess = true;
        setTimeout(() => {
          importSuccess = false;
        }, 2000);
      } else {
        importError = 'Invalid file format. Please use a valid spelling-bee-data.json file.';
      }
    } catch {
      importError = 'Failed to read file.';
    } finally {
      importing = false;
      input.value = '';
    }
  }

  function handleReset() {
    if (!showResetConfirm) {
      showResetConfirm = true;
      return;
    }

    // Actually reset
    try {
      localStorage.removeItem('spelling-bee:variant');
      localStorage.removeItem('spelling-bee:high-score');
      localStorage.removeItem('spelling-bee:achievements');
      // Reset the store to defaults
      $variant = 'british';
      // Force reload to fully reset all stores
      window.location.reload();
    } catch {
      // Silent — storage may be unavailable
    }
    showResetConfirm = false;
    close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="backdrop"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    transition:fade={{ duration: 200 }}
    role="presentation"
  >
    <div class="sheet" transition:slide={{ duration: 300, axis: 'y' }} role="dialog" aria-label="Settings">
      <div class="sheet-header">
        <h2 class="heading">Settings</h2>
        <button class="close-btn" on:click={close} aria-label="Close settings">
          ✕
        </button>
      </div>

      <!-- Variant Toggle -->
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Spelling Variant</span>
          <span class="setting-value">{$variant === 'british' ? 'British English 🇬🇧' : 'American English 🇺🇸'}</span>
        </div>
        <button
          class="toggle-btn"
          on:click={toggleVariant}
          aria-pressed={$variant === 'american'}
          aria-label="Toggle spelling variant"
        >
          <span class="toggle-track" class:active={$variant === 'american'}>
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>

      <hr class="divider" />

      <!-- Export -->
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Export Data</span>
          <span class="setting-desc">Download your high score &amp; achievements</span>
        </div>
        <button class="action-btn" on:click={handleExport}>
          Export
        </button>
      </div>

      <!-- Import -->
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Import Data</span>
          <span class="setting-desc">Restore from a saved backup</span>
        </div>
        <button class="action-btn" on:click={triggerImport} disabled={importing}>
          {importing ? 'Importing...' : 'Import'}
        </button>
      </div>
      <input
        bind:this={fileInput}
        type="file"
        accept=".json"
        class="sr-only"
        on:change={handleFileChange}
      />

      {#if importSuccess}
        <p class="toast-success">✓ Data imported successfully</p>
      {/if}

      {#if importError}
        <p class="toast-error">{importError}</p>
      {/if}

      <hr class="divider" />

      <!-- Reset -->
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Reset All Data</span>
          <span class="setting-desc">Delete high score &amp; achievements</span>
        </div>
        <button
          class="action-btn danger"
          on:click={handleReset}
        >
          {showResetConfirm ? 'Confirm Reset' : 'Reset'}
        </button>
      </div>

      {#if showResetConfirm}
        <div class="confirm-banner">
          <p class="confirm-text">
            This will delete your high score and achievements. Are you sure?
          </p>
          <button class="cancel-confirm" on:click={() => { showResetConfirm = false; }}>
            Cancel
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
    z-index: 150;
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
    max-height: 85dvh;
    overflow-y: auto;
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-5);
  }

  .heading {
    font-size: var(--font-size-lg);
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius);
    line-height: 1;
    transition: color var(--transition);
  }

  .close-btn:hover {
    color: var(--color-text-primary);
  }

  .close-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) 0;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .setting-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .setting-value {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .setting-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  /* Toggle */
  .toggle-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-1);
  }

  .toggle-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: var(--radius);
  }

  .toggle-track {
    display: block;
    width: 48px;
    height: 26px;
    background: var(--color-text-secondary);
    border-radius: 13px;
    position: relative;
    transition: background var(--transition);
  }

  .toggle-track.active {
    background: var(--color-primary);
  }

  .toggle-thumb {
    display: block;
    width: 22px;
    height: 22px;
    background: var(--color-surface);
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform var(--transition);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }

  .toggle-track.active .toggle-thumb {
    transform: translateX(22px);
  }

  /* Action buttons */
  .action-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-background);
    color: var(--color-text-primary);
    border: 1px solid transparent;
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-xs);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--transition);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .action-btn:hover:not(:disabled) {
    background: var(--color-background);
  }

  .action-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .action-btn.danger {
    color: var(--color-error);
    border-color: var(--color-error);
    background: transparent;
  }

  .action-btn.danger:hover:not(:disabled) {
    background: color-mix(in oklch, var(--color-error) 8%, var(--color-surface));
  }

  .divider {
    border: none;
    border-top: 1px solid var(--color-background);
    margin: var(--space-2) 0;
  }

  .toast-success {
    font-size: var(--font-size-xs);
    color: var(--color-success);
    font-weight: 600;
    padding: var(--space-2) 0;
  }

  .toast-error {
    font-size: var(--font-size-xs);
    color: var(--color-error);
    padding: var(--space-2) 0;
  }

  .confirm-banner {
    background: color-mix(in oklch, var(--color-error) 8%, var(--color-surface));
    border: 1px solid color-mix(in oklch, var(--color-error) 25%, transparent);
    border-radius: var(--radius);
    padding: var(--space-3) var(--space-4);
    margin-top: var(--space-3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .confirm-text {
    font-size: var(--font-size-xs);
    color: var(--color-error);
    line-height: 1.4;
  }

  .cancel-confirm {
    background: none;
    border: none;
    font-family: inherit;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-secondary);
    cursor: pointer;
    flex-shrink: 0;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius);
  }

  .cancel-confirm:hover {
    color: var(--color-text-primary);
  }

  .cancel-confirm:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  @media (max-width: 375px) {
    .sheet {
      padding: var(--space-5) var(--space-4) var(--space-6);
    }

    .confirm-banner {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
