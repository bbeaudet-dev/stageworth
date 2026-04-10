# Phase 2: In-app import of show rankings and visits

This document captures the product and technical plan for letting **any user** import a pasted list of shows (and optionally visit-like details) into their profile. It is the follow-on to **Phase 1**, which is already implemented.

---

## Phase 1 (done): developer seed

**Purpose:** Seed a specific Convex user from highly structured data (`data/shows-ben.ts`, `data/shows-sophia.ts`).

**Implementation:**

- **`convex/admin/seedUserData.ts`** — `seedUserRankingsAndVisits` (`internalMutation`): writes `userRankings`, `userShows`, and `visits`; exact normalized-name match on shows, then fuzzy match via `internal.admin.seed.suggestShowMatchesForNames`; optional venue/production enrichment for visits; `dryRun` and `skipIfExists`.
- **`scripts/seedUserShows.ts`** — CLI: `npx tsx scripts/seedUserShows.ts --userId … --dataset ben|sophia [--prod] [--dry-run] [--no-skip-if-exists]`; district mapping from site strings to Convex literals; uses `spawnSync` so JSON is not shell-quoted.
- **`convex/admin/seed.ts`** — `similarityForShowMatch` uses raw Jaccard above the noise floor (no `* 0.97` dampening) so same words in different order still score high enough.

Phase 1 does **not** parse unstructured text; the TypeScript data files are the source of truth.

---

## Phase 2 (future): in-app import

**Goal:** A user pastes arbitrary text (numbered list, spreadsheet paste, prose, etc.) and the app helps them populate rankings and optionally visits without manual one-by-one entry.

**Non-goal for v1 of Phase 2:** Automatically linking visits to specific **`productions`** rows from messy text. That is error-prone; users can attach productions when editing a visit in the existing flow.

---

## Core insight: two separate problems

| Problem | Input | Output | Approach |
|--------|--------|--------|----------|
| **A — Show identity** | Messy show titles | `shows` row (`Id<"shows">`) | LLM (or heuristics) to extract names + **existing** `suggestShowMatchesForNames` fuzzy catalog match + user review for low confidence |
| **B — Visit / production** | Theatre, date, city, vague phrases | `productions` + `venueId` | **Defer** in import v1; optional placeholder visits or date/theatre text only |

Conflating A and B in one automatic step creates wrong production links. Phase 2 should nail **A** and treat **B** as optional enrichment or post-import editing.

---

## Proposed UX flow

1. **Entry:** Import affordance on **My Shows** (e.g. header on `MyShowsScreen` / `MyShowsHeader`) → sheet or dedicated stepper.
2. **Paste:** Large text area. **Checkbox (default off):** “Create a visit for each imported show.” When off, only rankings + tiers; when on, one visit per matched show (use extracted date/theatre if present; otherwise minimal placeholder the user can edit later).
3. **Parse:** Convex **action** (e.g. `rankings:parseImportText` or `import:parseRankingPaste`) calls an LLM with a strict JSON schema: array of `{ name, rank?, date?, theatre?, notes? }`. Instruct the model **not** to invent data that is not in the paste.
4. **Match:** For each extracted `name`, run fuzzy matching (reuse **`suggestShowMatchesForNames`** or extract shared scoring into a helper callable from mutations/actions). Bucket results:
   - **High confidence** (e.g. ≥ 0.9): pre-select for import.
   - **Medium:** show alternatives; user picks or searches catalog.
   - **Low / none:** manual catalog search or skip row.
5. **Review:** Screen listing rows with confidence and chosen `showId`; user can fix mistakes before commit.
6. **Commit:** Authenticated path that validates the current user and calls the same write logic as Phase 1 (today only `internalMutation` — Phase 2 needs a **`mutation`** or **action → internalMutation** that passes `ctx.auth` user id and does not allow impersonation).

**Production matching in import:** Explicitly **out of scope** for v1; document in UI copy that users can link a production when editing a visit.

---

## Backend shape (sketch)

- **Public `action` `parseImportPaste`:** `rawText: string` → structured rows (LLM). Requires API key in Convex env (e.g. OpenAI).
- **Public `query` or internal helper:** batch fuzzy suggestions (may wrap `suggestShowMatchesForNames`).
- **Public `mutation` `applyRankingImport`:** args similar to `seedUserRankingsAndVisits` but scoped to `ctx.auth` user; optionally delegates to shared logic with `internal.admin.seedUserData` refactored to accept a generic “apply payload” used by both CLI/internal seed and user import.

**Security:** Never expose `seedUserRankingsAndVisits` as a public mutation without auth; the internal mutation is for admin/CLI only.

---

## Why we do not need to “redesign” Phase 1 for Phase 2

Unstructured input is an **extraction + review** layer in front of the same structured write model (ordered show ids, tiers, visits with optional `venueId`/`productionId`). The fuzzy matcher already handles “Sound of Music” vs “The Sound of Music”, abbreviations, and word-reorder titles (within scoring limits).

Remaining work is **product** (UX, copy, edge cases) and **operations** (LLM cost, latency, failure modes), not a new database schema for the happy path.

---

## Open decisions

- LLM provider and model; prompt versioning; max paste size.
- Exact confidence thresholds and whether auto-accept high tier is allowed without review.
- Whether to support CSV / file upload in addition to paste.
- Tier derivation for import (user picks mapping, or defaults like Phase 1 breakpoints).
- Analytics: import success rate, manual correction rate.

---

## Related code (Phase 1)

| Piece | Location |
|-------|----------|
| Seed mutation | `convex/admin/seedUserData.ts` |
| CLI | `scripts/seedUserShows.ts` |
| Fuzzy suggestions | `convex/admin/seed.ts` — `suggestShowMatchesForNames`, `similarityForShowMatch` |
| My Shows UI | `src/features/my-shows/` — e.g. `MyShowsScreen.tsx`, `MyShowsHeader` |

---

## References (conversation summary)

- Visits are the tedious part; importing **rankings alone** still delivers value.
- Optional “one placeholder visit per show” avoids blank-visit annoyance when the checkbox is off by default.
- Phase 2 checklist UX mirrors the plan: show matching first; production linking later in visit edit.
