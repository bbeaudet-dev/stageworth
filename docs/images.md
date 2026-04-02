# Show Images — Implementation Handoff

This document covers the strategy and technical details for sourcing, storing, and displaying show/production images in the Theatre Diary app.

---

## Overview

Two external API sources, chosen based on the type of show:

| Source | Best For | Coverage |
|---|---|---|
| **Ticketmaster Discovery API** | Active & upcoming NYC productions | Excellent — producers upload official key art |
| **Wikipedia REST Page Summary API** | Historical shows / long-tail backfill | Good — ~80–90% of notable Broadway shows have usable images |

Images are fetched **once at enrichment time** and the URL is stored in the database. They are **never fetched live at image-load time** in the app. See the Storage Strategy section for important notes on when storing a URL differs legally from downloading and re-hosting an image file.

---

## Data Model (Implemented)

### `shows` table — show-level fields

| Field | Type | Purpose |
|---|---|---|
| `images` | `Id<"_storage">[]` | Curated/seed images stored in Convex file storage. Highest priority when present. |
| `hotlinkImageUrl` | `string?` | Hotlinked URL from Wikipedia CDN or Ticketmaster CDN. Used when `images` is empty. |
| `hotlinkImageSource` | `"wikipedia" \| "ticketmaster"?` | Tracks which source provided the hotlink URL. |
| `wikipediaTitle` | `string?` | Resolved Wikipedia article title (avoids repeat lookup). |
| `ticketmasterAttractionId` | `string?` | TM attraction-level ID for future queries. |

### `productions` table — production-level fields

| Field | Type | Purpose |
|---|---|---|
| `posterImage` | `Id<"_storage">?` | Curated poster stored in Convex file storage. |
| `hotlinkPosterUrl` | `string?` | TM event image URL. |
| `ticketmasterEventId` | `string?` | For direct `/events/{id}/images` refresh. |
| `ticketmasterEventUrl` | `string?` | Deep link for TOS attribution. |

### Enrichment upgrade rule

Ticketmaster may replace a Wikipedia hotlink on a show, but Wikipedia must not overwrite an existing Ticketmaster URL. This is enforced in `convex/imageEnrichment/mutations.ts`.

---

## Source 1: Wikipedia REST Page Summary API

### When to Use
- Backfilling images for the existing ~2,500 historical shows in the database.
- Any new show created via bot ingestion that doesn't have a Ticketmaster match.

### How It Works
Wikipedia exposes a REST summary endpoint per article that includes a `thumbnail` and `originalimage` field.

**Endpoint:**
```
GET https://en.wikipedia.org/api/rest_v1/page/summary/{TITLE}
```

- `{TITLE}` is the URL-encoded Wikipedia article title (spaces become underscores or `%20`).
- No API key required.
- Returns JSON.

**Relevant response fields:**
```json
{
  "title": "Hamilton (musical)",
  "type": "standard",
  "thumbnail": {
    "source": "https://upload.wikimedia.org/wikipedia/en/thumb/...",
    "width": 320,
    "height": 457
  },
  "originalimage": {
    "source": "https://upload.wikimedia.org/wikipedia/en/...",
    "width": 1000,
    "height": 1430
  }
}
```

Use `originalimage.source` for best quality. Fall back to `thumbnail.source` if original is missing.

### Title Resolution (Implemented)

Implemented in `convex/imageEnrichment/nameMatch.ts` and `convex/imageEnrichment/wikipedia.ts`.

**Strategy (in order):**

1. **Try the plain show name first** — `Hamilton`, `Phantom of the Opera`.
2. **Append type disambiguator** — `(musical)`, `(play)`, or `(opera)` based on `shows.type`.
3. **Wikipedia search API fallback** — `?action=query&list=search&srsearch={show+name+broadway}`.

Each candidate is validated with a **Dice coefficient name similarity score** (threshold 0.65) against the returned article title, and disambiguation pages (`type === "disambiguation"`) are rejected. The resolved article title is stored in `shows.wikipediaTitle` to avoid repeat lookup.

### Image Licensing — Important Distinction

Wikipedia images fall into two legally distinct categories, identifiable by the URL path:

**`/wikipedia/commons/` — Wikimedia Commons (freely licensed)**
These carry explicit free licenses (CC-BY, CC-BY-SA, public domain, etc.). You can display and re-host these as long as you follow the license terms, which usually just means attribution. No legal ambiguity.

**`/wikipedia/en/` (or other language codes) — Fair-use images**
These are copyrighted works — owned by the show's producers — that Wikipedia hosts under US fair use doctrine. Wikipedia's use is legally protected. Your app's use is not automatically protected by the same doctrine. Storing (downloading) one of these is technically making an infringing copy of a copyrighted work.

**The practical safe path for fair-use images: hotlink, don't copy.**
Storing the URL and loading the image directly from Wikimedia's CDN at runtime is meaningfully different from downloading and re-hosting the file. Hotlinking does not create a copy, and Wikimedia explicitly allows CDN hotlinking. This is the approach to use for any image URL containing `/wikipedia/en/`.

The implementing agent should store whichever URL the API returns, but **must not download and save the image bytes** for fair-use images. See the Storage Strategy section for how this shapes the approach.

### Rate Limits & Etiquette
- No hard rate limit, but Wikipedia requests a maximum of **200 requests/second** and recommends a **User-Agent header** identifying your app:
  ```
  User-Agent: TheatreDiaryApp/1.0 (contact@yourdomain.com)
  ```
- For a backfill of 2,500 shows, run at ~5–10 requests/second with a small delay. The whole job should complete in well under 10 minutes.

### Known Limitations
- Some newer or niche shows won't have Wikipedia articles → image will remain null.
- Wikipedia infobox images for shows with multiple productions (especially revivals) tend to show the original production's art, not the most recent one. This is acceptable for the historical-shows use case.
- Wikipedia article titles for West End shows sometimes differ from Broadway titles. The search API fallback handles this.

---

## Source 2: Ticketmaster Discovery API

### When to Use
- Enriching **active and upcoming productions** with official production key art.
- Can be run on a scheduled basis (e.g. daily or weekly) to pick up new productions and refresh images for existing ones.
- Pairs with the existing closing-soon cron — you can piggyback image enrichment in the same job or a sibling one.

### Authentication
Free self-serve API key. Register at: https://developer.ticketmaster.com/

Default quota: **5,000 requests/day**, rate limit: **5 requests/second**.

No OAuth required — just append `?apikey={key}` to every request. Store the key as a Convex environment variable (e.g. `TICKETMASTER_API_KEY`).

### Querying Broadway/Theatre Events

**Search for theatre events in New York:**
```
GET https://app.ticketmaster.com/discovery/v2/events.json
  ?apikey={key}
  &classificationName=Theatre
  &city=New York
  &countryCode=US
  &size=200
```

**Useful filter parameters:**
- `classificationName=Theatre` — filters to the Arts/Theatre segment.
- `keyword={show name}` — narrows to a specific show.
- `venueId={id}` — filter by specific Broadway venue if you have venue IDs.
- `startDateTime` / `endDateTime` — filter by date range.
- `size` — max 200 per page; use `page` parameter to paginate.

### Response Structure

Each event in `_embedded.events` contains:
```json
{
  "name": "Hamilton",
  "id": "G5eVZ9xaFbWef",
  "url": "https://www.ticketmaster.com/event/...",
  "images": [
    {
      "ratio": "16_9",
      "url": "https://s1.ticketm.net/..._TABLET_LANDSCAPE_16_9.jpg",
      "width": 2048,
      "height": 1152,
      "fallback": false
    },
    {
      "ratio": "3_2",
      "url": "https://s1.ticketm.net/..._ARTIST_PAGE_3_2.jpg",
      "width": 305,
      "height": 203,
      "fallback": true
    }
    // ... more ratios
  ],
  "_embedded": {
    "venues": [{ "name": "Richard Rodgers Theatre", "city": { "name": "New York" } }],
    "attractions": [{ "name": "Hamilton", "id": "K8vZ9175abcV" }]
  },
  "dates": {
    "start": { "localDate": "2026-01-15" },
    "end": { "localDate": "2026-06-30" }
  }
}
```

**Choosing the right image from the array:**

Ticketmaster returns multiple images per event at different ratios and resolutions. For a portrait-style show poster (which is what you want), prefer:
- Ratio `3_2` or `4_3` at the highest resolution where `fallback: false`.
- `fallback: true` means the image is a generic category placeholder, not show-specific — **skip these** and only use `fallback: false` images.
- If all images are `fallback: true`, skip this event — Ticketmaster doesn't have real art for it.

### Matching Ticketmaster Events to Your Productions

Ticketmaster events map to your `productions` table (a specific run of a show at a venue). The matching logic:

1. **By name + venue city**: normalize both show names (lowercase, strip punctuation) and compare. If the city matches a known Broadway/NYC venue, it's a strong match.
2. **Store the Ticketmaster event ID** on the `productions` record after a successful match, so future refreshes can use the direct event endpoint:
   ```
   GET /discovery/v2/events/{eventId}/images.json?apikey={key}
   ```
3. **Attraction ID as show-level identifier**: the `attractions[0].id` in the response is Ticketmaster's ID for the show as an attraction (distinct from the individual event). You can store this on the `shows` record and use it to find all events for that show across productions.

### Attribution Requirements

Ticketmaster's TOS for the free Discovery API requires:
- Display of "Powered by Ticketmaster" or similar attribution near any content sourced from the API.
- Event URLs must deep-link back to Ticketmaster's event page.

For images specifically, the TOS is less explicit, but it's good practice to store the source event URL alongside any image pulled from the API.

---

## Storage Strategy

### For Wikipedia Images — Store the URL, Always

Store the Wikimedia CDN URL in the database and load it at runtime. Do **not** download and re-host Wikipedia images.

- For **Wikimedia Commons images** (`/wikipedia/commons/`): re-hosting is legally fine (freely licensed), but storing the URL is simpler and sufficient for now.
- For **fair-use images** (`/wikipedia/en/`): re-hosting creates an infringing copy. Hotlinking (storing the URL and loading from Wikimedia's CDN) is the correct approach and is explicitly permitted by Wikimedia.

Both Wikimedia URL types are stable long-term — Wikimedia's CDN is extremely reliable and URLs do not change once assigned.

### For Ticketmaster Images — Store the URL to Start

Ticketmaster images are officially licensed for display via the API, so re-hosting is not a copyright issue, but storing the URL is simpler to ship and Ticketmaster's CDN (`s1.ticketm.net`) is stable in practice.

**Future option — Re-host Ticketmaster images in Convex File Storage:**
If you want full control (consistent resizing, no upstream dependency, your own CDN), you can download Ticketmaster images at ingestion time and store them in Convex file storage. This is worth considering as the app scales, but is not necessary to start. If you pursue this, note it only applies to Ticketmaster images — Wikipedia fair-use images should never be re-hosted regardless of scale.

---

## Fallback Hierarchy (Implemented)

Centralized in `convex/helpers.ts` (`resolveShowImageUrls` and `resolveProductionPosterUrl`).

### Production context (e.g. `ProductionCard`)

1. `production.hotlinkPosterUrl` (Ticketmaster CDN)
2. `production.posterImage` (Convex file storage)
3. Show image chain (below)

### Show image chain (e.g. `ShowCard`, `ShowDetailScreen`)

1. `show.images` (curated Convex file storage — seed data wins when present)
2. `show.hotlinkImageUrl` where source is `ticketmaster`
3. `show.hotlinkImageUrl` where source is `wikipedia`
4. First production with any poster (`hotlinkPosterUrl` or `posterImage`)

### Final fallback

`ShowPlaceholder` component (`src/components/ShowPlaceholder.tsx`) renders a styled, type-aware placeholder with the show name and a genre label. Never shows a broken image or generic grey box.

---

## Enrichment Phases (Implemented)

### Phase A — Backfill Historical Shows (One-Time Job)

`convex/imageEnrichment/wikipedia.ts` → `backfillWikipediaImages` internal action.

Processes shows in batches of 40, chained via `ctx.scheduler.runAfter`. Each batch queries shows where `images` is empty and `hotlinkImageUrl` is unset, runs the Wikipedia title ladder, and patches the show record on success. Runs at ~6–7 req/s.

### Phase B — Enrich Active NYC Productions (Daily Cron)

`convex/imageEnrichment/ticketmaster.ts` → `enrichProductionImages` internal action.

Registered as a daily cron in `convex/crons.ts` at 6:00 AM ET. Targets NYC-district productions (broadway, off_broadway, off_off_broadway) that are not closed and have no poster. Searches Ticketmaster by show name, scores matches with Dice coefficient, and picks the best non-fallback image. Also backfills the parent show's `hotlinkImageUrl` if empty.

### Phase C — Bot Integration (Ongoing)

In `convex/botIngestion.ts` → `ingestProduction`, after notification fan-out:
- For NYC-district productions without images, schedules `enrichProductionTicketmaster`.
- For new shows without images, schedules `enrichShowWikipedia`.

This keeps the image database warm as new shows are announced.

---

## Environment Variables Needed

| Variable | Used By | Notes |
|---|---|---|
| `TICKETMASTER_API_KEY` | Convex cron / bot ingestion | Free from developer.ticketmaster.com |
| *(no key needed for Wikipedia)* | — | Just set a descriptive User-Agent header |

---

## Reference Links

- Ticketmaster Discovery API docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- Ticketmaster developer registration: https://developer.ticketmaster.com/
- Wikipedia REST API summary endpoint: https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_
- Wikipedia search API: https://www.mediawiki.org/wiki/API:Search
- Ticketmaster attribution/branding requirements: https://developer.ticketmaster.com/support/terms-of-use/