import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getConvexUserId } from "./auth";
import { isCatalogPublished } from "./catalogVisibility";
import { getProductionStatus } from "../src/utils/productions";
import {
  resolveProductionPosterUrl,
  resolveShowImageUrls,
} from "./helpers";

// ─── Constants ────────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

/** Prompt-time cap on any description. Candidate lists are long, so tighter than the single-show recommender. */
const DESCRIPTION_PROMPT_MAX_CHARS = 240;

/** Cap on the candidate pool handed to the model. 25 is enough signal without blowing the context budget. */
const MAX_CANDIDATES = 25;

/** How many loved/disliked descriptions to attach as taste context. */
const LOVED_DESCRIPTIONS_LIMIT = 5;
const DISLIKED_DESCRIPTIONS_LIMIT = 5;

/** A production counts as "closing soon" (and gets a ranking bonus) when within this window of the anchor date. */
const CLOSING_SOON_DAYS = 30;

type ShowType =
  | "musical"
  | "play"
  | "opera"
  | "dance"
  | "revue"
  | "comedy"
  | "magic"
  | "other";

type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const DAY_LABELS: Record<DayKey, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function dayKeyForIso(iso: string): DayKey {
  const d = new Date(`${iso}T00:00:00`);
  return DAY_KEYS[d.getDay()];
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function truncateForPrompt(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length <= DESCRIPTION_PROMPT_MAX_CHARS) return trimmed;
  const slice = trimmed.slice(0, DESCRIPTION_PROMPT_MAX_CHARS);
  const spaceIdx = slice.lastIndexOf(" ");
  if (spaceIdx >= DESCRIPTION_PROMPT_MAX_CHARS - 40) {
    return `${slice.slice(0, spaceIdx).trim()}\u2026`;
  }
  return `${slice.trim()}\u2026`;
}

function formatAnchorDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Types shared across the internal query and action ───────────────────────

export type FindShowUrgency = "closing_soon" | "open_run" | "standard";

export type FindShowPick = {
  showId: Id<"shows">;
  showName: string;
  showType: string;
  posterUrl: string | null;
  closingDate: string | null;
  isOpenRun: boolean;
  urgency: FindShowUrgency;
  headline: string;
  reasoning: string;
};

export type FindShowResult =
  | {
      kind: "ok";
      anchorDate: string;
      hasTargetDate: boolean;
      primary: FindShowPick;
      alternates: FindShowPick[];
    }
  | {
      kind: "insufficient_context";
      anchorDate: string;
      hasTargetDate: boolean;
      reason: string;
    };

type CandidateCard = {
  showId: Id<"shows">;
  productionId: Id<"productions">;
  name: string;
  type: string;
  description: string | null;
  closingDate: string | null;
  isOpenRun: boolean;
  showScoreRating: number | null;
  /** null when targetDate was not provided, or when weeklySchedule is missing. */
  hasScheduleOnTargetDate: boolean | null;
  posterUrl: string | null;
};

// ─── Internal query: gather taste context + candidate pool ───────────────────

/**
 * Bundle everything the find-a-show action needs in a single query:
 *   - the user's taste context (prefs, ranked tier names, loved/disliked descriptions)
 *   - a deduped, ranked pool of candidate productions running on {anchorDate}
 *
 * Exclusions applied to the pool:
 *   - Shows the user has ranked in any tier (loved/liked/okay/disliked/unranked)
 *   - Shows on the user's "Not Interested" system list
 *
 * When {targetDate} is passed AND the production has weeklySchedule data, we
 * require at least one showtime on the weekday that date falls on. When schedule
 * data is missing we keep the candidate and flag it so the UI can hint "schedule
 * not confirmed".
 */
export const gatherFindShowContext = internalQuery({
  args: { targetDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const anchorDate = args.targetDate ?? todayIso();
    const userId = await getConvexUserId(ctx);

    // ── Taste context ──────────────────────────────────────────────────────
    let preferences: { element: string; rating: number }[] = [];
    const ranked = {
      loved: [] as string[],
      liked: [] as string[],
      okay: [] as string[],
      disliked: [] as string[],
    };
    let lovedWithDescriptions: { name: string; description: string }[] = [];
    let dislikedWithDescriptions: { name: string; description: string }[] = [];
    const excludedShowIds = new Set<string>();

    if (userId) {
      const prefs = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (prefs) preferences = prefs.elementRatings;

      const userShows = await ctx.db
        .query("userShows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const lovedIds: Id<"shows">[] = [];
      const likedIds: Id<"shows">[] = [];
      const okayIds: Id<"shows">[] = [];
      const dislikedIds: Id<"shows">[] = [];

      for (const row of userShows) {
        // Any relationship at all (even "unranked") excludes the show from
        // fresh suggestions — they've already considered it.
        excludedShowIds.add(String(row.showId));
        switch (row.tier) {
          case "loved":
            lovedIds.push(row.showId);
            break;
          case "liked":
            likedIds.push(row.showId);
            break;
          case "okay":
            okayIds.push(row.showId);
            break;
          case "disliked":
            dislikedIds.push(row.showId);
            break;
        }
      }

      const notInterested = await ctx.db
        .query("userLists")
        .withIndex("by_user_systemKey", (q) =>
          q.eq("userId", userId).eq("systemKey", "not_interested")
        )
        .first();
      if (notInterested) {
        for (const id of notInterested.showIds) {
          excludedShowIds.add(String(id));
        }
      }

      const namesFor = async (ids: Id<"shows">[]): Promise<string[]> => {
        const out: string[] = [];
        for (const id of ids) {
          const show = await ctx.db.get(id);
          if (show && show.name) out.push(show.name);
        }
        return out;
      };
      const descriptionsFor = async (
        ids: Id<"shows">[],
        limit: number
      ): Promise<{ name: string; description: string }[]> => {
        const out: { name: string; description: string }[] = [];
        for (const id of ids) {
          if (out.length >= limit) break;
          const show = await ctx.db.get(id);
          if (!show) continue;
          if (show.description && show.description.trim().length > 0) {
            out.push({ name: show.name, description: show.description });
          }
        }
        return out;
      };

      ranked.loved = await namesFor(lovedIds);
      ranked.liked = await namesFor(likedIds);
      ranked.okay = await namesFor(okayIds);
      ranked.disliked = await namesFor(dislikedIds);
      lovedWithDescriptions = await descriptionsFor(
        lovedIds,
        LOVED_DESCRIPTIONS_LIMIT
      );
      dislikedWithDescriptions = await descriptionsFor(
        dislikedIds,
        DISLIKED_DESCRIPTIONS_LIMIT
      );
    }

    // ── Candidate productions ──────────────────────────────────────────────
    const productions = await ctx.db.query("productions").collect();
    const targetDayKey = args.targetDate
      ? dayKeyForIso(args.targetDate)
      : null;

    const seenShowIds = new Set<string>();
    const candidates: CandidateCard[] = [];

    for (const prod of productions) {
      if (!isCatalogPublished(prod.dataStatus)) continue;
      const status = getProductionStatus(prod, anchorDate);
      if (status !== "open" && status !== "open_run" && status !== "in_previews") {
        continue;
      }

      const showIdStr = String(prod.showId);
      if (excludedShowIds.has(showIdStr)) continue;
      if (seenShowIds.has(showIdStr)) continue;

      const show = await ctx.db.get(prod.showId);
      if (!show || !isCatalogPublished(show.dataStatus)) continue;

      // Schedule gating for date-scoped queries
      let hasScheduleOnTargetDate: boolean | null = null;
      if (targetDayKey) {
        if (prod.weeklySchedule) {
          const list = prod.weeklySchedule[targetDayKey] ?? [];
          hasScheduleOnTargetDate = Array.isArray(list) && list.length > 0;
          // Strict rule when we DO have schedule data: drop the candidate if
          // the theatre is dark that day. When schedule data is missing we
          // keep the candidate with an "unknown" flag so the model and UI can
          // mention that showtimes aren't confirmed.
          if (!hasScheduleOnTargetDate) continue;
        }
      }

      const productionPoster = await resolveProductionPosterUrl(ctx, prod);
      const posterUrl =
        productionPoster ?? (await resolveShowImageUrls(ctx, show))[0] ?? null;

      const description =
        show.description && show.description.trim().length > 0
          ? show.description
          : null;

      seenShowIds.add(showIdStr);
      candidates.push({
        showId: prod.showId,
        productionId: prod._id,
        name: show.name,
        type: show.type,
        description,
        closingDate: prod.closingDate ?? null,
        isOpenRun: prod.isOpenRun === true,
        showScoreRating: show.showScoreRating ?? null,
        hasScheduleOnTargetDate,
        posterUrl,
      });
    }

    // Ranking: closing-soon first (date-anchored urgency), then ShowScore desc, then name.
    candidates.sort((a, b) => {
      const aClosing =
        a.closingDate && daysBetween(anchorDate, a.closingDate) <= CLOSING_SOON_DAYS;
      const bClosing =
        b.closingDate && daysBetween(anchorDate, b.closingDate) <= CLOSING_SOON_DAYS;
      if (aClosing !== bClosing) return aClosing ? -1 : 1;
      const aScore = a.showScoreRating ?? 0;
      const bScore = b.showScoreRating ?? 0;
      if (aScore !== bScore) return bScore - aScore;
      return a.name.localeCompare(b.name);
    });

    return {
      anchorDate,
      hasTargetDate: args.targetDate !== undefined,
      userId,
      preferences,
      ranked,
      lovedWithDescriptions,
      dislikedWithDescriptions,
      candidates: candidates.slice(0, MAX_CANDIDATES),
    };
  },
});

// ─── Public action ───────────────────────────────────────────────────────────

export const findShowForUser = action({
  args: { targetDate: v.optional(v.string()) },
  handler: async (ctx, args): Promise<FindShowResult> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("AI recommendations are not configured yet");

    const data = await ctx.runQuery(internal.findShow.gatherFindShowContext, {
      targetDate: args.targetDate,
    });

    const { anchorDate, hasTargetDate, candidates } = data;

    if (candidates.length === 0) {
      return {
        kind: "insufficient_context",
        anchorDate,
        hasTargetDate,
        reason: hasTargetDate
          ? "No currently-catalogued shows are running on that date (or you've already seen them all)."
          : "No currently-running shows to suggest yet.",
      };
    }

    // ── Build prompt blocks ────────────────────────────────────────────────
    let preferencesBlock: string;
    if (data.preferences && data.preferences.length > 0) {
      const lines = data.preferences.map(
        (p) =>
          `- "${p.element} is important to me": ${RATING_LABELS[p.rating] ?? p.rating} (${p.rating}/5)`
      );
      preferencesBlock = `The user's theatre element preferences:\n${lines.join("\n")}`;
    } else {
      preferencesBlock =
        "The user has not set any theatre preferences yet. Lean harder on their show history.";
    }

    const { ranked, lovedWithDescriptions, dislikedWithDescriptions } = data;
    const hasAnyRanked =
      ranked.loved.length > 0 ||
      ranked.liked.length > 0 ||
      ranked.okay.length > 0 ||
      ranked.disliked.length > 0;

    let showHistoryBlock: string;
    if (hasAnyRanked) {
      const parts: string[] = [];
      if (ranked.loved.length > 0) parts.push(`Shows they LOVED (${ranked.loved.length}): ${ranked.loved.join(", ")}`);
      if (ranked.liked.length > 0) parts.push(`Shows they LIKED (${ranked.liked.length}): ${ranked.liked.join(", ")}`);
      if (ranked.okay.length > 0) parts.push(`Shows they felt OKAY about (${ranked.okay.length}): ${ranked.okay.join(", ")}`);
      if (ranked.disliked.length > 0) parts.push(`Shows they DISLIKED (${ranked.disliked.length}): ${ranked.disliked.join(", ")}`);
      showHistoryBlock = parts.join("\n\n");
    } else {
      showHistoryBlock =
        "The user hasn't ranked any shows yet. Default to widely-acclaimed shows from the candidate list.";
    }

    const buildDescriptionsBlock = (
      title: string,
      entries: { name: string; description: string }[]
    ): string => {
      if (!Array.isArray(entries) || entries.length === 0) return "";
      const lines = entries
        .map((s) => {
          const d = truncateForPrompt(s.description);
          return d ? `- ${s.name}: ${d}` : null;
        })
        .filter((l): l is string => l !== null);
      if (lines.length === 0) return "";
      return `\n\n${title}\n${lines.join("\n")}`;
    };

    const lovedDescriptionsBlock = buildDescriptionsBlock(
      "PLOT/THEMATIC CONTEXT FOR SHOWS THEY LOVED (use for thematic similarity, not as a hard rule):",
      lovedWithDescriptions
    );
    const dislikedDescriptionsBlock = buildDescriptionsBlock(
      "PLOT/THEMATIC CONTEXT FOR SHOWS THEY DISLIKED (avoid similar themes/tone unless their element preferences argue otherwise):",
      dislikedWithDescriptions
    );

    // Candidate list: each candidate is keyed by showId so the model can only
    // pick from the provided pool. Show it closing dates and schedule hints.
    const candidateLines = candidates.map((c, idx) => {
      const desc = truncateForPrompt(c.description) ?? "(no description)";
      const closingLabel = c.isOpenRun
        ? "open-ended run"
        : c.closingDate
          ? `closing ${c.closingDate}`
          : "closing date unknown";
      const scheduleLabel =
        c.hasScheduleOnTargetDate === null
          ? hasTargetDate
            ? " — schedule not confirmed for that day"
            : ""
          : c.hasScheduleOnTargetDate
            ? ""
            : " — dark on that day";
      const ratingLabel =
        c.showScoreRating !== null ? `, ShowScore ${c.showScoreRating}/100` : "";
      return `${idx + 1}. [showId=${c.showId}] ${c.name} (${c.type}${ratingLabel}, ${closingLabel}${scheduleLabel})\n   ${desc}`;
    });

    const dateContextBlock = hasTargetDate
      ? `TARGET DATE: ${formatAnchorDate(anchorDate)} (${DAY_LABELS[dayKeyForIso(anchorDate)]}). Every candidate listed below is open on that day (or has no schedule data). Mention urgency when a candidate is closing within ~30 days of the target date.`
      : `CONTEXT: The user wants a suggestion for something to see soon (anchor date ${anchorDate}). Weight closing-soon and highly-rated shows.`;

    const prompt = `You are a personalized theatre recommendation assistant. The user is asking you to pick a show they should see from a pool of currently-running productions. Choose based on their stated preferences and full show history.

CRITICAL — TITLE DISAMBIGUATION:
The candidate list below uses real proper-noun show titles. Do NOT interpret a title's words literally (e.g. "The Unknown" is not "about the unknown" — it's a specific show). Use each candidate's provided description for subject matter.

CRITICAL — NEVER INVENT CANDIDATES:
You may ONLY pick showIds that appear in the CANDIDATES list. If nothing in the list is a good fit for this user, respond with the insufficient_context variant.

${dateContextBlock}

USER PROFILE:
${preferencesBlock}

FULL SHOW RANKINGS (every show they have placed in a tier — dislikes are as important as loves for filtering):
${showHistoryBlock}${lovedDescriptionsBlock}${dislikedDescriptionsBlock}

CANDIDATES (currently running; already deduped and pre-filtered to shows the user hasn't engaged with):
${candidateLines.join("\n")}

Pick the BEST 3 candidates for this user, ordered from strongest to weakest match. For each, mark urgency:
- "closing_soon" if the candidate's closing date is within ~30 days of the anchor date
- "open_run" if it's an open-ended run
- "standard" otherwise

Respond with ONLY a valid JSON object (no markdown, no code fences) matching one of these shapes:

SUCCESS SHAPE:
{
  "kind": "ok",
  "primary": { "showId": "<id from the list>", "urgency": "closing_soon|open_run|standard", "headline": "<short 3-8 word hook>", "reasoning": "<2-3 sentences explaining why THIS user, referencing specific preferences or past shows>" },
  "alternates": [
    { "showId": "...", "urgency": "...", "headline": "...", "reasoning": "..." },
    { "showId": "...", "urgency": "...", "headline": "...", "reasoning": "..." }
  ]
}

INSUFFICIENT-CONTEXT SHAPE (use ONLY when nothing in the candidate list reasonably fits this user — e.g. all the listed titles clash with their dislikes and there is no signal to justify any pick):
{
  "kind": "insufficient_context",
  "reason": "<one short sentence explaining what's missing>"
}

Never return a fallback pick. Prefer the insufficient_context shape over guessing.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error (findShow):", errText);
      throw new Error("Failed to get show suggestions");
    }

    const result: unknown = await response.json();
    const text =
      typeof result === "object" &&
      result !== null &&
      "content" in result &&
      Array.isArray((result as { content: unknown }).content) &&
      (result as { content: { type?: string; text?: string }[] }).content[0]?.type === "text"
        ? String((result as { content: { text?: string }[] }).content[0].text ?? "")
        : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse suggestion response");

    type ParsedPick = {
      showId?: string;
      urgency?: string;
      headline?: string;
      reasoning?: string;
    };
    const parsed = JSON.parse(jsonMatch[0]) as {
      kind?: string;
      primary?: ParsedPick;
      alternates?: ParsedPick[];
      reason?: string;
    };

    if (parsed.kind === "insufficient_context") {
      return {
        kind: "insufficient_context",
        anchorDate,
        hasTargetDate,
        reason: parsed.reason ?? "Not enough signal to pick a strong match.",
      };
    }

    if (parsed.kind !== "ok" || !parsed.primary) {
      return {
        kind: "insufficient_context",
        anchorDate,
        hasTargetDate,
        reason: "The recommendation engine returned an unexpected response.",
      };
    }

    // Build a lookup of candidates by string showId for model-output validation.
    const byId = new Map<string, CandidateCard>(
      candidates.map((c) => [String(c.showId), c])
    );

    const normalizeUrgency = (raw: string | undefined): FindShowUrgency => {
      if (raw === "closing_soon" || raw === "open_run") return raw;
      return "standard";
    };

    const toPick = (p: ParsedPick): FindShowPick | null => {
      if (!p.showId) return null;
      const card = byId.get(p.showId);
      if (!card) return null;
      return {
        showId: card.showId,
        showName: card.name,
        showType: card.type,
        posterUrl: card.posterUrl,
        closingDate: card.closingDate,
        isOpenRun: card.isOpenRun,
        urgency: normalizeUrgency(p.urgency),
        headline: (p.headline ?? "A pick for you").trim(),
        reasoning: (p.reasoning ?? "").trim(),
      };
    };

    const primary = toPick(parsed.primary);
    if (!primary) {
      // Model hallucinated or returned no match; fail closed.
      return {
        kind: "insufficient_context",
        anchorDate,
        hasTargetDate,
        reason: "The engine picked a show outside the candidate list.",
      };
    }

    const alternates: FindShowPick[] = [];
    const usedIds = new Set<string>([String(primary.showId)]);
    for (const alt of parsed.alternates ?? []) {
      const pick = toPick(alt);
      if (!pick) continue;
      if (usedIds.has(String(pick.showId))) continue;
      alternates.push(pick);
      usedIds.add(String(pick.showId));
      if (alternates.length >= 2) break;
    }

    // Log every successful run to the shared recommendation history so these
    // picks show up alongside "Would I like this?" rows. Best-effort — a
    // failure here shouldn't fail the user's request for a suggestion.
    if (data.userId) {
      try {
        await ctx.runMutation(internal.findShow.saveFindShowPicks, {
          userId: data.userId,
          targetDate: hasTargetDate ? anchorDate : undefined,
          picks: [
            {
              showId: primary.showId,
              showNameSnapshot: primary.showName,
              headline: primary.headline,
              reasoning: primary.reasoning,
              urgency: primary.urgency,
              rank: "primary",
            },
            ...alternates.map((a) => ({
              showId: a.showId,
              showNameSnapshot: a.showName,
              headline: a.headline,
              reasoning: a.reasoning,
              urgency: a.urgency,
              rank: "alternate" as const,
            })),
          ],
        });
      } catch (err) {
        console.error("Failed to persist findShow picks to history:", err);
      }
    }

    return { kind: "ok", anchorDate, hasTargetDate, primary, alternates };
  },
});

// ─── Persistence ─────────────────────────────────────────────────────────────

/**
 * Write a batch of find-a-show picks into the shared aiRecommendationHistory
 * table. One row per pick so the history UI can render them inline with the
 * single-show "Would I like this?" results. Kind is tagged as "find_a_show"
 * so the UI can discriminate.
 */
export const saveFindShowPicks = internalMutation({
  args: {
    userId: v.id("users"),
    targetDate: v.optional(v.string()),
    picks: v.array(
      v.object({
        showId: v.id("shows"),
        showNameSnapshot: v.string(),
        headline: v.string(),
        reasoning: v.string(),
        urgency: v.union(
          v.literal("closing_soon"),
          v.literal("open_run"),
          v.literal("standard")
        ),
        rank: v.union(v.literal("primary"), v.literal("alternate")),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const pick of args.picks) {
      await ctx.db.insert("aiRecommendationHistory", {
        userId: args.userId,
        showId: pick.showId,
        showNameSnapshot: pick.showNameSnapshot,
        headline: pick.headline,
        reasoning: pick.reasoning,
        createdAt: now,
        kind: "find_a_show",
        rank: pick.rank,
        urgency: pick.urgency,
        targetDate: args.targetDate,
      });
    }
  },
});
