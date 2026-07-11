# Deploy Checklist

## Prerequisites

1. Cloudflare account with Workers & Pages enabled
2. `CLOUDFLARE_API_TOKEN` — Cloudflare API token with **Cloudflare Pages — Edit** permission
3. `CLOUDFLARE_ACCOUNT_ID` — From Cloudflare Dashboard (right sidebar)

For CI/CD: both values stored as GitHub Secrets.
For local CLI: set as environment variables.

## Deploy Steps

### 1. Create D1 Database (once)

```bash
npx wrangler d1 create spelling-bee-db
# Copy the database_id UUID from output → add to wrangler.jsonc
```

### 2. Run Migrations

```bash
npx wrangler d1 migrations apply spelling-bee-db --remote
```

### 3. Seed Word List

```bash
npx wrangler d1 execute spelling-bee-db --remote --file=seed/words.sql
```

The seed file contains 18,000+ words. If D1 rate-limits the request, split into chunks (see `scripts/` for utilities):

```bash
# If rate-limited, seed in smaller batches
npx wrangler d1 execute spelling-bee-db --remote --file=seed/words_chunk_000.sql
npx wrangler d1 execute spelling-bee-db --remote --file=seed/words_chunk_001.sql
```

### 4. Verify Database

```bash
npx wrangler d1 execute spelling-bee-db --remote \
  --command="SELECT variant, COUNT(*) FROM words GROUP BY variant"
```

### 5. Deploy Frontend + Functions

```bash
npm run build
npx wrangler pages deploy build --project-name=spelling-bee
```

### 6. Verify Deployment

Visit `https://spelling.beeroolabs.com`.

Test:
- Select variant → Start game
- 🔊 Pronounce button works, uses correct accent (en-GB / en-US)
- Spelling input has autocorrect disabled (no keyboard suggestions)
- Type spelling → Enter
- Correct/wrong feedback appears with icons (✓/✗) and colour
- Two-attempt mechanic works
- Game over screen shows answer + share button
- Share button shows native share sheet (mobile) or copies to clipboard
- Daily Challenge button works, shows overlay with word
- Sound effects play on correct/wrong/tier-up/game-over
- Shield icon visible (streak safety net)
- Settings: Dark Mode toggle works (System / Light / Dark)
- High score persists across sessions
- Report issue works

### 7. GitHub Actions CI/CD (primary deploy method)

The repo has a GitHub Actions workflow that auto-deploys on push to `main`:

```yaml
# .github/workflows/deploy.yml
npm ci → npm run build → wrangler pages deploy build
```

Required GitHub Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### 8. Local Development

```bash
./dev.sh
```

The script handles:
1. Clears local state
2. Temporarily strips `database_id` from wrangler.jsonc (restored on exit)
3. Runs `npm run build`
4. Starts `wrangler pages dev build --d1=DB`
5. Applies migrations and seeds local D1 database

Access at `http://localhost:8788`.

**Note**: `database_id` must be present in `wrangler.jsonc` for CI/CD to work. The `dev.sh` script handles local stripping automatically and restores on exit.

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./dev.sh` | Local dev server with D1 |
| `npx wrangler d1 execute spelling-bee-db --remote --command="..."` | Query D1 |
| `npx wrangler pages deployment tail --project-name=spelling-bee` | View deploy logs |
| `npm run build && npx wrangler pages deploy build --project-name=spelling-bee` | Manual deploy |

## Cost

$0.00/month on Cloudflare free tier.

- 18,000+ words in D1 database (~3MB storage)
- 100K API requests/day (free tier)
- Static asset delivery (unlimited, free)
