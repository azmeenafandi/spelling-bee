# Deploy Checklist

## Prerequisites

1. Cloudflare account with Workers & Pages enabled
2. Wrangler authenticated: `npx wrangler login`

## Deploy Steps

### 1. Create D1 Database

```bash
# Create the D1 database (only needed once)
npx wrangler d1 create spelling-bee-db

# Copy the database_id from the output and update wrangler.jsonc:
# "database_id": "<real-id>"
```

### 2. Run Migrations

```bash
# Apply schema migrations
npx wrangler d1 migrations apply spelling-bee-db --remote
```

### 3. Seed Word List

```bash
# Populate the words table
npx wrangler d1 execute spelling-bee-db --remote --file=seed/seed.sql
```

### 4. Verify Database

```bash
# Check words were seeded correctly
npx wrangler d1 execute spelling-bee-db --remote \
  --command="SELECT variant, COUNT(*) FROM words GROUP BY variant"
```

### 5. Deploy Frontend + Functions

```bash
# Build is already done: npm run build
# Deploy to Cloudflare Pages
npx wrangler pages deploy build --project-name=spelling-bee
```

### 6. Verify Deployment

Visit `https://spelling-bee.pages.dev` (or your custom domain).

Test:
- Select variant → Start game
- Pronounce button works
- Type spelling → Enter
- Correct/wrong feedback appears
- Two-attempt mechanic works
- Game over screen shows answer
- High score persists across sessions
- Report issue works
- Settings export/import works

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npx wrangler pages dev build` | Local dev with Functions |
| `npx wrangler d1 execute spelling-bee-db --remote --command="..."` | Query D1 |
| `npx wrangler pages deployment tail --project-name=spelling-bee` | View logs |
| `npx wrangler pages deploy build --project-name=spelling-bee` | Deploy updated frontend |

## Cost

$0.00/month on Cloudflare free tier, indefinitely.
