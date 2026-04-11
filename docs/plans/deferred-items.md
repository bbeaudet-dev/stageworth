# Deferred Items

Things mentioned across the brand-phase-2 conversation that have been intentionally deferred. Each should become its own GitHub issue.

Items marked ✅ have been implemented.

---

## Notifications

### New notification types
- **Trip permission changed**: When an organizer changes a member's role (Editor → Viewer or back), notify the affected member. The confirmation alert is in place; the push notification call is not.
- **Trip invite revoked**: Notify a user when their pending trip invite is withdrawn.
- Relates to the existing `convex/notifications.ts` infrastructure.

---

## Community Feed

### New post types (GitHub issues #97 and #98)
- **Theatre challenge milestone posts**: Auto-generate a feed post when a user hits 25 %, 50 %, 75 %, or 100 % of their annual challenge goal.
- **Challenge start post**: Post when a user begins a new challenge.
- **Visit post with challenge progress**: Attach current challenge progress to a visit post (e.g. "Ben saw Hamilton — 8/20 for 2026 🎭").
- **Featured posts**: #98 tracks a curated/promoted post type.
- Requires schema changes (`postType` union) and new backend actions.

---

## Visual Badge Systems

### Tier badges (show quality labels) ✅
Brand blue/purple gradient scale applied in both `MyShowsScreen.tsx` (section header pills) and `RankingSection.tsx` (Add Visit ranking buttons). Loved It = full BRAND_BLUE, fades toward muted lavender/neutral for lower tiers. No red/green/yellow — single hue family only.

### Show status badges
Labels like **Now Playing / Closing Soon / Upcoming / Open Run / Closed** appear in multiple places.

**Option A (semantic):** Each status gets a distinct semantic colour (green = open, amber = closing soon, blue = upcoming, grey = closed). Familiar but visually busy if combined with tier colours.

**Option B (brand gradient opacity):** All status badges use the brand blue at varying saturations/opacities (closing soon = vibrant, now playing = medium, upcoming = cool blue, closed = grey). Cohesive but less immediately legible.

**Recommendation:** Separate the design work for status and tier badges to avoid colour overload. Design review recommended before implementing.

### Upcoming trip countdown badges ✅
Already implemented in `TripCard.tsx` via `getTripCountdown()`. Shows "Tomorrow", "In X days", "Ends in X days", "Ends today", etc. Badge colour updates based on phase (active = white-on-gradient, upcoming = blue tint, past = neutral).

### Trip Party member role badges ✅
Simplified in `TripPartyTab.tsx`: colour now signals STATUS only; text alone signals ROLE.
- Organizer: accent-tinted (unchanged — still special)
- Accepted members: transparent/neutral pill, `primaryTextColor` for Editor, `mutedTextColor` for Viewer
- Pending (Invited): soft amber tint
- Declined: soft danger tint

---

## Navigation Architecture Refactor

See `docs/plans/navigation-refactor.md` for the full plan. Estimated 2–3 hours; recommended as a dedicated `refactor/navigation-consolidation` branch.

---

## Friends / Following Logic

### Leaderboard "Friends" filter + Add to Party friends list
Currently both use users the active user follows (`listMyFollowing`). A mutual-follow ("friends") definition would be safer and more intuitive. Likely the right long-term default.

---

## Add Visit modal (future polish)

### Popularity signal for suggestions ✅ (basic version done)
Current: Want-to-See shows first, then unvisited shows with poster art. Future: backend popularity signal (visit count across all users, or currently-running production status) to surface genuinely trending shows.
