# Phase 1: Project Scaffold & Infrastructure

## Scope
Phase 1 tasks 1.1–1.4 from SPEC.md. Single subagent task — medium grain.

## Prerequisites
- SPEC.md exists at project root
- Empty git repository initialized

## Deliverables

### 1.1 SvelteKit + Pages Scaffold
Create a SvelteKit project configured for Cloudflare Pages:

- `package.json` with SvelteKit, `@sveltejs/adapter-static`, `@cloudflare/workers-types`, `wrangler` as dev dependencies
- `svelte.config.js` using `adapter-static` (output to `build/`)
- `vite.config.ts` 
- `tsconfig.json` with `@cloudflare/workers-types`
- `src/app.html` — minimal Svelte shell
- `src/app.css` — empty, ready for design tokens
- `src/routes/+page.svelte` — placeholder "Spelling Bee" heading
- `src/lib/` — empty directory ready for api.ts, game.ts, speech.ts, storage.ts
- `src/components/` — empty directory ready for Svelte components

### 1.2 Wrangler Configuration
`wrangler.jsonc`:
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "spelling-bee",
  "compatibility_date": "2026-06-13",
  "pages_build_output_dir": "build",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "spelling-bee-db",
      "database_id": "spelling-bee-db-dev"
    }
  ],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 0.1
  }
}
```

### 1.3 D1 Migrations

`migrations/0001_create_words.sql`:
```sql
CREATE TABLE words (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  spelling    TEXT    NOT NULL,
  definition  TEXT    NOT NULL,
  variant     TEXT    NOT NULL CHECK(variant IN ('british', 'american', 'both')),
  length      INTEGER NOT NULL,
  obscurity   INTEGER NOT NULL CHECK(obscurity BETWEEN 1 AND 5)
);
```

`migrations/0002_create_reports.sql`:
```sql
CREATE TABLE reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id     INTEGER NOT NULL REFERENCES words(id),
  reason      TEXT NOT NULL CHECK(reason IN ('wrong_spelling', 'wrong_definition', 'wrong_variant', 'other')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved    INTEGER NOT NULL DEFAULT 0
);
```

### 1.4 Seed Data
`seed/seed.sql` with a curated word list. At minimum 30 words across variants (british/american/both), lengths (6–10), and obscurity levels (1–5). Each INSERT must include: spelling, definition, variant, length, obscurity.

Include examples like:
- mountain, garden, branch, throat, planet (length 6–7, obscurity 1)
- bizarre, lacquer, solemn, gnawed (length 6–7, obscurity 2–3)
- camouflage, silhouette, conscience, embarrass (length 8–9, obscurity 3–4)
- idiosyncrasy, pharaoh, rhythm, bureaucracy (length 6–10+, obscurity 4–5)

Include British/American divergents: colour/color, theatre/theater, realise/realize, favour/favor, centre/center.

### 1.5 Pages Functions Scaffold
- `functions/api/word.ts` — placeholder (returns dummy JSON)
- `functions/api/check.ts` — placeholder (returns dummy JSON)
- `functions/api/report.ts` — placeholder (returns dummy JSON)

These are stub files that will be fully implemented in Phase 2. They should export a valid Pages Function handler (onRequest or default export returning a Response with JSON).

## Files to Create
```
package.json
svelte.config.js
vite.config.ts
tsconfig.json
wrangler.jsonc
src/app.html
src/app.css
src/routes/+page.svelte
src/lib/.gitkeep
src/components/.gitkeep
migrations/0001_create_words.sql
migrations/0002_create_reports.sql
seed/seed.sql
functions/api/word.ts
functions/api/check.ts
functions/api/report.ts
.gitignore (already exists — do not overwrite)
```

## Acceptance Criteria
- [ ] `npm install` completes without errors
- [ ] `npm run build` produces static output in `build/`
- [ ] `wrangler.jsonc` is valid (test with `npx wrangler deploy --dry-run` if possible)
- [ ] Migration SQL is valid SQLite syntax
- [ ] Seed SQL contains at least 30 words covering all variants, lengths 6–10+, obscurity 1–5
- [ ] Pages Function stubs export valid handlers

## Constraints
- Do NOT overwrite SPEC.md or .gitignore
- Do NOT create any routes beyond `+page.svelte`
- Do NOT implement business logic in API stubs — just return hardcoded JSON
- All file paths are relative to project root: `/home/azmeen/public_projects/spelling_bee/`
