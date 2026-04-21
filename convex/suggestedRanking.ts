import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getConvexUserId } from "./auth";
import { buildNoRegurgitationBlock, buildVoiceRulesBlock } from "./promptFragments";

const RATING_LABELS: Record<number, string> = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

const DESCRIPTION_PROMPT_MAX_CHARS = 240;
const LOVED_DESCRIPTIONS_LIMIT = 5;
const DISLIKED_DESCRIPTIONS_LIMIT = 5;

/**
 * Max number of in-tier shows we'll list for the position prediction step.
 * Tier lists tend to stay modest in practice; if they balloon past this we
 * anchor with the top/bottom slices so the model still sees the extremes.
 */
const MAX_TIER_SHOWS = 24;

type TierKey = "loved" | "liked" | "okay" | "disliked";

function truncateForPrompt(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length <= DESCRIPTION_PROMPT_MAX_CHARS) return trimmed;
  const slice = trimmed.slice(0, DESCRIPTION_PROMPT_MAX_CHARS);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
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

function buildPreferencesBlock(
  preferences: { element: string; rating: number }[],
): string {
  if (!preferences || preferences.length === 0) {
    return "The reader has not set any theatre preferences yet. Lean on ranking history.";
  }
  const lines = preferences.map(
    (p) =>
      `- "${p.element} is important to me": ${RATING_LABELS[p.rating] ?? p.rating} (${p.rating}/5)`,
  );
  return `Theatre element preferences:\n${lines.join("\n")}`;
}

function buildHistoryBlock(ranked: {
  loved: string[];
  liked: string[];
  okay: string[];
  disliked: string[];
}): string {
  const parts: string[] = [];
  if (ranked.loved.length > 0) {
    parts.push(`LOVED (${ranked.loved.length}): ${ranked.loved.join(", ")}`);
  }
  if (ranked.liked.length > 0) {
    parts.push(`LIKED (${ranked.liked.length}): ${ranked.liked.join(", ")}`);
  }
  if (ranked.okay.length > 0) {
    parts.push(`OKAY (${ranked.okay.length}): ${ranked.okay.join(", ")}`);
  }
  if (ranked.disliked.length > 0) {
    parts.push(`DISLIKED (${ranked.disliked.length}): ${ranked.disliked.join(", ")}`);
  }
  if (parts.length === 0) {
    return "No ranked shows yet.";
  }
  return parts.join("\n\n");
}

function buildDescriptionsBlock(
  title: string,
  entries: { name: string; description: string }[],
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

function extractJsonText(result: unknown): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "content" in result &&
    Array.isArray((result as { content: unknown }).content) &&
    (result as { content: { type?: string; text?: string }[] }).content[0]?.type === "text"
  ) {
    return String(
      (result as { content: { text?: string }[] }).content[0].text ?? "",
    );
  }
  return "";
}

async function callClaude(
  prompt: string,
  maxTokens: number,
  apiKey: string,
  errorLabel: string,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    console.error(`Anthropic API error (${errorLabel}):`, errText);
    throw new Error(`Failed to generate suggestion (${errorLabel})`);
  }
  const result: unknown = await response.json();
  const text = extractJsonText(result);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Failed to parse suggestion (${errorLabel})`);
  }
  return jsonMatch[0];
}

/**
 * Internal: gathers show + taste context for tier prediction. Mirrors
 * gatherRecommendationContext but trimmed down — we don't need the
 * per-type guidance or the "matched/mismatched element" plumbing here.
 */
export const gatherSuggestedTierContext = internalQuery({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
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

      const idsByTier: Record<TierKey, Id<"shows">[]> = {
        loved: [],
        liked: [],
        okay: [],
        disliked: [],
      };
      for (const row of userShows) {
        if (row.tier === "unranked") continue;
        const tier = row.tier as TierKey;
        if (tier in idsByTier) idsByTier[tier].push(row.showId);
      }

      async function namesFor(ids: Id<"shows">[]): Promise<string[]> {
        const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
        return docs
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .map((s) => s.name)
          .sort((a, b) => a.localeCompare(b));
      }

      ranked.loved = await namesFor(idsByTier.loved);
      ranked.liked = await namesFor(idsByTier.liked);
      ranked.okay = await namesFor(idsByTier.okay);
      ranked.disliked = await namesFor(idsByTier.disliked);

      async function descriptionsFor(
        ids: Id<"shows">[],
        limit: number,
      ): Promise<{ name: string; description: string }[]> {
        const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
        return docs
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .filter(
            (s) =>
              typeof s.description === "string" &&
              s.description.trim().length > 0,
          )
          .slice(0, limit)
          .map((s) => ({ name: s.name, description: s.description as string }));
      }

      lovedWithDescriptions = await descriptionsFor(
        idsByTier.loved,
        LOVED_DESCRIPTIONS_LIMIT,
      );
      dislikedWithDescriptions = await descriptionsFor(
        idsByTier.disliked,
        DISLIKED_DESCRIPTIONS_LIMIT,
      );
    }

    return {
      show: show
        ? {
            name: show.name,
            type: show.type,
            description:
              typeof show.description === "string" &&
              show.description.trim().length > 0
                ? show.description
                : null,
          }
        : null,
      preferences,
      ranked,
      lovedWithDescriptions,
      dislikedWithDescriptions,
    };
  },
});

/**
 * Internal: gathers the ordered list of shows already ranked in the target
 * tier (best → worst), plus the show-to-rank's context. Used for position
 * prediction. If the tier is empty we skip the AI call entirely and the
 * caller returns position 0.
 */
export const gatherSuggestedPositionContext = internalQuery({
  args: {
    showId: v.id("shows"),
    tier: v.union(
      v.literal("loved"),
      v.literal("liked"),
      v.literal("okay"),
      v.literal("disliked"),
    ),
  },
  handler: async (ctx, args) => {
    const show = await ctx.db.get(args.showId);
    const userId = await getConvexUserId(ctx);

    let preferences: { element: string; rating: number }[] = [];
    let tierShows: {
      id: Id<"shows">;
      name: string;
      type: string;
      description: string | null;
    }[] = [];

    if (userId) {
      const prefs = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (prefs) preferences = prefs.elementRatings;

      const userRanking = await ctx.db
        .query("userRankings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      const userShows = await ctx.db
        .query("userShows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const tierByShowId = new Map(userShows.map((r) => [r.showId, r.tier]));

      const orderedIds = (userRanking?.showIds ?? []).filter(
        (id) => id !== args.showId && tierByShowId.get(id) === args.tier,
      );

      const docs = await Promise.all(orderedIds.map((id) => ctx.db.get(id)));
      tierShows = docs
        .map((s, i) =>
          s
            ? {
                id: orderedIds[i],
                name: s.name,
                type: s.type as string,
                description:
                  typeof s.description === "string" &&
                  s.description.trim().length > 0
                    ? s.description
                    : null,
              }
            : null,
        )
        .filter((x): x is NonNullable<typeof x> => x !== null);
    }

    return {
      show: show
        ? {
            name: show.name,
            type: show.type,
            description:
              typeof show.description === "string" &&
              show.description.trim().length > 0
                ? show.description
                : null,
          }
        : null,
      preferences,
      tierShows,
    };
  },
});

// ---------------------------------------------------------------------------
// Action 1: predict tier
// ---------------------------------------------------------------------------

export type SuggestedTierResult =
  | { kind: "ok"; tier: TierKey; reasoning: string }
  | { kind: "insufficient_context"; reason: string };

export const predictSuggestedTier = action({
  args: { showId: v.id("shows") },
  handler: async (ctx, args): Promise<SuggestedTierResult> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("AI recommendations are not configured yet");

    await ctx.runAction(internal.recommendations.ensureShowDescription, {
      showId: args.showId,
    });

    const data = await ctx.runQuery(
      internal.suggestedRanking.gatherSuggestedTierContext,
      { showId: args.showId },
    );
    if (!data.show) throw new Error("Show not found");

    const preferencesBlock = buildPreferencesBlock(data.preferences);
    const historyBlock = buildHistoryBlock(data.ranked);
    const lovedDescriptionsBlock = buildDescriptionsBlock(
      "PLOT/THEMATIC CONTEXT FOR LOVED SHOWS (use for thematic similarity):",
      data.lovedWithDescriptions,
    );
    const dislikedDescriptionsBlock = buildDescriptionsBlock(
      "PLOT/THEMATIC CONTEXT FOR DISLIKED SHOWS (use for thematic dissimilarity):",
      data.dislikedWithDescriptions,
    );
    const candidateDescription = truncateForPrompt(data.show.description);
    const showDescriptionBlock = candidateDescription
      ? `- Description: ${candidateDescription}`
      : null;

    const showBlockLines = [
      `- Name: ${data.show.name}`,
      `- Type: ${data.show.type}`,
      showDescriptionBlock,
    ].filter((l): l is string => l !== null);

    const prompt = `You are predicting which tier the reader is most likely to place a show in after seeing it, based on their taste profile and ranking history. The tiers are LOVED, LIKED, OKAY, DISLIKED.

${buildNoRegurgitationBlock("single")}

${buildVoiceRulesBlock("single")}

SHOW THEY JUST SAW:
${showBlockLines.join("\n")}

READER PROFILE:
${preferencesBlock}

RANKING HISTORY:
${historyBlock}${lovedDescriptionsBlock}${dislikedDescriptionsBlock}

Output ONLY a JSON object (no markdown, no code fences) matching one of these shapes:

SUCCESS:
{
  "kind": "ok",
  "tier": "loved" | "liked" | "okay" | "disliked",
  "reasoning": "<ONE complete, tight sentence naming the single taste hit or miss that drove the tier. No 'because', no 'given that', no plot summary, no filler. Address the reader as 'you' if needed; NEVER third person. Good example: 'Sharp character work and tight pacing — a clean match.' Bad example: 'This will probably be great for you because it has many qualities that, based on your ranking history, seem to line up quite well with what you usually enjoy.'>"
}

INSUFFICIENT-CONTEXT (use ONLY when you genuinely cannot predict — e.g. no ranking history AND no description on an ambiguous title):
{
  "kind": "insufficient_context",
  "reason": "<one short sentence from the engine's perspective. Do NOT frame as a risk to the reader.>"
}`;

    const jsonText = await callClaude(prompt, 400, apiKey, "suggestedTier");
    const parsed = JSON.parse(jsonText) as {
      kind?: string;
      tier?: string;
      reasoning?: string;
      reason?: string;
    };

    if (parsed.kind === "insufficient_context") {
      return {
        kind: "insufficient_context",
        reason:
          typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason
            : "Not enough signal to suggest a tier yet.",
      };
    }

    const tier = parsed.tier as TierKey | undefined;
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "";
    if (
      tier !== "loved" &&
      tier !== "liked" &&
      tier !== "okay" &&
      tier !== "disliked"
    ) {
      return {
        kind: "insufficient_context",
        reason: "Model returned an invalid tier.",
      };
    }

    return { kind: "ok", tier, reasoning };
  },
});

// ---------------------------------------------------------------------------
// Action 2: predict position within tier
// ---------------------------------------------------------------------------

export type SuggestedPositionResult =
  | {
      kind: "ok";
      tier: TierKey;
      relativeIndex: number;
      tierLength: number;
      reasoning: string;
    }
  | { kind: "insufficient_context"; reason: string };

export const predictSuggestedPosition = action({
  args: {
    showId: v.id("shows"),
    tier: v.union(
      v.literal("loved"),
      v.literal("liked"),
      v.literal("okay"),
      v.literal("disliked"),
    ),
  },
  handler: async (ctx, args): Promise<SuggestedPositionResult> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("AI recommendations are not configured yet");

    await ctx.runAction(internal.recommendations.ensureShowDescription, {
      showId: args.showId,
    });

    const data = await ctx.runQuery(
      internal.suggestedRanking.gatherSuggestedPositionContext,
      { showId: args.showId, tier: args.tier },
    );
    if (!data.show) throw new Error("Show not found");

    const tierLength = data.tierShows.length;

    // Empty tier → only one valid position, no need to burn a model call.
    if (tierLength === 0) {
      return {
        kind: "ok",
        tier: args.tier,
        relativeIndex: 0,
        tierLength: 0,
        reasoning: "",
      };
    }

    // Cap the list. For very long tiers we keep the top half and bottom few
    // so the model still sees both extremes, but this is rare in practice.
    let listedShows = data.tierShows;
    let listNote = "";
    if (tierLength > MAX_TIER_SHOWS) {
      const headCount = Math.floor(MAX_TIER_SHOWS * 0.6);
      const tailCount = MAX_TIER_SHOWS - headCount;
      listedShows = [
        ...data.tierShows.slice(0, headCount),
        ...data.tierShows.slice(tierLength - tailCount),
      ];
      listNote = `\n(Showing ${listedShows.length} of ${tierLength} — top ${headCount} and bottom ${tailCount}. Positions are from the full ordered list.)`;
    }

    const lines = listedShows.map((s, i) => {
      const actualIndex = i < listedShows.length / 2 || tierLength <= MAX_TIER_SHOWS
        ? i
        : tierLength - (listedShows.length - i);
      const desc = truncateForPrompt(s.description);
      const head = `${actualIndex + 1}. ${s.name} (${s.type})`;
      return desc ? `${head}\n   ${desc}` : head;
    });

    const preferencesBlock = buildPreferencesBlock(data.preferences);
    const candidateDescription = truncateForPrompt(data.show.description);
    const showDescriptionBlock = candidateDescription
      ? `- Description: ${candidateDescription}`
      : null;
    const showBlockLines = [
      `- Name: ${data.show.name}`,
      `- Type: ${data.show.type}`,
      showDescriptionBlock,
    ].filter((l): l is string => l !== null);

    const prompt = `You are slotting a newly-seen show into its position within an existing tier. The reader has already decided this show belongs in their ${args.tier.toUpperCase()} tier; you decide WHERE in that tier it lands versus shows already there.

${buildNoRegurgitationBlock("list")}

${buildVoiceRulesBlock("list")}

POSITION OUTPUT:
- "relativeIndex" is 0 for best in tier, ${tierLength} for bottom of tier (below every existing show).
- Any integer in the inclusive range 0..${tierLength} is valid.

SHOW TO PLACE:
${showBlockLines.join("\n")}

READER PROFILE:
${preferencesBlock}

EXISTING ${args.tier.toUpperCase()} SHOWS (ordered best \u2192 worst, position 1 = top):${listNote}
${lines.join("\n")}

Output ONLY a JSON object (no markdown, no code fences) matching one of these shapes:

SUCCESS:
{
  "kind": "ok",
  "relativeIndex": <integer 0..${tierLength}>,
  "reasoning": "<ONE complete, tight sentence. Structure: name the neighbor show(s) by exact title, then ONE taste reason. No 'because', no filler, no plot summary. Address the reader as 'you' if needed; NEVER third person. Good example: 'Slots between Hadestown and The Outsiders — same character-driven energy, slightly less punch.' Bad example: 'I think this show fits just below Hadestown because it shares many of the same character-driven qualities that you seem to really appreciate in your higher-ranked picks.'>"
}

INSUFFICIENT-CONTEXT (use ONLY when nothing in the existing tier gives you a meaningful comparison):
{
  "kind": "insufficient_context",
  "reason": "<one short sentence from the engine's perspective. Do NOT frame as a risk to the reader.>"
}`;

    const jsonText = await callClaude(prompt, 500, apiKey, "suggestedPosition");
    const parsed = JSON.parse(jsonText) as {
      kind?: string;
      relativeIndex?: number;
      reasoning?: string;
      reason?: string;
    };

    if (parsed.kind === "insufficient_context") {
      return {
        kind: "insufficient_context",
        reason:
          typeof parsed.reason === "string" && parsed.reason.trim().length > 0
            ? parsed.reason
            : "Not enough signal to suggest a position yet.",
      };
    }

    const raw = typeof parsed.relativeIndex === "number" ? parsed.relativeIndex : Number.NaN;
    if (!Number.isFinite(raw)) {
      return {
        kind: "insufficient_context",
        reason: "Model returned an invalid position.",
      };
    }
    const clamped = Math.min(Math.max(0, Math.round(raw)), tierLength);

    return {
      kind: "ok",
      tier: args.tier,
      relativeIndex: clamped,
      tierLength,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "",
    };
  },
});
