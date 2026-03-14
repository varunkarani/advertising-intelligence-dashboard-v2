# Advertising Intelligence Command Center V2

This is the corrected V2 build for the dashboard.

## What changed versus V1

V1 failed for two reasons:
1. it tried to treat normal webpages as RSS feeds
2. it depended on browser-side cross-site fetching from a static GitHub Pages deployment

V2 fixes the architecture:
- the front-end stays static
- a Vercel serverless function (`/api/feeds`) fetches and parses source pages server-side
- the UI shows source health honestly
- the UI falls back gracefully instead of rendering a dead empty shell

## Files

- `index.html` - main dashboard page
- `styles.css` - UI and responsive layout
- `config.js` - front-end config and local fallback stories
- `app.js` - dashboard logic
- `api/feeds.js` - Vercel serverless source fetch + parse layer
- `package.json` - dependency definition for cheerio
- `vercel.json` - Vercel config

## How to deploy

### 1. Create a new GitHub branch or repo
Move these files into a repo root exactly like this:

```text
repo/
  index.html
  styles.css
  config.js
  app.js
  package.json
  vercel.json
  api/
    feeds.js
```

### 2. Push to GitHub

### 3. Import the repo into Vercel
- Go to Vercel
- Import the GitHub repo
- Accept defaults
- Deploy

Because `package.json` exists, Vercel will install `cheerio` and make `/api/feeds` live.

## Important reality

This is a corrected V2, not a perfect final production system.

Why:
- some source pages change HTML structure often
- some sources may block or throttle automated requests
- generic parsing is never as stable as a purpose-built feed or paid data source

## What to test immediately after deployment

### 1. Check the API directly
Open:

```text
https://YOUR-VERCEL-DOMAIN/api/feeds
```

You should see JSON with:
- `generatedAt`
- `stories`
- `sourceHealth`

### 2. Check source health in the UI
You want to see:
- some sources with `ok`
- some story counts above zero
- a non-zero total story count

### 3. If all sources fail
Open Vercel logs and inspect:
- HTTP status failures
- fetch errors
- parser misses

## Strong recommendation for V3

Once V2 is working, move away from generic page parsing for your highest-value sources.

Best next upgrades:
- replace generic scraping with source-specific parsers
- add per-source selector configs
- add scheduled caching into a KV store or database
- enrich summaries with a proper editorial scoring layer
- add real MENA-first sources with dedicated weighting

## One blunt truth

Do not keep GitHub Pages as the main deployment target for this product if you want live public-source ingestion.

GitHub Pages is fine for static UI hosting.
It is the wrong place to run the data layer.
