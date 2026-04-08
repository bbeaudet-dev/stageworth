# Playbill Data Enrichment — Plan

This document covers the full plan for scraping Playbill for running times,
descriptions, and production dates, routing that data through the review queue,
and upgrading the admin dashboard with a property-focused bulk review mode.

---

## Part 1: Legality & Commercialization

### When does scraping become a legal problem?

**The short answer:** once there's revenue, the risk profile changes.

| Scenario | Risk |
|---|---|
| Personal, non-commercial, no ads | Essentially zero |
| Free app on App Store, no revenue | Very low (still "distribution") |
| Free app with Ticketmaster / TodayTix affiliate links | **Commercially relevant** — you earn from traffic |
| Paid app or subscription | Clearly commercial |

Affiliate links are the crossing point. You're now deriving financial benefit
from user engagement that is partly enabled by Playbill's data. This doesn't
mean Playbill will pursue you — they almost certainly won't at small scale —
but it means that legally, "personal use" no longer applies.

### What to actually do about it

1. **Now:** Build it, ship it. Rate-limit requests, send an honest `User-Agent`,
   respect `robots.txt`. You're already doing this in `fetchWeeklyShowtimes.mjs`.
2. **When affiliate links go live:** Add a note in docs that you intend to
   reach out to Playbill once you have traction.
3. **When you hit real scale or revenue:** Explore one of:
   - A data partnership / licensing deal with Playbill or the Broadway League
   - IBDB (Internet Broadway Database) — has data-sharing relationships
   - Official Broadway League data (not publicly available, but accessible via
     partnership for commercial apps)

The data itself (running times, dates, descriptions) is factual and not
copyrightable, which is a meaningful protection. The arrangement/expression of
descriptions is more expressive — but for now, build it.

---

## Part 2: Schema Changes

### `shows` table — two new fields

```ts
runningTime: v.optional(v.number()),        // minutes, e.g. 150
description: v.optional(v.string()),        // a few sentences from Playbill
```

`runningTime` as an integer minutes is better than a string ("2h 30m") because
it enables comparisons, sorting, and display formatting at the UI layer.

### `productions` table — one new field

```ts
playbillProductionId: v.optional(v.string()), // e.g. "hamilton-richard-rodgers-theatre-vault-0000000029"
```

This is the stable identifier used to construct the Playbill URL and to avoid
re-scraping what we already have. It lives on `productions` rather than `shows`
because Playbill pages are per-production (a revival has a different page than
the original).

### `reviewQueue.source` union — one new value

```ts
v.literal("playbill")
```

### `SHOW_REVIEWABLE_FIELDS` and `PRODUCTION_REVIEWABLE_FIELDS`

In `convex/reviewQueue.ts`, add the new fields:

```ts
export const SHOW_REVIEWABLE_FIELDS = [
  "name", "type", "subtype", "hotlinkImageUrl",
  "runningTime",       // NEW
  "description",       // NEW
] as const;
```

`playbillProductionId` is a mapping field, not a reviewable data field — it
gets set directly (or via a lightweight mapping review flow described below).

---

## Part 3: Playbill ID Mapping

The core challenge: we need to know which Playbill page corresponds to which
production in our DB. This is a one-time-per-production exercise.

### URL structure

Playbill production pages look like:
```
https://playbill.com/production/hamilton-richard-rodgers-theatre-vault-0000000029
```

The slug after `/production/` is the `playbillProductionId`.

### How to find the ID for a show

Two paths:

1. **Playbill search** (`playbill.com/search?q=show+name`) — returns links to
   show and production pages. Parseable.
2. **Manual lookup** — for important shows, just find the URL yourself.

### Mapping workflow

There are three categories of productions:

| Category | Approach |
|---|---|
| Currently running (in weekly showtimes JSON) | Script auto-finds via Playbill search, confidence-ranked |
| Recently closed, well-known | Auto-search + review |
| Historical / obscure | Manual or skip |

For auto-found mappings with high confidence (exact name match + matching
theatre/year), the `playbillProductionId` is written directly to the DB after
admin confirmation in a lightweight one-shot mapping review. For low-confidence
matches, they appear in a "Mapping Candidates" section in the admin UI.

We do **not** need to map every production before the pipeline is useful. The
pipeline only scrapes productions that have `playbillProductionId` set. Map
them incrementally.

---

## Part 4: Data Pipeline Architecture

### Two trigger modes

#### 4A: Event-driven (new show / production created)

When a show or production is created — whether manually from the admin form or
via the bot — trigger a Convex internal action:

```
createShow / createProduction mutation
    └── schedules: internal.playbill.enrichNewProduction(productionId)
```

That action:
1. Searches Playbill for the show name + theatre
2. If a high-confidence match is found, writes `playbillProductionId` to the
   production and queues enrichment (runtime, description, dates)
3. If low-confidence, creates a "mapping candidate" reviewQueue entry for
   admin review before any data is staged

This replaces the "we'd miss a lot of data for new shows" problem entirely.
New shows get enriched within minutes of being added.

#### 4B: Scheduled batch (GitHub Action, monthly)

Handles:
- Shows added before this system existed
- Date changes for existing productions (closing announcements, etc.)
- Re-checking shows whose data may have changed

The action queries Convex's HTTP API for:
```
productions WHERE playbillProductionId IS NOT NULL
  AND (runningTime IS NULL
       OR description IS NULL
       OR closingDate IS NULL
       OR last enrichment was > 30 days ago)
```

Then for each, fetches the Playbill page, diffs against current DB values, and
POSTs new/changed fields to a Convex HTTP action that creates `reviewQueue`
entries.

This is deliberately NOT a PR-to-git flow (unlike the showtimes pipeline),
because the data lives in the DB. The reviewQueue is the staging layer.

### Script: `scripts/fetchPlaybillShowData.mjs`

```
Usage:
  bun scripts/fetchPlaybillShowData.mjs               # all eligible productions
  bun scripts/fetchPlaybillShowData.mjs --dry-run     # no writes, logs output
  bun scripts/fetchPlaybillShowData.mjs --id <slug>   # single production

Exit codes:
  0 — success
  1 — hard error
  2 — Convex API unavailable (retry)
```

Fields extracted per Playbill page:
- Running time (show-level, if present)
- Description / synopsis (show-level)
- Preview date (production-level)
- Opening date (production-level)
- Closing date (production-level)

### GitHub Action: `playbill-enrichment.yml`

```yaml
on:
  schedule:
    - cron: "0 8 1 * *"   # 1st of the month, 8am UTC
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry run (no writes to DB)"
        type: boolean
        default: false
```

Same retry / summary pattern as `weekly-showtimes.yml`.

---

## Part 5: Admin Dashboard Upgrade

This is the biggest change and the most valuable long-term. The goal is to go
from "navigate into every show individually to do anything" to "bulk-review a
single property across many shows at once, with inline actions."

### Current flow

```
Admin dashboard (show list, status/schedule filters)
    └── click show → full review detail page (all fields, all pending items)
```

This is great for deep-diving a single show. It's slow for bulk data quality
work across many shows.

### Proposed: Property Focus Mode

The dashboard gains a **"Focus Property" selector** in the filter bar. When
set to a property (e.g., "Runtime"), the show cards transform to surface that
property's data inline, with inline approve/reject/edit actions — without
navigating away from the list.

#### Filter bar additions

Current:
```
[All] [Unpublished] [Partial] [Complete]    [Running ✓] [Upcoming ✓] [Closed ✓]
[ Search shows...                      ]    [Add missing show]
```

New:
```
[All] [Unpublished] [Partial] [Complete]    [Running ✓] [Upcoming ✓] [Closed ✓]
[ Search shows...                      ]    [Focus: None ▾]    [Add missing show]
```

The "Focus" dropdown groups properties:

```
— None —
Show properties
  Runtime
  Description
  Type / Subtype
  Image
  Playbill ID (mapping)
Production properties
  Opening Date
  Preview Date
  Closing Date
  Theatre
  District
```

When a production-level property is selected, the list rows shift to
productions (show name + theatre label) rather than shows. The logic for
filtering (running/upcoming/closed, search) still applies.

#### Show card in Property Focus Mode

Instead of the current card showing status badge + pending count:

```
╔══════════════════════════════════════════════════════╗
║  [thumbnail]  Hamilton                               ║
║               Musical · Running                      ║
║                                                      ║
║  Runtime      150 min  ← current DB value            ║
║                        [Edit]                        ║
╚══════════════════════════════════════════════════════╝
```

If there's a **pending reviewQueue entry** for that field:
```
╔══════════════════════════════════════════════════════╗
║  [thumbnail]  Hamilton                               ║
║               Musical · Running                      ║
║                                                      ║
║  Runtime      current: 150 min                       ║
║               ● playbill suggests: 165 min           ║
║               [Approve] [Reject] [Edit] [View note]  ║
╚══════════════════════════════════════════════════════╝
```

If the field is **empty and no pending entry**:
```
║  Runtime      — (empty)    [Add]                     ║
```

Clicking the show name (or thumbnail) still navigates to the full review detail
page. The inline actions are additive — they don't replace the detail view.

#### Inline actions

| Action | What it does |
|---|---|
| **Approve** | Calls existing `approveQueueItem` mutation, applies value to DB |
| **Reject** | Calls `rejectQueueItem`, marks entry rejected |
| **Edit** | Opens a small inline input; submitting calls `editAndApproveQueueItem` |
| **Add** | Opens an inline input; submitting creates a `manual` source reviewQueue entry and immediately approves it |

All of these call the **same Convex mutations that the detail page already uses.**
The Property Focus mode is purely a different UI presentation of the same data
and the same backend operations.

### Is this a separate tab?

No — it lives on the same `/admin` page as the current dashboard. The "Focus
Property" selector is an additional filter dimension. The existing full-detail
per-show workflow is completely unchanged; this is purely additive.

The URL would include the focused property as a query param for shareability:
```
/admin?focus=runningTime&running=1&status=partial
```

### "Pending Queue Items" stat card

The existing stat card shows total pending items. With Property Focus, we could
add a breakdown: "12 pending: 4 runtime, 6 description, 2 dates." This gives
you a quick read on what needs attention when you open the dashboard.

---

## Part 6: Implementation Roadmap

### Phase 1 — Schema (small, prerequisite for everything)

- [ ] Add `runningTime: v.optional(v.number())` to `shows` in `schema.ts`
- [ ] Add `description: v.optional(v.string())` to `shows` in `schema.ts`
- [ ] Add `playbillProductionId: v.optional(v.string())` to `productions`
- [ ] Add `v.literal("playbill")` to `reviewQueue.source` union (schema + `reviewQueue.ts` validator)
- [ ] Add `"runningTime"` and `"description"` to `SHOW_REVIEWABLE_FIELDS`

### Phase 2 — Convex backend

- [ ] New internal action `internal.playbill.enrichProduction(productionId)`:
  searches Playbill, stages reviewQueue entries
- [ ] New internal action `internal.playbill.searchForMapping(name, theatre)`:
  returns candidate `playbillProductionId` values with confidence scores
- [ ] New mutation `playbill.submitFindings`: accepts an array of
  `{ entityType, entityId, field, value, source: "playbill" }` and creates
  reviewQueue entries, skipping duplicates
- [ ] Wire `internal.playbill.enrichProduction` into show/production creation
  mutations (scheduled, not blocking the mutation)
- [ ] New query `reviewQueue.listByField(field, entityType)`: returns all
  entities with a pending reviewQueue entry for a given field, plus current
  DB value — used by the Property Focus UI

### Phase 3 — Scraping scripts

- [ ] `scripts/fetchPlaybillShowData.mjs` — the actual scraper
- [ ] `scripts/mapPlaybillProductions.mjs` — search Playbill by name, return
  candidate slugs for manual confirmation (one-time setup helper)

### Phase 4 — GitHub Action

- [ ] `.github/workflows/playbill-enrichment.yml` — monthly scheduled batch
- [ ] Update `scripts/fetchPlaybillShowData.mjs` to accept Convex API key from
  env, POST findings to the `submitFindings` HTTP action

### Phase 5 — Admin UI: Property Focus Mode

- [ ] Add `focusField` state + URL param to `admin/page.tsx`
- [ ] Add "Focus" dropdown to filter bar
- [ ] New `PropertyFocusCard` component: renders show/production row with
  current value + pending item inline
- [ ] Inline approve/reject/edit actions wired to existing mutations
- [ ] "Add" flow for empty fields (creates `manual` source entry, auto-approves)
- [ ] Update "Pending Queue Items" stat card to show breakdown by field

### Phase 6 — Playbill ID mapping backfill

- [ ] Run `scripts/mapPlaybillProductions.mjs` against currently-running shows
- [ ] Review and confirm high-confidence matches
- [ ] Manually fill in important historical shows

---

## Open questions / decisions deferred

1. **Confidence threshold for auto-mapping:** What exact-match heuristic
   determines "high confidence"? Probably: normalized name match + same district
   + overlapping date range. Needs experimentation.

2. **`runningTime` on show vs. production:** A revival of a show may have a
   different running time. For now, `runningTime` on `shows` is fine (most
   variations are minor). If this becomes a real issue, move it to `productions`.

3. **Description language:** Playbill descriptions vary in length and quality.
   We may want a max character limit (e.g., 500 chars) and possibly a
   "truncated for display" vs. "full" distinction. Defer until we see real data.

4. **Convex action vs. GitHub Action for scraping:** The monthly batch could
   in theory run as a Convex scheduled action (no GitHub Actions needed). This
   would simplify the setup but means scraping runs inside Convex's runtime
   (external HTTP calls from actions are supported). Worth revisiting in Phase 4.
