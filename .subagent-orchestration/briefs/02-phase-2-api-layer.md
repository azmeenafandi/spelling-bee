# Phase 2: API Layer (Pages Functions)

## Scope
Tasks 2.1–2.3 from SPEC.md. Single subagent task — medium grain (3 files, shared D1 binding, tightly coupled).

## Prerequisites
- Phase 1 complete: `functions/api/word.ts`, `check.ts`, `report.ts` exist as stubs
- `wrangler.jsonc` has D1 binding `DB`
- `migrations/0001_create_words.sql` and `0002_create_reports.sql` exist
- Seed data populated in D1 (44 words in `words` table)

## Deliverables

### 2.1 `functions/api/word.ts` — Fetch Word
**Method**: GET
**Query params**: `variant`, `length_min`, `length_max`, `max_obscurity`, `played_ids` (comma-separated)

Logic:
1. Parse and validate all query params
2. Build a parameterised SQL query:
   ```sql
   SELECT id, definition, spelling as _spelling
   FROM words
   WHERE variant IN (?1, 'both')
     AND length >= ?2
     AND length <= ?3
     AND obscurity <= ?4
   ```
3. If `played_ids` is non-empty, dynamically append `AND id NOT IN (?, ?, ...)` with one placeholder per ID
4. Append `ORDER BY RANDOM() LIMIT 1`
5. Execute via `context.env.DB.prepare(...).bind(...).first()`
6. Return `{ id, definition, _spelling }` on success (200)
7. Return `{ error: "No words match the given criteria" }` on null result (404)
8. Return `{ error: "..." }` on any exception (500)

**Edge cases**:
- Missing required params → 400
- Invalid numeric params → 400
- Empty `played_ids` → skip exclusion clause
- No matching words → 404 with descriptive error

### 2.2 `functions/api/check.ts` — Check Spelling
**Method**: POST
**Body**: `{ id: number, spelling: string, attempt: 1 | 2 }`

Logic:
1. Parse JSON body, validate `id` (integer > 0), `spelling` (string, non-empty), `attempt` (1 or 2)
2. Query:
   ```sql
   SELECT spelling FROM words WHERE id = ?1
   ```
3. If null → 404 `{ error: "Word not found" }`
4. Case-insensitive compare: `body.spelling.toLowerCase() === word.spelling.toLowerCase()`
5. If match → 200 `{ correct: true, game_over: false }`
6. If no match AND attempt === 1 → 200 `{ correct: false, game_over: false }`
7. If no match AND attempt === 2 → 200 `{ correct: false, game_over: true, answer: word.spelling }`

**Edge cases**:
- Invalid JSON body → 400
- Missing required fields → 400
- Whitespace in spelling → trim before comparison

### 2.3 `functions/api/report.ts` — Report Issue
**Method**: POST
**Body**: `{ word_id: number, reason: string, note?: string }`

Logic:
1. Parse JSON body, validate `word_id` (integer > 0), `reason` (one of: 'wrong_spelling', 'wrong_definition', 'wrong_variant', 'other')
2. `note` is optional, default to null
3. Verify the word_id exists in `words` table — return 404 if not
4. Insert:
   ```sql
   INSERT INTO reports (word_id, reason, note) VALUES (?1, ?2, ?3)
   ```
5. Return 200 `{ ok: true }`
6. On error → 500 `{ error: "..." }`

**Edge cases**:
- Invalid reason value → 400 with message listing valid values
- word_id doesn't exist → 404

## TypeScript Considerations

Use the generated wrangler types for the D1 binding:
```typescript
interface Env {
  DB: D1Database;
}
```

Or import from `.wrangler/types/runtime` if types have been generated with `npx wrangler types`.

## Acceptance Criteria
- [ ] All three endpoints handle their described success paths
- [ ] All three endpoints handle their described error paths
- [ ] `/api/word` correctly filters by variant (uses `variant IN (?, 'both')`)
- [ ] `/api/word` correctly excludes played IDs
- [ ] `/api/check` does case-insensitive comparison
- [ ] `/api/check` only returns `answer` on `game_over: true`
- [ ] `/api/report` validates reason against allowed values
- [ ] `/api/report` verifies word_id exists before inserting
- [ ] All responses have `Content-Type: application/json`
- [ ] No hardcoded data — all queries hit D1

## Constraints
- Do NOT modify wrangler.jsonc
- Do NOT modify migration files or seed data
- Do NOT add any new files — only modify the 3 existing stub files
- Keep implementations self-contained — no shared lib files between functions (Pages Functions compile independently)
- Reuse parameterised query patterns — don't interpolate strings into SQL
