import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireConvexUserId } from "./auth";
import {
  resolveWikipediaSummary,
  stripGenreOpener,
} from "./imageEnrichment/wikipedia";

const RATING_LABELS: Record<number, string> = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

/** Prompt-time cap on any single description. Full text stays in the DB. */
const DESCRIPTION_PROMPT_MAX_CHARS = 400;

/** How long before we'll retry a Wikipedia fallback for a show with no description. */
const DESCRIPTION_RECHECK_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

type ShowType =
  | "musical"
  | "play"
  | "opera"
  | "dance"
  | "revue"
  | "comedy"
  | "magic"
  | "other";

/**
 * Per-type prompt guidance (#134). Each line replaces the generic "weigh
 * their preferences" framing with the criteria that matter most for that
 * art form, so the model doesn't, for example, grade a play on its
 * orchestration. Keep lines short — they're inlined into the prompt.
 */
const TYPE_GUIDANCE: Record<ShowType, string> = {
  musical:
    "For a MUSICAL, weigh score/orchestration, vocal performance, choreography, and book alongside the user's preferences. Genre of musical (pop, rock, jazz, sung-through, etc.) is a strong signal.",
  play:
    "For a PLAY, weigh writing/dialogue, acting, direction, staging, and tone. Subject matter and genre (drama, comedy, thriller, absurdist, etc.) matter more than production polish.",
  opera:
    "For an OPERA, weigh composer/score, vocal style (bel canto, verismo, contemporary), libretto, and staging tradition. Audience familiarity with opera is usually a factor.",
  dance:
    "For a DANCE production, weigh choreographer, style (ballet, modern, tap, hip-hop), physicality, and the strength of any narrative or theme.",
  revue:
    "For a REVUE, weigh the songbook/material, performer chemistry, pacing, and whether the user enjoys variety/non-narrative formats.",
  comedy:
    "For a COMEDY (stand-up, sketch, improv), weigh the performer(s), tone (observational, absurd, political, blue), and format. Subject matter is usually the strongest signal.",
  magic:
    "For a MAGIC show, weigh illusion style (close-up, grand stage, mentalism), showmanship, and theatrical framing.",
  other:
    "Weigh the user's element preferences and the thematic patterns from their ranked shows.",
};

/**
 * Shorten a description for prompt inclusion without mid-word chops.
 * Prefers sentence boundaries within the limit, then a word boundary, then
 * a hard slice. Returns null if input is empty.
 */
function truncateForPrompt(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length <= DESCRIPTION_PROMPT_MAX_CHARS) return trimmed;
  const slice = trimmed.slice(0, DESCRIPTION_PROMPT_MAX_CHARS);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  if (sentenceEnd >= DESCRIPTION_PROMPT_MAX_CHARS - 120) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }
  const spaceIdx = slice.lastIndexOf(" ");
  if (spaceIdx >= DESCRIPTION_PROMPT_MAX_CHARS - 60) {
    return `${slice.slice(0, spaceIdx).trim()}\u2026`;
  }
  return `${slice.trim()}\u2026`;
}

export const getShowRecommendation = action({
  args: { showId: v.id("shows") },
  handler: async (
    ctx,
    args
  ): Promise<
    | {
        kind: "ok";
        score: number;
        headline: string;
        reasoning: string;
        matchedElements: string[];
        mismatchedElements: string[];
      }
    | { kind: "insufficient_context"; reason: string }
  > => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("AI recommendations are not configured yet");

    // Best-effort hydrate: if the show has no description, try to pull one
    // from a production or Wikipedia before we build the prompt. Safe to
    // call every time — the action short-circuits when a description already
    // exists or we checked recently.
    await ctx.runAction(internal.recommendations.ensureShowDescription, {
      showId: args.showId,
    });

    const data = await ctx.runQuery(
      internal.recommendationsContext.gatherRecommendationContext,
      { showId: args.showId }
    );

    if (!data.show) throw new Error("Show not found");

    const showType = data.show.type as ShowType;
    const typeGuidance = TYPE_GUIDANCE[showType] ?? TYPE_GUIDANCE.other;

    let preferencesBlock: string;
    if (data.preferences && data.preferences.length > 0) {
      const lines = data.preferences.map(
        (p: { element: string; rating: number }) =>
          `- "${p.element} is important to me": ${RATING_LABELS[p.rating] ?? p.rating} (${p.rating}/5)`
      );
      preferencesBlock = `The user's theatre element preferences:\n${lines.join("\n")}`;
    } else {
      preferencesBlock =
        "The user has not set any theatre preferences yet. Make a general assessment.";
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
      if (ranked.loved.length > 0) {
        parts.push(`Shows they LOVED (${ranked.loved.length}): ${ranked.loved.join(", ")}`);
      }
      if (ranked.liked.length > 0) {
        parts.push(`Shows they LIKED (${ranked.liked.length}): ${ranked.liked.join(", ")}`);
      }
      if (ranked.okay.length > 0) {
        parts.push(`Shows they felt OKAY about (${ranked.okay.length}): ${ranked.okay.join(", ")}`);
      }
      if (ranked.disliked.length > 0) {
        parts.push(`Shows they DISLIKED (${ranked.disliked.length}): ${ranked.disliked.join(", ")}`);
      }
      showHistoryBlock = parts.join("\n\n");
    } else {
      showHistoryBlock = "The user hasn't ranked any shows yet (only unranked entries, if any).";
    }

    const candidateDescription = truncateForPrompt(data.show.description);
    const showDescriptionBlock = candidateDescription
      ? `Description: ${candidateDescription}`
      : null;

    function buildDescriptionsBlock(
      title: string,
      entries: { name: string; description: string }[]
    ): string {
      if (!Array.isArray(entries) || entries.length === 0) return "";
      const lines = entries
        .map((s) => {
          const d = truncateForPrompt(s.description);
          return d ? `- ${s.name}: ${d}` : null;
        })
        .filter((l): l is string => l !== null);
      if (lines.length === 0) return "";
      return `\n\n${title}\n${lines.join("\n")}`;
    }

    const lovedDescriptionsBlock = buildDescriptionsBlock(
      "PLOT/THEMATIC CONTEXT FOR SHOWS THEY LOVED (use for thematic similarity, not as a hard rule):",
      lovedWithDescriptions
    );
    const dislikedDescriptionsBlock = buildDescriptionsBlock(
      "PLOT/THEMATIC CONTEXT FOR SHOWS THEY DISLIKED (avoid similar themes/tone unless the user's preferences explicitly point the other way):",
      dislikedWithDescriptions
    );

    const showBlockLines = [
      `- Name: ${data.show.name}`,
      `- Type: ${data.show.type}`,
      showDescriptionBlock ? `- ${showDescriptionBlock}` : null,
    ].filter((l): l is string => l !== null);

    const prompt = `You are a personalized theatre recommendation assistant. Based on a user's stated preferences and ranking history, predict whether they would enjoy a specific show.

OUTPUT RULES (follow strictly):
1. Show titles are proper nouns — quote them verbatim. Do NOT add, drop, or translate articles. Do NOT paraphrase the title.
2. Do NOT interpret a title's words literally (e.g. "The Unknown" is not "about the unknown" — it's a specific show with that name). Rely on the Description for subject matter.
3. Do NOT mention the show's closing date, open-run status, or poster — those are displayed separately in the UI.
4. Do NOT mention missing descriptions, context gaps, or "we don't know much about this show" in the user-facing text. If you genuinely cannot assess the show, return the insufficient_context shape described below.
5. Never return a fallback score. If the signal is not there, return insufficient_context.

VOICE RULES (follow strictly):
- Describe the SHOW, not the user. Prefer "This has sharp writing" over "You'll appreciate the sharp writing" or "You usually like shows with sharp writing". Minimize narration on what the user has seen or typically likes.
- Be concise and concrete. No filler phrases like "suitable for your taste", "right up your alley", "like your favorites", "as you know", "perfect for you", "you typically enjoy", or "you'll probably love".
- You MAY cite ONE title from the user's LOVED or LIKED list in parentheses as a concrete anchor for a taste claim about the show, e.g. "Sharp, character-driven storytelling (Hadestown)." Use this sparingly — at most one parenthetical anchor in the reasoning, and only when it adds concreteness. You can cite a loved or disliked show.

${typeGuidance}

SHOW TO EVALUATE:
${showBlockLines.join("\n")}

USER PROFILE:
${preferencesBlock}

INFERRED TASTE (internal reference — their loved/liked titles may be cited in parens per the Voice Rules; their disliked titles must never be named).
${showHistoryBlock}${lovedDescriptionsBlock}${dislikedDescriptionsBlock}

Assess how likely this user is to enjoy "${data.show.name}". Use the description for thematic reasoning (tone, subject matter, style). If the show is similar in theme/tone to ones they disliked, weigh that heavily without naming those shows. If it aligns with loved/liked patterns, describe the show's qualities directly and optionally anchor with one parenthetical example.

Respond with ONLY a valid JSON object (no markdown, no code fences) matching one of these two shapes:

SUCCESS:
{
  "kind": "ok",
  "score": <integer 1-5, 1=probably won't enjoy, 3=could go either way, 5=almost certainly will love it>,
  "headline": "<short 3-8 word hook>",
  "reasoning": "<2-3 short sentences describing the show and why it does or doesn't line up with this user's taste. Show-first voice. At most one parenthetical citation of a loved/liked title.>",
  "matchedElements": [<element names from their preferences that align with this show; can be empty>],
  "mismatchedElements": [<element names that might not align; can be empty>]
}

INSUFFICIENT-CONTEXT (use ONLY when you genuinely cannot assess this show — e.g. title is ambiguous and no description is provided):
{
  "kind": "insufficient_context",
  "reason": "<one short sentence explaining what was missing, from the engine's perspective. Do NOT frame this as a risk to the user.>"
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
        max_tokens: 768,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      throw new Error("Failed to get recommendation");
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
    if (!jsonMatch) throw new Error("Failed to parse recommendation");

    const parsed = JSON.parse(jsonMatch[0]) as {
      kind?: string;
      score?: number;
      headline?: string;
      reasoning?: string;
      matchedElements?: string[];
      mismatchedElements?: string[];
      reason?: string;
    };

    if (parsed.kind === "insufficient_context") {
      return {
        kind: "insufficient_context",
        reason:
          typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason
            : "Not enough context to generate a reliable suggestion.",
      };
    }

    // Legacy guard: if the model ignored the schema and returned raw score
    // fields without a `kind`, accept as success. If it explicitly sent
    // `"kind": "ok"` we also take that path.
    if (
      parsed.kind === "ok" ||
      (parsed.kind === undefined && typeof parsed.score === "number")
    ) {
      if (
        typeof parsed.score !== "number" ||
        typeof parsed.headline !== "string" ||
        typeof parsed.reasoning !== "string" ||
        !Array.isArray(parsed.matchedElements) ||
        !Array.isArray(parsed.mismatchedElements)
      ) {
        throw new Error("Failed to parse recommendation");
      }

      const ok = {
        kind: "ok" as const,
        score: parsed.score,
        headline: parsed.headline,
        reasoning: parsed.reasoning,
        matchedElements: parsed.matchedElements,
        mismatchedElements: parsed.mismatchedElements,
      };

      if (data.userId) {
        await ctx.runMutation(internal.recommendations.saveRecommendation, {
          userId: data.userId,
          showId: args.showId,
          showNameSnapshot: data.show.name,
          score: ok.score,
          headline: ok.headline,
          reasoning: ok.reasoning,
          matchedElements: ok.matchedElements,
          mismatchedElements: ok.mismatchedElements,
        });
      }

      return ok;
    }

    throw new Error("Failed to parse recommendation");
  },
});

/**
 * Best-effort description hydration called before building the
 * recommendation prompt. Order of operations:
 *   1. If the show already has a description, return (no-op).
 *   2. If we fetched recently (within DESCRIPTION_RECHECK_COOLDOWN_MS),
 *      skip — avoids hammering Wikipedia for a show that has no article.
 *   3. Try to copy the newest production's description onto the show
 *      (Playbill-sourced when present). Cheap, in-DB, no network.
 *   4. Fall back to a Wikipedia summary via the shared enrichment helpers.
 *
 * Writes set `descriptionCheckedAt` via the underlying mutations, so the
 * cooldown guard works on both success and miss.
 */
export const ensureShowDescription = internalAction({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.runQuery(
      internal.recommendationsContext.getShowForDescriptionHydrate,
      { showId: args.showId }
    );
    if (!show) return;
    if (show.description && show.description.trim().length > 0) return;

    if (
      show.descriptionCheckedAt &&
      Date.now() - show.descriptionCheckedAt < DESCRIPTION_RECHECK_COOLDOWN_MS
    ) {
      return;
    }

    const prod = await ctx.runQuery(
      internal.recommendationsContext.getNewestProductionDescription,
      { showId: args.showId }
    );
    if (prod && prod.description.trim().length > 0) {
      await ctx.runMutation(
        internal.recommendations.setShowDescriptionFromProduction,
        { showId: args.showId, description: prod.description }
      );
      return;
    }

    try {
      const result = await resolveWikipediaSummary(show.name, show.type);
      if (result) {
        const cleaned = stripGenreOpener(show.name, result.extract);
        await ctx.runMutation(
          internal.imageEnrichment.mutations.setShowWikipediaDescription,
          {
            showId: args.showId,
            description: cleaned,
            wikipediaTitle: result.articleTitle,
          }
        );
      } else {
        await ctx.runMutation(
          internal.imageEnrichment.mutations.markDescriptionChecked,
          { showId: args.showId }
        );
      }
    } catch (err) {
      console.error("ensureShowDescription: Wikipedia lookup failed", err);
      await ctx.runMutation(
        internal.imageEnrichment.mutations.markDescriptionChecked,
        { showId: args.showId }
      );
    }
  },
});

/**
 * Copies a production's description onto its parent show when the show
 * itself has no description yet. Uses `descriptionSource: "playbill"` —
 * production descriptions originate from the Playbill ingest pipeline per
 * `productions.description`'s schema comment.
 */
export const setShowDescriptionFromProduction = internalMutation({
  args: {
    showId: v.id("shows"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    if (!show) return;
    if (show.description && show.description.trim().length > 0) return;

    await ctx.db.patch(args.showId, {
      description: args.description,
      descriptionSource: "playbill",
      descriptionUpdatedAt: Date.now(),
      descriptionCheckedAt: Date.now(),
    });
  },
});

export const saveRecommendation = internalMutation({
  args: {
    userId: v.id("users"),
    showId: v.id("shows"),
    showNameSnapshot: v.string(),
    score: v.number(),
    headline: v.string(),
    reasoning: v.string(),
    matchedElements: v.array(v.string()),
    mismatchedElements: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiRecommendationHistory", {
      ...args,
      kind: "would_i_like",
      createdAt: Date.now(),
    });
  },
});

export const listRecommendationHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const rows = await ctx.db
      .query("aiRecommendationHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    return rows;
  },
});

export const deleteRecommendation = mutation({
  args: { id: v.id("aiRecommendationHistory") },
  handler: async (ctx, args) => {
    const userId = await requireConvexUserId(ctx);
    const rec = await ctx.db.get(args.id);
    if (!rec || rec.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});

export const clearRecommendationHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireConvexUserId(ctx);
    const rows = await ctx.db
      .query("aiRecommendationHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
  },
});
