# OpenClaw integration: Stageworth bot activity (morning summary)

This document is for whoever maintains the Mac Mini / OpenClaw `daily-report.js` (or similar). It describes the Convex HTTP API that exposes **recent news-bot ingestion activity** so you can append a theatre section to Ben’s morning opener.

## What it is

- The Stageworth app receives parsed Broadway/off-Broadway articles from a **news bot** via `POST /bot/ingest` (same deployment, same secret).
- Each successful parse is recorded in Convex as a **`botActivity`** row (audit log).
- A **read-only** endpoint returns recent rows as JSON for your script to consume.

## Endpoint

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **Path** | `/bot/activity` |
| **Base URL** | Your Convex **HTTP** site: `https://<DEPLOYMENT_NAME>.convex.site` (not the `.cloud` dashboard URL). Replace `<DEPLOYMENT_NAME>` with the production deployment name from the Convex dashboard. |
| **Full example** | `https://<DEPLOYMENT_NAME>.convex.site/bot/activity` |

## Authentication

Use the **same** secret as bot ingest:

- Convex env var: `BOT_SECRET` (set with `npx convex env set BOT_SECRET '<value>'`).
- Header on every request:

```http
Authorization: Bearer <BOT_SECRET>
```

Store the token in the same pattern as other secrets (e.g. `/Users/bot/.openclaw/workspace/secrets/`) and read it in `daily-report.js`. **Do not** commit the secret.

## Query parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `since` | No | Start of time window. **Epoch milliseconds** (e.g. `1711929600000`) or **ISO 8601** string (e.g. `2025-04-01T04:00:00.000Z`). If omitted, the server defaults to **the last 24 hours** from “now” (server time). |

**Suggested use for “yesterday” (ET):** compute midnight-to-midnight in America/New_York, convert to epoch ms, and pass as `since` (and optionally call twice or use a single window that covers “since last run” if you prefer).

## Response

- **Status:** `200` with `Content-Type: application/json`
- **Body:** JSON **array** of objects. Rows with `action: "skipped"` are **not** included (they represent duplicate/no-op ingestions).

Each element:

| Field | Type | Description |
|-------|------|-------------|
| `showName` | string | Parsed show title |
| `action` | string | One of: `show_created`, `production_created`, `production_updated` |
| `confidence` | number | Parser confidence (0–1) |
| `summary` | string | Short human-readable summary from the article |
| `sourceUrl` | string | Original article URL |
| `createdAt` | number | Unix epoch **milliseconds** when the row was written |

Example (truncated):

```json
[
  {
    "showName": "Example Musical",
    "action": "production_created",
    "confidence": 0.92,
    "summary": "New musical announced for fall 2026…",
    "sourceUrl": "https://example.com/article",
    "createdAt": 1711929600000
  }
]
```

**Errors:**

- `401` — missing or wrong `Authorization` header.
- `400` — invalid `since` (unparseable string).

## Which `action` values to show in the morning report

Recommended for a **“New shows / productions announced”** line in the high/mid energy report:

- **`show_created`** — New show row in the database (net-new title).
- **`production_created`** — New production run (new venue/district run for an existing or new show).

Optional (often noisy; use if Ben wants date-change visibility):

- **`production_updated`** — Existing production’s dates were patched from the bot.

You can filter in script, e.g. only `show_created` and `production_created`, or require `confidence >= 0.8`.

## Example: Node.js `fetch`

```javascript
const BOT_SECRET = process.env.THEATRE_DIARY_BOT_SECRET; // or read from secrets file
const BASE = "https://<DEPLOYMENT_NAME>.convex.site";

async function fetchTheatreNewsSince(sinceMs) {
  const url = new URL("/bot/activity", BASE);
  url.searchParams.set("since", String(sinceMs));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BOT_SECRET}` },
  });
  if (!res.ok) {
    throw new Error(`bot/activity ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Example: filter to “new” items only
function filterNewAnnouncements(rows) {
  return rows.filter(
    (r) =>
      r.action === "show_created" || r.action === "production_created"
  );
}
```

## Relationship to `POST /bot/ingest`

- **Ingest:** `POST https://<DEPLOYMENT_NAME>.convex.site/bot/ingest`  
  Body: JSON matching the bot’s parsed production payload (unchanged).  
  Header: `Authorization: Bearer <BOT_SECRET>`.

- **Activity:** `GET …/bot/activity?since=…` as above.

New `botActivity` rows are written **inside** the ingest mutation when the bot posts an article; no extra bot changes are required beyond continuing to call `/bot/ingest` as today.

## Checklist for the OpenClaw maintainer

1. Confirm production deployment name and set `BASE` to `https://<DEPLOYMENT_NAME>.convex.site`.
2. Reuse `BOT_SECRET` from the ingest pipeline (or duplicate the same value in a secrets file readable by `daily-report.js`).
3. Implement `fetchTheatreNewsSince` (or equivalent) and append a block such as:

   ```text
   🎭 New shows / productions (since …):
   • Show Title — short summary or source hostname
   ```

4. Handle empty arrays gracefully (no section, or “No new theatre items in this window”).
5. After deploy, smoke-test with curl:

   ```bash
   curl -sS -H "Authorization: Bearer $BOT_SECRET" \
     "https://<DEPLOYMENT_NAME>.convex.site/bot/activity?since=$(node -e 'console.log(Date.now()-864e5)')"
   ```

## Convex-side implementation reference (for humans)

- Table: `botActivity` in `convex/schema.ts`
- Writes: `ingestProduction` in `convex/botIngestion.ts`
- Query: `internal.botIngestion.listBotActivitySince`
- Route: `convex/http.ts` — `GET /bot/activity`
