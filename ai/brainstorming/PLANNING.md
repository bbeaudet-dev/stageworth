# Stageworth — Project Planning

## Vision & Tagline

**"The all-in-one app for theatre nerds."**

Buy/sell tickets, browse shows and create lists, plan trips, track shows in your journal, write reviews, and share with friends.

**Core philosophy:** Art, beauty, and expression. Make theatre histories artistic — not just a list, but a visual, interactive, joyful experience. Think: Beli but for theatre. Spotify Wrapped but for theatre.

---

## Phases

### Phase 1: Diary & Ranked List

The foundation. Users log shows they've seen and maintain a ranked list.

**Key features:**
- Ranked list of shows (not a 5-star scale — see Ranking Algorithm below)
- Theatre/Playbill Cloud: a visual, artistic way to view and navigate your show history
  - Filter by district, form (musical, play, opera, dance), etc.
  - Shows sized by rank, playbill-style images
  - Interactive — clicking a show opens its details
- Manual data entry (user's own shows, playbills, theatres)
- No external database needed yet

**Data needed:** Shows, basic user info, rankings, images/playbills.

### Phase 2: Visits

Delineate individual visits from shows. A show is "Hamilton"; a visit is "Hamilton on March 15 at the Richard Rodgers Theatre."

**Key features:**
- Multiple visits per show (different dates, productions, locations)
- Per-visit data: date, theatre, seat, matinee/evening, preview, final performance, cast, notes, rating
- Productions as a concept (a specific run of a show at a specific venue)
- Overall ranking remains show-based, but visit details are separate

**Data needed:** Productions, visits with detailed metadata.

### Phase 3: Diary Experience

Evolve the list and cloud into a full diary/journal experience.

**Key features:**
- Chronological timeline of visits (à la Mezzanine)
- Playbill cloud as a primary navigation mode for the diary
- Diary entries with notes, reviews, photos
- Statistics and insights:
  - Genre breakdowns (jukebox vs. play vs. opera)
  - Ranking changes over time
  - Favourite theatres, districts
  - Seat map of everywhere you've sat
  - Geographic map of theatre visits
  - "Spotify Wrapped" for theatre — annual/seasonal stats
- Social sharing of cloud, stats, reviews

### Phase 4: Trip Planner & Lists

Requires an external show database.

**Key features:**
- **Dynamic lists** (mutually exclusive, with conditional logic):
  - **Want to See** — shows you plan to see
  - **Look Into** — a running/consideration list
  - **Not Interested** — analogous to "skipped"
  - **Uncategorized** — new shows land here by default
  - **Seen** — populated from diary entries
- **List logic:** When a show moves from "Want to See" to "Seen" (via diary entry), prompt user: "Remove from Want to See?" (with optional auto-setting). Uncategorized → any list removes from Uncategorized. Inspired by Apple Music's smart playlists (Recently Added, Most Played).
- **Custom lists** — no automatic logic, fully manual
- **Trip lists** — auto-created when adding shows to a trip, or manual
- **Trip planning:**
  - Trips with date ranges
  - Trip days with events (show, meal, flight, transport, custom)
  - Start time, duration, name per event
- **Show browsing/search interface** — browse the full database, filter, search
- **Show detail page** — productions, dates, reviews, tickets, your visits, add to lists/trips

**Big question:** Where does show data come from? Options:
- Build a custom database (scraping, AI extraction — attempted in theatre-app)
- Use an existing API/database (if one exists)
- Community-contributed data
- Hybrid approach

### Phase 5: Stretch Goals

- **Ticket sales/purchases** — like TodayTix or Theatr
- **Seat maps** — view theatre seat maps from the app
- **Music integration** — link to show soundtracks on Spotify/Apple Music (Showtuner tie-in?)
- **Social/feed** — Instagram-like feed, wall of photos, followers, posts
- **Infinite scroll canvas** — à la Pablo's museum scroll, for browsing shows
- **AI recommendations** — "Would I enjoy this show?" based on preferences and rankings

---

## Ranking Algorithm

Inspired by Beli (the restaurant ranking app).

**How it works:**
1. User sees a show and gives an initial reaction: **Liked it**, **Neutral**, or **Disliked it**
2. Based on the reaction, the app runs a **halving/binary search algorithm** against existing rankings in that tier to converge on the right position
   - e.g., "Did you like it more than Show X?" → narrow down
3. Numeric ratings (1-10, 5-star, etc.) are **derived** from position + distribution, not manually assigned
4. Distribution is presumably even across the liked/neutral/disliked tiers

**Import flow:**
- "Import list" for users who already have rankings
- Can import existing list and then prompt for missing info over time
  - Sporadic prompts: "What did you think of Chicago?"

**Open questions:**
- Exact algorithm for binary insertion within tiers?
- How does the derived numeric score work? Even distribution within tiers?
- How does re-ranking work? Can you manually adjust position after initial placement?

---

## Data Model (Draft)

### Shows
Core show entity. Represents a show title (e.g., "Hamilton").

| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| name | string | Show title |
| type | enum | musical, play, opera, dance |
| subtype | enum? | jukebox, sung-through, book musical, revival, etc. |
| images | string[] | Playbill images (fetch latest/popular from productions) |

### Productions
A specific run of a show at a specific venue.

| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| showId | ref → Shows | |
| location/theatre | string | |
| district | enum? | Broadway, Off-Broadway, West End, Touring, etc. |
| startDate | string/date | |
| endDate | string/date? | null for open runs |
| isOpenRun | boolean | |
| inPreviews | boolean | |
| playbillImage | string? | Production-specific playbill |

### Users
| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| name | string | |
| username | string | Unique |

### User Visits
Individual visit to a show/production.

| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| userId | ref → Users | |
| showId | ref → Shows | |
| productionId | ref → Productions? | Optional if production not tracked |
| date | string/date | |
| rating | enum? | liked, neutral, disliked (initial reaction) |
| notes | string? | |
| seat | string? | |
| isMatinee | boolean? | |
| isPreview | boolean? | |
| isFinalPerformance | boolean? | |
| cast | string[]? | Notable cast |
| theatre | string? | If not part of production |
| district | string? | If not part of production |

### User Show Rankings
Derived from visits and the ranking algorithm.

| Field | Type | Notes |
|-------|------|-------|
| userId | ref → Users | |
| showId | ref → Shows | |
| rank | number | Position in overall ranking |
| tier | enum | liked, neutral, disliked |
| derivedScore | number? | Calculated from position |

### User Lists
| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| userId | ref → Users | |
| name | string | List name |
| type | enum | system (want_to_see, look_into, not_interested, uncategorized, seen) or custom |
| showIds | ref[] → Shows | Ordered list of shows |

### Trips
| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| userId | ref → Users | |
| name | string | |
| startDate | date | |
| endDate | date | |

### Trip Days
| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| tripId | ref → Trips | |
| date | date | |

### Trip Events
| Field | Type | Notes |
|-------|------|-------|
| id | string | Auto-generated |
| tripDayId | ref → Trip Days | |
| type | enum | flight, show, meal, transport, custom |
| name | string | |
| startTime | string? | |
| duration | number? | Minutes |
| showId | ref → Shows? | If type is show |

---

## Comparisons & Inspiration

| App | What to borrow |
|-----|---------------|
| **Beli** | Ranking algorithm (liked/neutral/disliked → binary search → derived scores) |
| **Mezzanine** | Diary timeline, chronological map of visits, visual history |
| **Spotify Wrapped** | Annual stats, genre breakdowns, fun data visualizations |
| **Apple Music** | Smart/dynamic playlists that update based on conditions |
| **TodayTix / Theatr** | Ticket purchasing, show browsing |
| **Instagram** | Social feed, photo wall, followers |
| **Personal portfolio** | Theatre Cloud (playbill grid sized by rank, filters, animations) |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Mobile framework** | Expo / React Native | Cross-platform (iOS-first, Android later) |
| **Language** | TypeScript | |
| **Backend / DB** | Convex | Real-time, serverless, already has project setup |
| **Auth** | Convex Auth or Clerk | TBD — need proper auth this time |
| **Navigation** | Expo Router | File-based routing |
| **Styling** | NativeWind (Tailwind for RN) or Tamagui or StyleSheet | TBD |
| **State management** | Convex reactive queries + React state | |
| **Image storage** | Convex file storage | For playbills, photos |
| **Animations** | React Native Reanimated | For theatre cloud, transitions |
| **Gestures** | React Native Gesture Handler | For drag-and-drop ranking |
| **Additional TBD** | | Charts/stats library, calendar, etc. |

---

## Open Questions

1. **Ranking algorithm details** — How exactly does Beli's binary insertion + derived scoring work?
2. **Show database** — When we reach Phase 4, where does comprehensive show data come from?
3. **Auth strategy** — Convex Auth, Clerk, or something else?
4. **Styling approach** — NativeWind vs. Tamagui vs. plain StyleSheet?
5. **Theatre Cloud on mobile** — How to adapt the 800×800 canvas cloud for mobile screens? Canvas/Skia? Reanimated?
6. **Social features** — How deep do we go? Sharing clouds? Following friends? Feed?
7. **Data migration** — Import existing data from shows-ben.ts and personal portfolio?
8. **Offline support** — Should diary entries work offline and sync later?
9. **Music integration** — Spotify/Apple Music API or just deep links?
10. **Seat maps** — Where does seat map data come from?

---

## Existing Data to Migrate

From `personal-portfolio/app/for-fun/theatre/data/shows-ben.ts`:
- 70 ranked shows with: id, slug, name, rank, form, visits[], images[]
- Visit data includes: date, theatre, district, notes
- Districts: Broadway, Off-Broadway, West End, Playhouse Square, Local, Touring
- Forms: musical, play, opera, dance, other
- Also: shows-sophia.ts, shows-rose.ts, shows-eric.ts (friends' data)

---

## What to Carry Forward from Previous Projects

### From personal-portfolio:
- Theatre Cloud layout algorithm (spiral placement, rank-based sizing)
- Theatre Cloud animations (wave patterns, cross-fade)
- Show data structure and existing data
- District and form filtering

### From theatre-app:
- Convex schema patterns (shows, userShows, visits, trips, tripDays, slots)
- Trip planner flow (trips → days → events)
- List management (system lists + custom lists)
- Show browsing/search patterns
- AI recommendation prompt structure (for later phases)

### What to do differently:
- Mobile-first (Expo/React Native instead of Next.js)
- Proper auth from the start
- Take time with schema design before coding
- Phase the development — don't try to build everything at once
- Better separation of shows vs. productions vs. visits
- Ranking algorithm (Beli-style) instead of manual ordering
