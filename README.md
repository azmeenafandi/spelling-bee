# Spelling Bee

A single-player spelling practice game with escalating difficulty, algorithmic scoring, and persistent achievements.

## Features

- **18,000+ words** - Algorithmically scored by length and obscurity
- **British and American English** - Choose your spelling variant
- **Streak-based progression** - Ranks, tiers, and achievements track your skill
- **Two-attempt mechanic** - Wrong twice and the game ends; progressive hints after the first miss
- **Daily challenge** - Compete against yourself with shareable results
- **Sound and haptic feedback** - Pronounce words aloud; feel the buzz on mobile
- **Dark mode** - System, light, and dark themes
- **Progressive Web App** - Installable on any device
- **WCAG AA accessible** - Keyboard navigable, screen reader friendly, reduced motion respected

## Tech Stack

- **SvelteKit** with Svelte 5 (runes mode)
- **Cloudflare Pages** + D1 database
- **TypeScript**
- **Scholar's Ink** design system (OKLCH colour palette)

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Deployment

The app deploys to **Cloudflare Pages** with D1 for the word database. GitHub Actions runs CI/CD on push to main.

See [DEPLOY.md](.documentations/DEPLOY.md) for full deployment instructions.

## Project Structure

```
spelling-bee/
├── src/               # SvelteKit app (routes, components, lib)
├── functions/         # Cloudflare Pages Functions (API endpoints)
├── migrations/        # D1 database migrations
├── seed/              # Word list seed files
├── static/            # Static assets (favicons, manifest)
```

## License

MIT
