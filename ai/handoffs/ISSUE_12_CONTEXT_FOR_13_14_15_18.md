¨# Issue #12 Handoff Context (for #13, #14, #15, #18)

## Objective
- Capture the outcomes of Issue #12 implementation and summarize the decisions that directly affect upcoming work, especially issues `#13`, `#14`, `#15`, and `#18`.
- Provide continuity context so the next agent can implement follow-up issues without re-discovering design intent.

## Current state
- Complete:
  - Bottom center tab now behaves as an **Actions** trigger instead of navigating directly.
  - New tab order is: `My Shows`, `Community`, `Actions`, `Browse`, `Profile`.
  - Actions menu opens as a floating panel above the tab bar and supports outside-tap dismiss.
  - New visit-first modal route and UI at `app/add-visit.tsx`.
  - Add Visit supports: show search, custom show entry, default date, production selection, "Other" location fallback, ranking placeholder, keep-current-ranking toggle.
  - Backend now supports visit-first creation and show/ranking detection via `convex/visits.ts`.
  - Visit schema now includes fallback location fields in `convex/schema.ts`: `city`, `theatre`, `district` (optional).
  - Legacy in-list `+ Add Show` flow was removed from `app/(tabs)/index.tsx`.
- In progress:
  - None in this branch for Issue #12.
- Blocked:
  - None.

## Key context

### Product decisions made in this convo
- "Add" center tab should open an options menu, not navigate to a full screen.
- For now, only one menu action is active: `Add Visit`.
- Add Visit is **visit-first**:
  - User can save with minimal data once a show is selected (or entered as custom).
  - Adding a new show through this flow always creates a visit.
- Ranking flow is intentionally placeholder-only for now:
  - If show is new to rankings, append to bottom.
  - If already ranked, user can keep current ranking.
  - Actual comparison/reranking logic is deferred.
- Movie/pro-shot handling is intentionally not modeled as a dedicated field yet (captured via "Other" location text and/or notes for now).

### Files most relevant to follow-up issues
- Navigation/actions entrypoint:
  - `app/(tabs)/_layout.tsx`
  - `components/actions-menu.tsx`
  - `app/(tabs)/actions.tsx`
  - `app/(tabs)/community.tsx`
- Add Visit UI flow:
  - `app/add-visit.tsx`
- Backend + schema:
  - `convex/visits.ts`
  - `convex/schema.ts`
  - `convex/shows.ts` (small nullability guard fix done during this work)
- Supporting UI:
  - `components/show-row-accordion.tsx`
  - `app/(tabs)/index.tsx`
- Design/source-of-truth notes:
  - `ai/handoffs/DATA_MODEL.md`

### Backend behavior implemented (important)
- `convex/visits.ts`:
  - `getAddVisitContext`: returns whether selected show already has ranking and/or visits.
  - `createVisit`: accepts either `showId` or `customShowName`; creates custom show when needed; appends new show to ranking; creates visit in all cases.
- `convex/schema.ts` updates:
  - `visits` now supports optional `city`, `theatre`, `district` fallback location fields.

### Naming/terminology conventions agreed
- Use **Actions** for center-tab menu naming (`ActionsMenu`, `actions` tab route, `showActionsMenu` state).
- Keep domain naming as **AddVisit** for visit flow (do not rename AddVisit concepts to Action).

## Issue-specific relevance

### Issue #15 (high relevance)
- Already explicitly referenced in code comments and logic.
- Current placeholder behavior in `createVisit` intentionally does no re-ranking when already ranked (`keepCurrentRanking` path).
- Expected follow-up for `#15`:
  - Replace ranking placeholder UI in `app/add-visit.tsx` with real ranking/comparison flow.
  - Extend backend mutation flow if needed (e.g., positioned insertion / comparisons).
  - Preserve current keep-current shortcut as an explicit bypass.

### Issue #18 (high relevance)
- Current behavior: new shows are appended to bottom of ranked list (not unranked).
- Data model now supports barebones visits with minimal metadata, so unranked UX can be layered without blocking visit creation.
- Expected follow-up for `#18`:
  - Introduce unranked state/section in UI and ranking logic.
  - Decide migration behavior for shows already auto-appended to bottom from current flow.

### Issue #13 (medium relevance, depends on exact scope)
- If `#13` touches Add Visit UX polish/step structure, it should build on `app/add-visit.tsx`.
- Current UX includes:
  - Auto-focused show search input (keyboard opens immediately).
  - Production chips + "Other" fallback.
  - Placeholder ranking section with keep-current behavior.

### Issue #14 (medium relevance, depends on exact scope)
- If `#14` touches data consistency or visit metadata, it should build on the new visit-first mutation and schema extensions.
- Ensure new functionality keeps the core invariant from this convo:
  - Add Visit always results in at least one visit row.

### Issues #11 and #16 (lower relevance)
- No direct implementation for these in this convo.
- Potential indirect touchpoints:
  - Navigation shell changed (`actions` + `community` tabs).
  - `app/(tabs)/index.tsx` no longer owns the Add Show entrypoint.

## PR + commits from this work
- PR: `https://github.com/bbeaudet-dev/theatre-diary/pull/24`
- Commits:
  - `6c21156` Restructure bottom navigation around an actions center tab.
  - `6eae4dc` Add a dedicated Add Visit modal route and form flow.
  - `dd1b900` Support visit-first creation with richer visit metadata.
  - `c303f9c` Remove legacy in-list add show entrypoint and polish supporting behavior.

## Next actions
- For `#15`:
  - Replace ranking placeholder UI and implement ranking comparison logic.
  - Keep `keepCurrentRanking` as a first-class branch.
- For `#18`:
  - Define unranked storage/representation strategy before UI.
  - Decide whether `createVisit` should insert into ranked or unranked path by default.
- For `#13/#14`:
  - Confirm exact scope; implement on top of `app/add-visit.tsx` + `convex/visits.ts`.
  - Avoid reintroducing add-show-only flows detached from visit creation.

## Validation
- Passing checks in this branch:
  - `bun run lint`
  - `bunx tsc --noEmit`
- Manual behavior verified during implementation:
  - Actions menu opens from center tab and can be dismissed by outside tap.
  - Add Visit opens with search input focused.
  - Minimal visit save path works after selecting/creating a show.

## Known gaps / risks
- Ranking is intentionally placeholder; ordering strategy will change in `#15` and/or `#18`.
- Movie/pro-shot is not yet a dedicated schema field (captured as text for now).
- `district` exists on visits schema now, but Add Visit UI currently does not expose district selection yet.
