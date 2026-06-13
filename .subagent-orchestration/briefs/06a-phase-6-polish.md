# Phase 6a: Polish & Quality Audit

## Scope
Tasks 6.1–6.3 from SPEC.md. Single subagent task — medium grain. Code review, animation verification, responsive audit, and build validation.

## Prerequisites
- Phases 1-5 complete: full working app
- `npm run build` succeeds

## Tasks

### 6.1 Animation & Transition Audit
Read through all Svelte components and verify:
- Red shake animation on SpellingInput fires correctly (via `error` prop)
- Green flash / correct feedback exists (check for transition on correct answer)
- Tier-up animation on TierIndicator fires correctly (via `animating` prop)
- Confetti effect on GameOverScreen for new high score
- AchievementToast slide-in/out transitions are smooth
- Bottom sheet slide/fade transitions on ReportSheet and SettingsSheet
- Score animation on ScoreBoard (number change)

If any animations are missing, underspecified, or broken — add or fix them. The SPEC.md section 9 defines every animation requirement.

### 6.2 Responsive Audit
Test mental rendering at these breakpoints:
- 320px (small phone)
- 375px (iPhone)
- 414px (large phone)
- 768px (tablet)
- 1024px+ (desktop)

Check for:
- No horizontal overflow at any breakpoint
- Touch targets are at least 44px × 44px
- Text is readable without zooming
- Buttons are appropriately sized for thumbs
- Input font-size is 16px minimum (prevents iOS auto-zoom)
- Bottom sheets don't exceed viewport height
- GameOverScreen overlay scrolls if content overflows
- Confetti particles stay within viewport bounds

Fix any responsive issues found. Use CSS media queries or clamp() where appropriate.

### 6.3 Build & Type Validation
- Run `npm run build` — must succeed with 0 errors
- Run `npx svelte-check` — must succeed with 0 errors, 0 warnings
- Check for any console.error or console.log left in production code — remove or guard with `import { dev } from '$app/environment'`
- Verify `build/` directory contains valid static output (index.html, JS bundles, CSS)
- Check bundle sizes — report on total JS/CSS size

### 6.4 Code Quality
- No TODO comments or "fix me" notes left in code
- Consistent formatting across all files
- No unused imports
- No dead code or unused functions
- All event dispatchers have properly typed generics
- Error states have user-friendly messages (not raw error objects)

## Acceptance Criteria
- [ ] All animations from SPEC.md section 9 are implemented
- [ ] No horizontal overflow at 320px width
- [ ] All touch targets ≥ 44px
- [ ] Input font-size ≥ 16px
- [ ] `npm run build` succeeds with 0 errors
- [ ] `npx svelte-check` passes with 0 errors, 0 warnings
- [ ] No console.log statements in production code
- [ ] Total bundle < 100KB (gzipped)
- [ ] No unused imports or dead code

## Files That May Be Modified
- Any `src/components/*.svelte` (if animations need fixes)
- `src/routes/+page.svelte` (if game loop feedback needs enhancement)
- `src/app.css` (if responsive fixes needed globally)
- `src/app.html` (if meta viewport needs adjustment)

## Constraints
- Do NOT change any logic in `src/lib/` files or `functions/api/`
- Do NOT introduce new npm dependencies
- Do NOT change the scoring formula or game mechanics
- This is a polish pass — fix visuals and responsiveness, don't refactor architecture
