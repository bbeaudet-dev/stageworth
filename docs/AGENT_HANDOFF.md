# Theatre Diary — context for agents (no codebase access)

Single document: data model, product surfaces, stack, bots/crons. Copy the whole file or sections as needed.

---

## What it is

Mobile app (Expo / React Native) for tracking live theatre: works (**shows**), specific runs (**productions**), performances attended (**visits**), personal organization (**lists**, **rankings**), and **trip planning** with optional collaboration. Backend: **Convex**. Auth: **Better Auth** (Expo). Routing: **expo-router**.

---

## Data model

### Show → production → visit

| Concept       | Role |
|---------------|------|
| **Show**      | Abstract work (e.g. *Hamilton*): name, type (musical / play / opera / dance / other), images, optional external IDs. User-created vs curated. |
| **Production**| Specific run: `showId`, theatre/city, **district** (Broadway, West End, touring, etc.), preview/opening/closing dates, open-run flag, production type (original, revival, transfer, …). Links the catalogue title to a real engagement. |
| **Venue**     | Structured theatre/place (name, city, country, district, geo, optional Google place id). |
| **Visit**     | User’s attended performance: `userId` + `showId`; optional `productionId` and `venueId`; **date**; optional seat, matinee/preview/final flags, cast, notes, tagged friends. Denormalized show/theatre/city/district when `productionId` is missing. |

**Mental model:** Show = work; Production = that work in a particular run; Visit = you were there on a given date (optionally tied to production and venue).

### Lists vs trips

- **Lists** (`userLists`): ordered bucket of **show IDs** (`showIds`), not productions or visits. System kinds: want_to_see, look_into, not_interested, uncategorized; users can have **custom** lists.
- **Trips** (`trips`): **date-bounded plans** (`startDate` / `endDate`). **`tripShows`** attach shows to a trip with optional `dayDate` and order; **`tripDayNotes`** are per-day notes; **`tripMembers`** support view/edit sharing (invitation flow simplified in schema).

### Other important tables

- **userRankings**: one doc per user — ordered `showIds` (rank = array index); optional “would see again” / “stayed home” line indices for UI.
- **userShows**: per user + show — tier (`loved` | `liked` | `okay` | `disliked` | `unranked`) and `addedAt`.
- **follows**: social graph.
- **notifications**: visit_tag, new_follow, show_announced, closing_soon; links to visits/shows/productions as relevant.
- **activityPosts**: feed items (e.g. `visit_created`) with denormalized visit/show context.

---

## Main product surfaces (routing)

- **Community** — social / feed.
- **Plan** — trips (list, detail, shows per day, day notes, party/chat-style tabs in code).
- **Center “+”** — add visit, create trip, create list (often routed via Plan query params).
- **Browse** — discovery (shows / productions).
- **My Shows** (profile tab) — collection, rankings, lists; list detail as stack route.

Other routes include: show detail, visit detail, add visit, list by id, notifications, account settings, public user profile.

---

## Tech stack (high level)

- Client: Expo ~54, React 19, React Native, TypeScript, expo-router.
- Backend: Convex (`convex/`).
- Auth: better-auth + `@better-auth/expo`, `@convex-dev/better-auth`.

---

## Bots, ingestion, and scheduled jobs

### Convex cron (server-side)

**Closing-soon alerts** — `convex/crons.ts`

- Runs **daily at 9:00 AM Eastern** (14:00 UTC), job id `closing-soon-alerts`.
- Finds productions with `closingDate` in the next **14 days**.
- For each, finds users who have that **show** on **any list** (`userLists.showIds`).
- Inserts **`closing_soon`** notification (`actorKind: "system"`) unless the same user+production had one in the last **7 days**.
- Sends Expo push: “Closing soon” plus days left; payload includes `showId` / `productionId`.

### External theatre news bot (separate Bun app)

Package **`theatre-news-bot`** in repo `bot/`. **Not** a Convex cron; long-running process (HTTP comment mentions “Mac Mini news bot”).

**Schedule**

- Poll **on startup**, then **every 3 hours** via `node-cron` (`0 */3 * * *`).

**RSS sources** (`bot/src/sources.ts`)

- BroadwayWorld: News, Openings, Closings
- Playbill, TheaterMania

**Pipeline**

1. Fetch RSS; **dedupe by article URL** (local seen-URL store).
2. **Anthropic Claude** parses title + snippet into structured production fields (show name, types, district, theatre/city, dates, `event_type`, confidence, one-line `summary`).
3. Skip if confidence **< 0.6**; skip **`casting`** and **`other`** event types.
4. **POST** to Convex **`/bot/ingest`** with `Authorization: Bearer BOT_SECRET`. Convex env `BOT_SECRET`; bot needs `CONVEX_BOT_URL` + `BOT_SECRET`. `DRY_RUN=true` logs only.

**Convex ingest** (`convex/http.ts` → `convex/botIngestion.ts`)

- Resolve or create **show** (normalized name; new shows may get `externalSource: "bot"`).
- Match or create **production**; **patch dates** when article updates them.
- New non-closed production/show: may **add show to all users’ uncategorized list** when eligible.
- **Schedules** immediate internal actions:
  - **New production:** inbox **`show_announced`** + push “New show announced” (summary body) to users with Expo tokens.
  - **Date change only:** push “{showName} — dates updated”; pushes only (no matching inbox row like show_announced for that path).

### Other scheduling

- `ctx.scheduler.runAfter(0, …)` runs **async follow-up** after some mutations (e.g. pushes on visit tags / follows), not recurring crons.

---

## Quick distinctions for implementation

1. **List vs trip:** Lists are persistent **show** buckets; trips are **time-scoped itineraries** with days, `tripShows`, `tripDayNotes`, members.
2. **Show vs production in UI:** Distinguish the **work** from a **specific run** (browse/cards/utilities).
3. **Visit is the diary entry:** Always has a **show**; production/venue optional.

---

_End of handoff document._
