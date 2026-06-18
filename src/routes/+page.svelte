<script lang="ts">
  import { fade, fly, slide } from 'svelte/transition';

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Components ──
  import VariantSelect from '../components/VariantSelect.svelte';
  import DefinitionDisplay from '../components/DefinitionDisplay.svelte';
  import PronounceButton from '../components/PronounceButton.svelte';
  import SpellingInput from '../components/SpellingInput.svelte';
  import ScoreBoard from '../components/ScoreBoard.svelte';
  import TierIndicator from '../components/TierIndicator.svelte';
  import GameOverScreen from '../components/GameOverScreen.svelte';
  import AchievementToast from '../components/AchievementToast.svelte';
  import ReportSheet from '../components/ReportSheet.svelte';
  import SettingsSheet from '../components/SettingsSheet.svelte';

  // ── Lib ──
  import { fetchWord, checkSpelling } from '$lib/api';
  import {
    calculateScore,
    getTierFromStreak,
    getRank,
    evaluateAchievements,
    TIER_CONFIG,
    ACHIEVEMENTS,
    type AchievementContext,
  } from '$lib/game';
  import {
    variant,
    highScore,
    achievements,
    sessionScore,
    streak,
    playedIds,
    currentWord,
    gameState,
    currentAttempt,
  } from '$lib/stores';

  // ── Local state ──
  let isLoading = false;
  let inputError = false;
  let errorMessage: string | null = null;
  let settingsOpen = false;
  let reportOpen = false;
  let reportWordId = 0;
  let isNewHighScore = false;
  let tierAnimating = false;
  let gameOverAnswer = '';
  let poolExhausted = false;
  let consecutiveFirstAttempt = 0;
  let correctFlash: 'green' | 'amber' | null = null;
  let showPhew = false;
  let tierToastVisible = false;
  let newSessionAchievements: Array<{
    key: string;
    name: string;
    emoji: string;
  }> = [];

  // Achievement toast queue
  let achievementQueue: Array<{
    key: string;
    name: string;
    emoji: string;
  }> = [];
  let currentToastAchievement: {
    key: string;
    name: string;
    emoji: string;
  } | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  // ── Derived ──
  $: rank = getRank($sessionScore);
  $: currentTierValue = getTierFromStreak($streak);
  $: lang = ($variant === 'british' ? 'en-GB' : 'en-US') as 'en-GB' | 'en-US';
  $: nextTierAt = getNextTierAt(currentTierValue);

  // Tier-up animation detection
  let previousTier = 1;

  const TIER_NAMES: Record<number, string> = {
    1: 'The Beginning',
    2: 'Heating Up',
    3: 'Wordsmith Territory',
    4: 'Expert Zone',
    5: 'The Deep End',
    6: "Lexicographer's Domain",
  };

  function getTierName(tier: number): string {
    return TIER_NAMES[tier] ?? '';
  }

  $: if (currentTierValue > previousTier) {
    tierAnimating = true;
    tierToastVisible = true;
    previousTier = currentTierValue;
    setTimeout(() => {
      tierAnimating = false;
    }, 800);
    setTimeout(() => {
      tierToastVisible = false;
    }, 2500);
  }

  // ── Constants ──
  const ACHIEVEMENT_EMOJIS: Record<string, string> = {
    first_steps: '⭐',
    perfect_start: '🌟',
    century_mark: '💯',
    deep_end: '🏊',
    clutch: '🔥',
    sharp_eye: '👁️',
    god_save_the_queen: '👑',
    stars_and_stripes: '🇺🇸',
    lexicographer: '📚',
  };

  // ── Helpers ──
  function getNextTierAt(tier: number): number {
    const idx = TIER_CONFIG.findIndex((t) => t.tier === tier);
    if (idx >= 0 && idx < TIER_CONFIG.length - 1) {
      return TIER_CONFIG[idx + 1].streakRequired;
    }
    return TIER_CONFIG[TIER_CONFIG.length - 1].streakRequired;
  }

  function getAchievementInfo(key: string): { name: string; emoji: string } {
    const def = ACHIEVEMENTS.find((a) => a.key === key);
    return {
      name: def?.name ?? key,
      emoji: ACHIEVEMENT_EMOJIS[key] ?? '🏅',
    };
  }

  // ── Achievement toast queue ──
  function showNextToast() {
    if (achievementQueue.length > 0) {
      currentToastAchievement = achievementQueue.shift()!;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        currentToastAchievement = null;
        // Brief gap before next toast
        setTimeout(showNextToast, 300);
      }, 3000);
    } else {
      currentToastAchievement = null;
    }
  }

  function queueAchievements(newKeys: string[]) {
    for (const key of newKeys) {
      const info = getAchievementInfo(key);
      achievementQueue.push({ key, name: info.name, emoji: info.emoji });
    }
    if (!currentToastAchievement) {
      showNextToast();
    }
  }

  // ── Core: Load Word ──
  async function loadWord() {
    $gameState = 'loading';
    isLoading = true;
    errorMessage = null;
    poolExhausted = false;
    inputError = false;
    $currentWord = null;

    const tier = currentTierValue;
    const tierConfig = TIER_CONFIG.find((t) => t.tier === tier);
    if (!tierConfig) {
      errorMessage = 'Invalid tier configuration';
      isLoading = false;
      return;
    }

    const playedIdsArray = [...$playedIds];
    const playedIdsStr =
      playedIdsArray.length > 0 ? playedIdsArray.join(',') : '';

    try {
      const word = await fetchWord({
        variant: $variant,
        length_min: tierConfig.lengthMin,
        length_max: tierConfig.lengthMax,
        max_obscurity: tierConfig.maxObscurity,
        played_ids: playedIdsStr,
      });

      $currentWord = {
        id: word.id,
        definition: word.definition,
        _spelling: word._spelling,
        _obscurity: word._obscurity,
        _length: word._length,
      };
      $gameState = 'playing';
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('No words match')) {
        poolExhausted = true;
        $gameState = 'game-over';
      } else {
        errorMessage = 'Something went wrong. Try again?';
      }
    } finally {
      isLoading = false;
    }
  }

  // ── Core: Check Spelling ──
  async function handleCheck(event: CustomEvent<string>) {
    if ($gameState !== 'playing' && $gameState !== 'wrong') return;

    const spelling = event.detail.trim();
    if (!spelling || !$currentWord) return;

    $gameState = 'checking';

    try {
      const result = await checkSpelling({
        id: $currentWord.id,
        spelling,
        attempt: $currentAttempt,
      });

      if (result.correct) {
        handleCorrectAnswer();
      } else if ($currentAttempt === 1) {
        handleWrongFirstAttempt();
      } else {
        handleWrongSecondAttempt(result.answer ?? '');
      }
    } catch {
      errorMessage = 'Failed to check spelling. Try again?';
      $gameState = $currentAttempt === 1 ? 'playing' : 'wrong';
    }
  }

  // ── Core: Correct Answer ──
  function handleCorrectAnswer() {
    if (!$currentWord) return;

    // Calculate score
    const points = calculateScore(
      $currentWord._obscurity,
      $currentWord._length,
      currentTierValue,
      $currentAttempt,
    );

    const wasSecondAttempt = $currentAttempt === 2;

    // Update session score
    $sessionScore += points;

    // Mark word as played
    $playedIds = new Set([...$playedIds, $currentWord.id]);

    // Increment streak
    $streak += 1;

    // Compute new tier directly (avoids reactivity timing issues)
    const newTier = getTierFromStreak($streak);

    // Track consecutive first-attempt corrects
    if ($currentAttempt === 1) {
      consecutiveFirstAttempt += 1;
    } else {
      consecutiveFirstAttempt = 0;
    }

    // Evaluate achievements
    const ctx: AchievementContext = {
      sessionScore: $sessionScore,
      streak: $streak,
      tier: newTier,
      variant: $variant,
      wordLength: $currentWord._length,
      attempt: $currentAttempt,
      consecutiveFirstAttempt,
    };

    const newAchievements = evaluateAchievements($achievements, ctx);
    if (newAchievements.length > 0) {
      // Persist newly earned achievements
      const updated = new Set($achievements);
      for (const key of newAchievements) {
        updated.add(key);
      }
      $achievements = updated;

      // Track for game-over display
      for (const key of newAchievements) {
        const info = getAchievementInfo(key);
        newSessionAchievements = [
          ...newSessionAchievements,
          { key, ...info },
        ];
      }

      // Queue toast notifications
      queueAchievements(newAchievements);
    }

    // Visual feedback: green flash for 1st attempt, amber for 2nd
    correctFlash = wasSecondAttempt ? 'amber' : 'green';
    showPhew = wasSecondAttempt;

    // Reset attempt for next word
    $currentAttempt = 1;

    // Load next word after brief delay so user sees feedback
    setTimeout(() => {
      correctFlash = null;
      showPhew = false;
      loadWord();
    }, 500);
  }

  // ── Core: Wrong First Attempt ──
  function handleWrongFirstAttempt() {
    $currentAttempt = 2;
    $gameState = 'wrong';
    inputError = true;
    setTimeout(() => {
      inputError = false;
    }, 500);
  }

  // ── Core: Wrong Second Attempt → Game Over ──
  function handleWrongSecondAttempt(answer: string) {
    gameOverAnswer = answer;
    $gameState = 'game-over';

    // Check high score
    if ($sessionScore > $highScore) {
      $highScore = $sessionScore;
      isNewHighScore = true;
    } else {
      isNewHighScore = false;
    }
  }

  // ── Session Reset ──
  function resetSessionState() {
    $sessionScore = 0;
    $streak = 0;
    $playedIds = new Set();
    $currentAttempt = 1;
    $currentWord = null;
    isNewHighScore = false;
    gameOverAnswer = '';
    poolExhausted = false;
    consecutiveFirstAttempt = 0;
    correctFlash = null;
    showPhew = false;
    tierToastVisible = false;
    newSessionAchievements = [];
    achievementQueue = [];
    currentToastAchievement = null;
    clearTimeout(toastTimer);
    errorMessage = null;
    inputError = false;
    previousTier = 1;
    tierAnimating = false;
  }

  // ── Event Handlers ──
  function handleStart() {
    resetSessionState();
    loadWord();
  }

  function handleRestart() {
    resetSessionState();
    $gameState = 'variant-select';
  }

  function handleReport(wordId: number) {
    reportWordId = wordId;
    reportOpen = true;
  }

  function handleRetry() {
    const shouldReload = $gameState === 'loading';
    errorMessage = null;
    if (shouldReload) {
      loadWord();
    }
  }
</script>

<!-- ===================================================================
     TEMPLATE
     =================================================================== -->

{#if $gameState === 'variant-select'}
  <VariantSelect onStart={handleStart} />
{:else}
  <div class="game-container">
    <!-- Settings button -->
    <button
      class="settings-btn"
      on:click={() => (settingsOpen = true)}
      aria-label="Settings"
    >
      ⚙️
    </button>

    <!-- Score board -->
    <div class="top-bar">
      <ScoreBoard sessionScore={$sessionScore} highScore={$highScore} {rank} />
    </div>

    <!-- Tier indicator -->
    <TierIndicator
      tier={currentTierValue}
      streak={$streak}
      {nextTierAt}
      animating={tierAnimating}
    />

    <!-- Word + input: centred together -->
    <div class="middle-group">
      <div class="word-area">
        {#if $currentWord}
          <DefinitionDisplay
            definition={$currentWord.definition}
            wordId={$currentWord.id}
            on:report={(e) => handleReport(e.detail)}
          />
          <PronounceButton
            spelling={$currentWord._spelling}
            {lang}
            disabled={$gameState !== 'playing' && $gameState !== 'wrong'}
          />
        {:else}
          <!-- Loading skeleton -->
          <div class="skeleton-card">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
          <div class="skeleton-btn"></div>
        {/if}
      </div>

      <!-- Input area -->
      <div class="input-area">
        <SpellingInput
          attempt={$currentAttempt}
          disabled={$gameState !== 'playing' && $gameState !== 'wrong'}
          error={inputError}
          {correctFlash}
          on:spelling={handleCheck}
        />

        {#if $gameState === 'wrong' && !inputError}
          <p class="try-again-text" in:fade={{ duration: 200 }}>
            Try again — one attempt remaining
          </p>
        {/if}

        {#if showPhew}
          <p class="phew-text" in:fade={{ duration: 200 }}>
            Phew! 😅
          </p>
        {/if}
      </div>
    </div>
  </div>

  <!-- ── Game Over Overlay ── -->
  {#if $gameState === 'game-over'}
    {#if poolExhausted}
      <div class="overlay" transition:fade={{ duration: prefersReducedMotion ? 0 : 300 }}>
        <div class="pool-card">
          <h2 class="pool-heading">🎉 Congratulations!</h2>
          <p class="pool-message">You've mastered all available words!</p>
          <div class="pool-score">
            <span class="pool-score-value"
              >{$sessionScore.toLocaleString()}</span
            >
            <span class="pool-score-label">points</span>
          </div>
          <div class="pool-rank">
            <span>{rank.emoji}</span>
            <span class="pool-rank-title">{rank.title}</span>
          </div>
          <button class="play-again-btn" on:click={handleRestart}>
            Play Again
          </button>
        </div>
      </div>
    {:else}
      <GameOverScreen
        sessionScore={$sessionScore}
        highScore={$highScore}
        {isNewHighScore}
        answer={gameOverAnswer}
        {rank}
        newAchievements={newSessionAchievements}
        wordId={$currentWord?.id ?? 0}
        on:restart={handleRestart}
        on:report={(e) => handleReport(e.detail)}
      />
    {/if}
  {/if}

  <!-- ── Error Banner ── -->
  {#if errorMessage}
    <div class="error-banner" transition:slide={{ duration: prefersReducedMotion ? 0 : 200 }}>
      <p class="error-text">{errorMessage}</p>
      <button class="retry-btn" on:click={handleRetry}>Retry</button>
    </div>
  {/if}

  <!-- ── Sheets & Toast ── -->
  <ReportSheet
    wordId={reportWordId}
    open={reportOpen}
    on:close={() => (reportOpen = false)}
  />
  <SettingsSheet
    open={settingsOpen}
    on:close={() => (settingsOpen = false)}
  />
  <AchievementToast achievement={currentToastAchievement} />

  {#if tierToastVisible}
    <div
      class="tier-toast"
      transition:fly={{ y: prefersReducedMotion ? 0 : -30, duration: prefersReducedMotion ? 0 : 300 }}
      role="status"
      aria-live="polite"
    >
      ▲ Tier {currentTierValue} — {getTierName(currentTierValue)}
    </div>
  {/if}
{/if}

<!-- ===================================================================
     STYLES
     =================================================================== -->

<style>
  /* ── Game container ── */
  .game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100dvh;
    padding: var(--space-4);
    gap: var(--space-4);
    position: relative;
    max-width: 480px;
    margin: 0 auto;
  }

  /* ── Settings button ── */
  .settings-btn {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    z-index: 50;
    background: var(--color-surface);
    border: 1px solid var(--color-background);
    border-radius: var(--radius);
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-lg);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    transition: transform var(--transition);
  }

  .settings-btn:hover {
    transform: scale(1.05);
  }

  .settings-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* ── Top bar ── */
  .top-bar {
    width: 100%;
  }

  /* ── Word area ── */
  .word-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
  }

  /* ── Middle group: word + input centred together ── */
  .middle-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
  }

  /* ── Input area ── */
  .input-area {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  /* ── Loading skeleton ── */
  .skeleton-card {
    width: 100%;
    max-width: 400px;
    background: var(--color-surface);
    border-radius: var(--radius);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .skeleton-line {
    height: 16px;
    width: 80%;
    background: var(--color-background);
    border-radius: 4px;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  .skeleton-line.short {
    width: 50%;
  }

  .skeleton-btn {
    width: 160px;
    height: 44px;
    background: var(--color-background);
    border-radius: var(--radius);
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  @keyframes skeleton-pulse {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.8;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-line,
    .skeleton-btn {
      animation: none;
    }
  }

  /* ── Try again text ── */
  .try-again-text {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    font-weight: 600;
    text-align: center;
  }

  /* ── Phew text ── */
  .phew-text {
    font-size: var(--font-size-sm);
    color: var(--color-warning);
    font-weight: 600;
    text-align: center;
  }

  /* ── Tier toast ── */
  .tier-toast {
    position: fixed;
    top: 64px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: var(--color-surface);
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius);
    font-size: var(--font-size-sm);
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    max-width: calc(100vw - 2 * var(--space-4));
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Error banner ── */
  .error-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 90;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: color-mix(in oklch, var(--color-error) 8%, var(--color-surface));
    border-top: 1px solid color-mix(in oklch, var(--color-error) 25%, transparent);
  }

  .error-text {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    flex: 1;
  }

  .retry-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-error);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-xs);
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    margin-left: var(--space-3);
    transition: background var(--transition);
  }

  .retry-btn:hover {
    background: color-mix(in oklch, var(--color-error) 85%, black);
  }

  .retry-btn:focus-visible {
    outline: 2px solid var(--color-error);
    outline-offset: 2px;
  }

  /* ── Pool exhausted overlay ── */
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    padding: var(--space-4);
  }

  .pool-card {
    background: var(--color-surface);
    border-radius: calc(var(--radius) * 2);
    padding: var(--space-8) var(--space-6);
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-5);
    text-align: center;
  }

  .pool-heading {
    font-size: var(--font-size-2xl);
    font-weight: 800;
    color: var(--color-text-primary);
  }

  .pool-message {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .pool-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .pool-score-value {
    font-size: var(--font-size-2xl);
    font-weight: 800;
    color: var(--color-text-primary);
    line-height: 1;
  }

  .pool-score-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pool-rank {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-background);
    border-radius: var(--radius);
  }

  .pool-rank-title {
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-secondary);
  }

  .play-again-btn {
    width: 100%;
    padding: var(--space-4);
    background: var(--color-primary);
    color: var(--color-surface);
    border: none;
    border-radius: var(--radius);
    font-family: inherit;
    font-size: var(--font-size-md);
    font-weight: 700;
    cursor: pointer;
    transition: transform var(--transition);
    min-height: 52px;
  }

  .play-again-btn:hover {
    transform: translateY(-1px);
  }

  .play-again-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* ── Mobile ── */
  @media (max-width: 375px) {
    .game-container {
      padding: var(--space-3);
      gap: var(--space-3);
    }

    .settings-btn {
      top: var(--space-3);
      right: var(--space-3);
    }

    .pool-card {
      padding: var(--space-6) var(--space-4);
    }

    .pool-heading {
      font-size: var(--font-size-xl);
    }

    .tier-toast {
      font-size: var(--font-size-xs);
      padding: var(--space-2) var(--space-4);
      top: 56px;
    }
  }

  @media (max-width: 320px) {
    .game-container {
      padding: var(--space-2);
      gap: var(--space-2);
    }

    .settings-btn {
      top: var(--space-2);
      right: var(--space-2);
    }

    .pool-card {
      padding: var(--space-5) var(--space-3);
    }

    .pool-heading {
      font-size: var(--font-size-lg);
    }

    .pool-score-value {
      font-size: var(--font-size-xl);
    }

    .tier-toast {
      font-size: 0.7rem;
      padding: var(--space-2) var(--space-3);
      top: 52px;
    }
  }
</style>
