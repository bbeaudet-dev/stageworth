import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
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

const RATING_LABELS: Record<number, string> = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

const DESCRIPTION_PROMPT_MAX_CHARS = 320;
const LOVED_DESCRIPTIONS_LIMIT = 5;
const DISLIKED_DESCRIPTIONS_LIMIT = 5;
const MIN_SHOWS = 2;
const MAX_SHOWS = 6;

export type CompareUrgency = "closing_soon" | "open_run" | "standard";

export type ComparePick = {
  showId: Id<"shows">;
  showName: string;
  showType: string;
  posterUrl: string | null;
  closingDate: string | null;
  isOpenRun: boolean;
  urgency: CompareUrgency;
  headline: string;
  fit: string;
  edge?: string;
  tradeoff?: string;
};

export type CompareResult =
  | {
      kind: "ok";
      winner: ComparePick;
      runnersUp: ComparePick[];
    }
  | {
      kind: "insufficient_context";
      reason: string;
    };

type CompareCard = {
  showId: Id<"shows">;
  name: string;
  type: string;
  description: string | null;
  closingDate: string | null;
  isOpenRun: boolean;
  posterUrl: string | null;
};

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
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

function formatDateHuman(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export const getHelpMeDecideCandidates = query({
  args: { tripId: v.optional(v.id("trips")) },
  handler: async (ctx, args) => {
    const userId = await getConvexUserId(ctx);
    if (!userId) return { source: "none" as const, shows: [] };

    let showIds: Id<"shows">[] = [];
    let source: "trip" | "want_to_see" = "want_to_see";
    let tripStartDate: string | null = null;
    let tripEndDate: string | null = null;

    if (args.tripId) {
      const trip = await ctx.db.get(args.tripId);
      if (!trip || trip.userId !== userId) {
        return { source: "trip" as const, shows: [] };
      }
      tripStartDate = trip.startDate;
      tripEndDate = trip.endDate;
      const rows = await ctx.db
        .query("tripShows")
        .withIndex("by_trip", (q) => q.eq("tripId", args.tripId!))
        .collect();
      showIds = rows.map((r) => r.showId);
      source = "trip";
    } else {
      const wantList = await ctx.db
        .query("userLists")
        .withIndex("by_user_systemKey", (q) =>
          q.eq("userId", userId).eq("systemKey", "want_to_see")
        )
        .first();
      showIds = (wantList?.showIds ?? []) as Id<"shows">[];
      source = "want_to_see";
    }

    const today = todayIso();
    const shows: {
      showId: Id<"shows">;
      name: string;
      type: string;
      posterUrl: string | null;
      closingDate: string | null;
      isOpenRun: boolean;
    }[] = [];

    const seen = new Set<string>();
    for (const showId of showIds) {
      const key = String(showId);
      if (seen.has(key)) continue;
      seen.add(key);
      const show = await ctx.db.get(showId);
      if (!show || !isCatalogPublished(show.dataStatus)) continue;

      const productions = await ctx.db
        .query("productions")
        .withIndex("by_show", (q) => q.eq("showId", showId))
        .collect();

      let bestProd = null as (typeof productions)[number] | null;
      for (const prod of productions) {
        if (!isCatalogPublished(prod.dataStatus)) continue;
        if (!bestProd) {
          bestProd = prod;
          continue;
        }
        const status = getProductionStatus(prod, today);
        const bestStatus = getProductionStatus(bestProd, today);
        const isRunning =
          status === "open" || status === "open_run" || status === "in_previews";
        const bestRunning =
          bestStatus === "open" ||
          bestStatus === "open_run" ||
          bestStatus === "in_previews";
        if (isRunning && !bestRunning) bestProd = prod;
      }

      const posterUrl = bestProd
        ? ((await resolveProductionPosterUrl(ctx, bestProd)) ??
          (await resolveShowImageUrls(ctx, show))[0] ??
          null)
        : ((await resolveShowImageUrls(ctx, show))[0] ?? null);

      shows.push({
        showId,
        name: show.name,
        type: show.type,
        posterUrl,
        closingDate: bestProd?.closingDate ?? null,
        isOpenRun: bestProd?.isOpenRun === true,
      });
    }

    return { source, shows, tripStartDate, tripEndDate };
  },
});

export const gatherCompareShowsContext = internalQuery({
  args: { showIds: v.array(v.id("shows")) },
  handler: async (ctx, args) => {
    const userId = await getConvexUserId(ctx);

    let preferences: { element: string; rating: number }[] = [];
    const ranked = {
      loved: [] as string[],
      liked: [] as string[],
      okay: [] as string[],
      disliked: [] as string[],
    };
    let lovedWithDescriptions: { name: string; description: string }[] = [];
    let dislikedWithDescriptions: { name: string; description: string }[] = [];

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

    const today = todayIso();
    const cards: CompareCard[] = [];
    const seen = new Set<string>();

    for (const showId of args.showIds) {
      const key = String(showId);
      if (seen.has(key)) continue;
      seen.add(key);

      const show = await ctx.db.get(showId);
      if (!show || !isCatalogPublished(show.dataStatus)) continue;

      const productions = await ctx.db
        .query("productions")
        .withIndex("by_show", (q) => q.eq("showId", showId))
        .collect();

      let bestProd = null as (typeof productions)[number] | null;
      for (const prod of productions) {
        if (!isCatalogPublished(prod.dataStatus)) continue;
        const status = getProductionStatus(prod, today);
        const isRunning =
          status === "open" || status === "open_run" || status === "in_previews";
        if (!bestProd) {
          bestProd = prod;
          continue;
        }
        const bestStatus = getProductionStatus(bestProd, today);
        const bestRunning =
          bestStatus === "open" ||
          bestStatus === "open_run" ||
          bestStatus === "in_previews";
        if (isRunning && !bestRunning) bestProd = prod;
      }

      const posterUrl = bestProd
        ? ((await resolveProductionPosterUrl(ctx, bestProd)) ??
          (await resolveShowImageUrls(ctx, show))[0] ??
          null)
        : ((await resolveShowImageUrls(ctx, show))[0] ?? null);

      cards.push({
        showId,
        name: show.name,
        type: show.type,
        description:
          show.description && show.description.trim().length > 0
            ? show.description
            : null,
        closingDate: bestProd?.closingDate ?? null,
        isOpenRun: bestProd?.isOpenRun === true,
        posterUrl,
      });
    }

    return {
      userId,
      preferences,
      ranked,
      lovedWithDescriptions,
      dislikedWithDescriptions,
      cards,
    };
  },
});

export const compareShowsForUser = action({
  args: {
    showIds: v.array(v.id("shows")),
    tripStartDate: v.optional(v.string()),
    tripEndDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CompareResult> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("AI recommendations are not configured yet");

    const deduped: Id<"shows">[] = [];
    const seen = new Set<string>();
    for (const id of args.showIds) {
      const key = String(id);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(id);
    }

    if (deduped.length < MIN_SHOWS) {
      return {
        kind: "insufficient_context",
        reason: `Pick at least ${MIN_SHOWS} shows to compare.`,
      };
    }
    if (deduped.length > MAX_SHOWS) {
      return {
        kind: "insufficient_context",
        reason: `Please compare at most ${MAX_SHOWS} shows at once.`,
      };
    }

    const data = await ctx.runQuery(internal.compareShows.gatherCompareShowsContext, {
      showIds: deduped,
    });

    if (data.cards.length < MIN_SHOWS) {
      return {
        kind: "insufficient_context",
        reason: "Some of those shows aren't in our catalogue yet.",
      };
    }

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
    const showHistoryBlock = hasAnyRanked
      ? [
          ranked.loved.length > 0 ? `LOVED: ${ranked.loved.join(", ")}` : null,
          ranked.liked.length > 0 ? `LIKED: ${ranked.liked.join(", ")}` : null,
          ranked.okay.length > 0 ? `OKAY: ${ranked.okay.join(", ")}` : null,
          ranked.disliked.length > 0
            ? `DISLIKED: ${ranked.disliked.join(", ")}`
            : null,
        ]
          .filter((l): l is string => l !== null)
          .join("\n")
      : "The user has not ranked any shows yet.";

    const buildDescriptionsBlock = (
      title: string,
      shows: { name: string; description: string }[]
    ): string => {
      if (shows.length === 0) return "";
      const lines = shows
        .map((s) => {
          const d = truncateForPrompt(s.description);
          return d ? `- ${s.name}: ${d}` : null;
        })
        .filter((l): l is string => l !== null);
      if (lines.length === 0) return "";
      return `\n\n${title}\n${lines.join("\n")}`;
    };

    const lovedDescriptionsBlock = buildDescriptionsBlock(
      "PLOT/THEMATIC CONTEXT FOR SHOWS THEY LOVED:",
      lovedWithDescriptions
    );
    const dislikedDescriptionsBlock = buildDescriptionsBlock(
      "PLOT/THEMATIC CONTEXT FOR SHOWS THEY DISLIKED:",
      dislikedWithDescriptions
    );

    const today = todayIso();
    const candidateLines = data.cards.map((c, idx) => {
      const desc = truncateForPrompt(c.description);
      const header = `${idx + 1}. [showId=${c.showId}] ${c.name} (${c.type})`;
      return desc ? `${header}\n   ${desc}` : header;
    });

    let tripContextBlock = "";
    if (args.tripStartDate && args.tripEndDate) {
      tripContextBlock = `\nTRIP WINDOW: ${formatDateHuman(args.tripStartDate)} \u2192 ${formatDateHuman(args.tripEndDate)}.`;
    } else if (args.tripStartDate) {
      tripContextBlock = `\nTARGET DATE: ${formatDateHuman(args.tripStartDate)}.`;
    }

    const prompt = `You are a personalized theatre recommendation assistant. The user is deciding between a small set of shows and has asked you to pick the ONE they should prioritize.

OUTPUT RULES (follow strictly):
1. Show titles are proper nouns \u2014 quote them verbatim. Do NOT add, drop, or translate articles. Never say things like "the Hamilton" \u2014 use only the exact title given.
2. Do NOT interpret a title's words literally. Use each candidate's description for subject matter.
3. Do NOT mention closing date, open-run status, running status, show type, or poster in your text \u2014 those render separately in the UI.
4. Do NOT mention missing descriptions, context gaps, data availability, or "we don't know much" in user-facing text. If you truly cannot distinguish the candidates for this user, return insufficient_context.
5. You may ONLY use the showIds that appear in CANDIDATES. Never invent a candidate.
6. Reasoning must be genuinely comparative. The winner's "edge" and each runner-up's "tradeoff" must name what THIS show has or lacks versus the OTHER specific candidates in this list \u2014 not generic statements.

VOICE RULES (follow strictly):
- Describe the SHOWS, not the user. Prefer "Sharper writing and a tighter runtime than the others" over "You'll appreciate that this is sharper". Do NOT narrate the user's viewing history.
- Be concise and concrete. No filler phrases like "suitable for your taste", "right up your alley", "like your favorites", "as you know you love", "perfect for you", "you typically enjoy", or "you'll probably love".
- You MAY cite ONE title from the user's LOVED or LIKED list in parentheses as a concrete anchor for a taste claim about the show, e.g. "Dense, character-driven drama (think Hadestown)." Use this sparingly \u2014 at most one parenthetical anchor per pick, and only when it sharpens an otherwise-vague claim. Never cite a disliked show.${tripContextBlock}

USER PROFILE:
${preferencesBlock}

INFERRED TASTE (internal reference \u2014 their loved/liked titles may be cited in parens per the Voice Rules; their disliked titles must never be named).
${showHistoryBlock}${lovedDescriptionsBlock}${dislikedDescriptionsBlock}

CANDIDATES (the user is comparing these directly):
${candidateLines.join("\n")}

Pick the ONE winner that best fits this user, then rank the remaining candidates as runners-up from strongest to weakest alternative. Urgency tags:
- "closing_soon" if the show's closing date is within ~30 days of today (${today})
- "open_run" if it's an open-ended run
- "standard" otherwise

Respond with ONLY a valid JSON object (no markdown, no code fences) matching one of these shapes:

SUCCESS:
{
  "kind": "ok",
  "winner": {
    "showId": "<id from the list>",
    "urgency": "closing_soon|open_run|standard",
    "headline": "<short 3-8 word hook>",
    "fit": "<1-2 short sentences. Show-first voice \u2014 describe what THIS show has. At most one parenthetical citation of a loved/liked title.>",
    "edge": "<1 short sentence naming what THIS show offers that the other candidates in this list do not \u2014 the concrete reason it wins the comparison.>"
  },
  "runnersUp": [
    { "showId": "...", "urgency": "...", "headline": "...", "fit": "<1-2 short sentences, show-first>", "tradeoff": "<1 short sentence naming the concrete gap vs. the winner — e.g. 'Lighter on the character work than the winner.'>" }
  ]
}

INSUFFICIENT-CONTEXT (use ONLY when you genuinely cannot distinguish the candidates for this user):
{
  "kind": "insufficient_context",
  "reason": "<one short sentence, from the engine's perspective. Do NOT frame as a risk to the user.>"
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error (compareShows):", errText);
      throw new Error("Failed to get comparison recommendation");
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
    if (!jsonMatch) throw new Error("Failed to parse comparison response");

    type ParsedPick = {
      showId?: string;
      urgency?: string;
      headline?: string;
      fit?: string;
      edge?: string;
      tradeoff?: string;
    };
    const parsed = JSON.parse(jsonMatch[0]) as {
      kind?: string;
      winner?: ParsedPick;
      runnersUp?: ParsedPick[];
      reason?: string;
    };

    if (parsed.kind === "insufficient_context") {
      return {
        kind: "insufficient_context",
        reason: parsed.reason ?? "Not enough signal to pick a winner.",
      };
    }

    if (parsed.kind !== "ok" || !parsed.winner) {
      return {
        kind: "insufficient_context",
        reason: "The recommendation engine returned an unexpected response.",
      };
    }

    const byId = new Map<string, CompareCard>(
      data.cards.map((c) => [String(c.showId), c])
    );

    const normalizeUrgency = (raw: string | undefined): CompareUrgency => {
      if (raw === "closing_soon" || raw === "open_run") return raw;
      return "standard";
    };

    const toPick = (
      p: ParsedPick,
      rank: "primary" | "alternate"
    ): ComparePick | null => {
      if (!p.showId) return null;
      const card = byId.get(p.showId);
      if (!card) return null;
      const fitText = (p.fit ?? "").trim();
      const edgeText = rank === "primary" ? (p.edge ?? "").trim() : "";
      const tradeoffText = rank === "alternate" ? (p.tradeoff ?? "").trim() : "";
      return {
        showId: card.showId,
        showName: card.name,
        showType: card.type,
        posterUrl: card.posterUrl,
        closingDate: card.closingDate,
        isOpenRun: card.isOpenRun,
        urgency: normalizeUrgency(p.urgency),
        headline: (p.headline ?? "Best pick for you").trim(),
        fit: fitText,
        ...(rank === "primary" && edgeText ? { edge: edgeText } : {}),
        ...(rank === "alternate" && tradeoffText ? { tradeoff: tradeoffText } : {}),
      };
    };

    const winner = toPick(parsed.winner, "primary");
    if (!winner) {
      return {
        kind: "insufficient_context",
        reason: "The engine picked a show that wasn't in the list. Try again.",
      };
    }

    const runnersUp: ComparePick[] = [];
    const usedIds = new Set<string>([String(winner.showId)]);
    for (const rp of parsed.runnersUp ?? []) {
      const pick = toPick(rp, "alternate");
      if (!pick) continue;
      if (usedIds.has(String(pick.showId))) continue;
      runnersUp.push(pick);
      usedIds.add(String(pick.showId));
    }

    if (data.userId) {
      try {
        const groupId = crypto.randomUUID();
        await ctx.runMutation(internal.compareShows.saveComparePicks, {
          userId: data.userId,
          groupId,
          picks: [
            {
              showId: winner.showId,
              showNameSnapshot: winner.showName,
              headline: winner.headline,
              fit: winner.fit,
              edge: winner.edge,
              urgency: winner.urgency,
              rank: "primary",
            },
            ...runnersUp.map((r) => ({
              showId: r.showId,
              showNameSnapshot: r.showName,
              headline: r.headline,
              fit: r.fit,
              tradeoff: r.tradeoff,
              urgency: r.urgency,
              rank: "alternate" as const,
            })),
          ],
        });
      } catch (err) {
        console.error("Failed to persist compareShows picks to history:", err);
      }
    }

    return { kind: "ok", winner, runnersUp };
  },
});

export const saveComparePicks = internalMutation({
  args: {
    userId: v.id("users"),
    groupId: v.string(),
    picks: v.array(
      v.object({
        showId: v.id("shows"),
        showNameSnapshot: v.string(),
        headline: v.string(),
        fit: v.string(),
        edge: v.optional(v.string()),
        tradeoff: v.optional(v.string()),
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
        createdAt: now,
        kind: "help_me_decide",
        rank: pick.rank,
        urgency: pick.urgency,
        groupId: args.groupId,
        fit: pick.fit,
        edge: pick.edge,
        tradeoff: pick.tradeoff,
      });
    }
  },
});
