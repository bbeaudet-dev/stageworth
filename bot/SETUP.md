# Theatre News Bot — Mac Mini Setup

This bot polls theatre RSS feeds every 3 hours, parses new production
announcements with Claude, and pushes the data into the Convex backend.

## Prerequisites

Install these once on the Mac Mini:

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install pm2 globally via Bun (process manager — keeps the bot running)
bun add -g pm2
```

## One-time setup

```bash
# 1. Clone the repo (or pull the latest if already cloned)
git clone https://github.com/bbeaudet-dev/theatre-diary.git
cd theatre-diary/bot

# 2. Install dependencies
bun install

# 3. Create your .env file
cp .env.example .env
```

Open `.env` and fill in the three values:

| Variable | Where to find it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys |
| `CONVEX_BOT_URL` | Convex dashboard → your deployment → Settings → URL, then append `/bot/ingest` |
| `BOT_SECRET` | Any strong random string you choose (e.g. `openssl rand -hex 32`) |

Then set `BOT_SECRET` on the Convex side so the endpoint accepts the bot:

```bash
# From the theatre-diary root (not bot/)
bunx convex env set BOT_SECRET <the same value you put in .env>
```

## Test before going live

Run in dry-run mode first — this polls all feeds and logs what it finds
but makes NO writes to Convex:

```bash
cd bot
DRY_RUN=true bun run dev
```

You should see lines like:
```
[2026-03-25T...] Polling feeds...
[new_announcement] Hamilton (broadway) conf=0.91
DRY RUN — would ingest: { show_name: "Hamilton", ... }
[2026-03-25T...] Poll complete.
```

If that looks right, move on to the next step.

## Start the bot with pm2

```bash
cd bot

# Start it
pm2 start --name theatre-bot --interpreter bun src/index.ts

# Make it survive reboots (follow the printed instructions after running this)
pm2 startup
pm2 save
```

## Day-to-day commands

```bash
pm2 status                  # is the bot running?
pm2 logs theatre-bot        # live log output
pm2 logs theatre-bot --lines 100   # last 100 lines
pm2 restart theatre-bot     # restart after a code update
pm2 stop theatre-bot        # stop it temporarily
```

## Updating the bot

```bash
cd theatre-diary
git pull
cd bot
bun install         # only needed if package.json changed
pm2 restart theatre-bot
```

## Troubleshooting

**Bot is running but nothing is being ingested:**
- Check `pm2 logs theatre-bot` for "Skip (low confidence)" messages — the parser
  may be filtering out articles. Lower `MIN_CONFIDENCE` in `src/index.ts` temporarily
  to see what's being parsed.
- Check that `CONVEX_BOT_URL` ends with `/bot/ingest` (not just the base URL).

**"Unauthorized" errors in the logs:**
- `BOT_SECRET` in `.env` doesn't match the one set in Convex.
- Re-run: `bunx convex env set BOT_SECRET <value>` from the repo root.

**Bot crashes on startup:**
- Make sure `.env` exists and all three variables are filled in.
- Run `DRY_RUN=true bun run dev` to see the full error in your terminal.

**`seen.db` is getting large:**
- This is normal over time. It only stores article URLs (text), so it stays small
  (a few MB even after years). No action needed.
