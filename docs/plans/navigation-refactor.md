# Navigation Architecture Refactor

## Background

During the `feature/brand-phase-2` work we moved `invite-friend` to a root-level route and discovered that the codebase has a mixed navigation structure: some shared screens are already root-level, many others are duplicated across every tab that needs to link to them.

## How Expo Router stacks work (the key insight)

When you call `router.push("/show/123")` from **any** tab, Expo Router pushes that screen onto **the current tab's own navigation stack**. The back button therefore always returns to wherever you came from — even across multiple levels:

```
Search tab
  └─ /show/123          (pushed via root-level route)
       └─ /user/alice   (pushed via root-level route)
            └─ /show/456 (pushed again)
```

Pressing back three times correctly unwinds through `/user/alice` → `/show/123` → Search tab root. This works entirely because the root-level routes push onto the caller's stack.

**To answer the core question: yes, every screen that can be navigated to from more than one place should be defined at the root level.** Tab-specific copies are only needed for the *index* screen that is the natural "home" of a tab (e.g. `(tabs)/community/index.tsx`).

## Current state

### Already root-level (correct)
- `show/[showId].tsx` — Show Details
- `user/[username].tsx` / `user/[username]/[kind].tsx` — User Profiles
- `list/[listId].tsx` — List Detail
- `visit/[visitId].tsx` — Visit Detail
- `edit-visit/[visitId].tsx`, `add-visit.tsx` — Add/Edit Visit (modals)
- `edit-profile.tsx`, `preferences.tsx`, `notifications.tsx`, etc. — Settings screens
- `invite-friend.tsx` — Invite a Friend (added in brand-phase-2)

### Duplicated across tabs (should become root-level only)

| Route | Duplicates in |
|-------|---------------|
| `user/[username].tsx` | community, profile, my-shows, plan, search (+ root) |
| `user/[username]/[kind].tsx` | same 5 tabs + root |
| `show/[showId].tsx` | search, browse, my-shows (+ root) |
| `leaderboard.tsx` | search, community — **never at root** |

### No clear home tab (should be root-level)
- `leaderboard.tsx` — conceptually "Community" but legitimately navigable from Search, Plan, Profile

## What the refactor would entail

### Step 1 — Audit navigation call sites
Find every `router.push`, `router.navigate`, `router.replace`, and `<Link>` that uses a tab-prefixed path for a shared screen, e.g. `"/(tabs)/community/user/..."`. These need to be changed to the root-level path `"/user/..."`.

### Step 2 — Promote leaderboard to root
1. Create `src/app/leaderboard.tsx` → `export { default } from "…/LeaderboardScreen"`
2. Register `<Stack.Screen name="leaderboard" options={{ headerShown: false }} />` in `app/_layout.tsx`
3. Update every `router.push("/(tabs)/community/leaderboard")` and `router.push("/(tabs)/search/leaderboard")` to `router.push("/leaderboard")`
4. Delete `src/app/(tabs)/community/leaderboard.tsx` and `src/app/(tabs)/search/leaderboard.tsx`

### Step 3 — Remove duplicate user/show tab copies
1. Verify all call sites use root-level paths (`"/user/[username]"`, `"/show/[showId]"`)
2. Delete the 5 tab-specific copies of `user/[username].tsx` and `user/[username]/[kind].tsx`
3. Delete the 3 tab-specific copies of `show/[showId].tsx` (keeping `browse/show/[showId]` only if Browse has a special layout requirement)

### Step 4 — Validate
Run `npx tsc --noEmit` and test the common navigation paths:
- Community → Leaderboard → User Profile → Show → back × 3
- Search → Leaderboard → back
- Plan tab invite → User Profile → back
- Profile Settings Drawer → Invite a Friend → back

## Estimated effort

~2–3 hours of careful find-and-replace + manual testing. Low risk since root-level routes already exist; the change is purely removing duplicates and updating call sites. Recommend a dedicated `refactor/navigation-consolidation` branch.

## Why not do this now

The current `feature/brand-phase-2` branch is focused on UI/UX changes. Mixing a structural navigation refactor would make the diff harder to review and increase risk of regressions. Create a separate GitHub issue to track this.
