# Theatre Diary — Data Model

> This document is the source of truth for schema decisions and how the three core entities (shows, productions, visits) relate to each other. Reference this when building any UI or backend logic that touches these tables.

---

## The Three Entities

### Shows
A show title — the abstract concept. e.g. "Hamilton", "Hadestown", "The Lehman Trilogy".

- Shared across all users. Not user-specific.
- Has a type (musical, play, opera, dance, other).
- Has images (playbill art, promotional photos).
- `isUserCreated: boolean` — `true` when a user typed in a show name that wasn't in the database. These are considered "unverified" and won't appear in search results for other users until curated.

### Productions
A specific, real-world run of a show at a specific venue. e.g. "Hadestown, Walter Kerr Theatre, Broadway, Mar 2019 – Jan 2023".

- Shared/curated data. Think of this as a trusted reference database entry.
- Has full metadata: theatre, city, district, opening/closing/preview dates, production type, poster image.
- **Productions are curated-only.** Users do not create productions — they either select one or bypass the production step entirely and enter location directly on their visit.
- `isUserCreated` on productions **is deprecated and should be removed.** There is no user-created production flow. The `isUserCreated` filter in UI code (e.g. `productions.filter(p => !p.isUserCreated)`) can be dropped once the field is removed from the schema.
- Future: productions may sync with an external database (IBDB, Playbill, etc.) via `externalId`.

### Visits
A user's personal record of seeing a show on a specific date. This is entirely user-owned.

- Each visit belongs to one user and one show (via `showId`).
- `productionId` is **optional** — it links to a curated production when the user selects one, and is `null` otherwise.
- `theatre`, `city`, and `district` live directly on visits as **fallback location fields**, used only when `productionId` is absent.

---

## Location Resolution

The effective location for any visit is resolved in this priority order:

```
1. visit.productionId is set  →  use production.theatre / production.city / production.district
2. visit.productionId is null →  use visit.theatre / visit.city / visit.district
3. both null                  →  no location (visit is valid; excluded from map view)
```

This means:
- A visit with a production linked is fully described by that production's data.
- A visit without a production can still carry location info entered directly by the user.
- A visit with neither is fine — it just won't appear on a map.

---

## Current Schema (visits table)

```typescript
visits: defineTable({
  userId: v.id("users"),
  showId: v.id("shows"),            // always required
  productionId: v.optional(v.id("productions")), // optional enrichment

  // Fallback location — only used when productionId is null
  theatre: v.optional(v.string()),
  city: v.optional(v.string()),
  district: v.optional(v.union(     // TODO: add this field
    v.literal("broadway"),
    v.literal("off_broadway"),
    v.literal("off_off_broadway"),
    v.literal("west_end"),
    v.literal("touring"),
    v.literal("regional"),
    v.literal("other")
  )),

  date: v.string(),
  seat: v.optional(v.string()),
  isMatinee: v.optional(v.boolean()),
  isPreview: v.optional(v.boolean()),
  isFinalPerformance: v.optional(v.boolean()),
  cast: v.optional(v.array(v.string())),
  notes: v.optional(v.string()),
})
```

**Pending schema change:** Add `district` to visits (same enum as productions). This is the only missing piece to fully implement Option D.

**Pending schema cleanup:** Remove `isUserCreated` from productions.

> Note: The database can be wiped freely — we are still in early rough-draft phase and have no production data worth preserving.

---

## UI Flow — Add Visit

### Step 1: Select a show
- Search existing shows, or type a custom show name.
- Custom shows create a new `shows` row with `isUserCreated: true`.

### Step 2: Select a production / location
- If the show has curated productions in the database, show them as chips (e.g. "Walter Kerr Theatre · New York").
- Always include an **"Other / Not sure"** option at the end of the chip list.
- Selecting a curated production sets `productionId` on the visit. No theatre/city/district fields needed.
- Selecting "Other / Not sure" shows free-text inputs for theatre and city (and optionally district). These are saved directly on the visit; no `productionId` is set.
- If the user selects nothing, the visit is saved with no location at all. This is valid.

### Step 3: Date, notes, and ranking
- Date defaults to today.
- Notes are optional.
- Ranking: if the show is already ranked, offer "Keep Current Ranking". Otherwise run the ranking flow.

---

## What NOT to Do

- **Do not create user-created productions.** The old pattern of creating a barebones production row (with just theatre + city) when a user picks "Other" is replaced by storing those fields directly on the visit.
- **Do not require a production to save a visit.** Production is optional enrichment, not a prerequisite.
- **Do not use `isUserCreated` on productions** as a filter or signal going forward. The field will be removed.

---

## Multiple Visits to the Same Production

If a user sees the same curated production more than once (e.g., saw Hadestown twice at the Walter Kerr), they create two separate visit rows, both with the same `productionId`. Location, theatre, and dates are inherited from the production for both. This is handled correctly by the current schema with no special logic needed.

For user-entered "Other" location visits of the same show at the same venue, there is no automatic linking — each visit is independent. This is an accepted limitation; the edge case of seeing the same non-curated show at the same venue multiple times is rare and not worth a special data structure.

---

## Relationship Diagram

```
shows ──────────────────────────────────────── userShows (tier, ranking)
  │                                                │
  ├── productions (curated runs)                   │
  │       │                                        │
  └── visits ──────────────────────────────────────┘
        │   └── productionId (optional FK → productions)
        │   └── theatre / city / district (fallback, used when no productionId)
        └── userId (FK → users)
```
