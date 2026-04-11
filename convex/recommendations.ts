import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireConvexUserId } from "./auth";

const RATING_LABELS: Record<number, string> = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

export const getShowRecommendation = action({
  args: { showId: v.id("shows") },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("AI recommendations are not configured yet");

    const data = await ctx.runQuery(
      internal.recommendationsContext.gatherRecommendationContext,
      { showId: args.showId }
    );

    if (!data.show) throw new Error("Show not found");

    let preferencesBlock: string;
    if (data.preferences && data.preferences.length > 0) {
      const lines = data.preferences.map(
        (p: { element: string; rating: number }) =>
          `- "${p.element} is important to me": ${RATING_LABELS[p.rating] ?? p.rating} (${p.rating}/5)`
      );
      preferencesBlock = `The user's theatre element preferences:\n${lines.join("\n")}`;
    } else {
      preferencesBlock = "The user has not set any theatre preferences yet. Make a general assessment.";
    }

    const { ranked } = data;
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

    const prompt = `You are a personalized theatre recommendation assistant. Based on a user's stated preferences and full show history, predict whether they would enjoy a specific show.

SHOW TO EVALUATE:
- Name: ${data.show.name}
- Type: ${data.show.type}

USER PROFILE:
${preferencesBlock}

FULL SHOW RANKINGS (every show they have placed in a tier — use ALL of this; dislikes are as important as loves for avoiding similar work):
${showHistoryBlock}

Based on this information, assess how likely this user is to enjoy "${data.show.name}". If the show is likely similar to ones they DISLIKED (genre, tone, style, spectacle level, etc.), weigh that heavily. If it aligns with LOVED/LIKED patterns, say so.

Respond with ONLY a valid JSON object (no markdown, no code fences) with these fields:
- "score": integer 1-5 (1=probably won't enjoy, 3=could go either way, 5=almost certainly will love it)
- "headline": a short punchy 3-8 word headline like "Right up your alley" or "Not your usual pick"
- "reasoning": 2-3 sentences explaining why, referencing their specific preferences and show history where possible
- "matchedElements": array of element names from their preferences that align well with this show (can be empty)
- "mismatchedElements": array of element names that might not align (can be empty)`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
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
      score: number;
      headline: string;
      reasoning: string;
      matchedElements: string[];
      mismatchedElements: string[];
    };

    // Persist to history if the user is authenticated
    if (data.userId) {
      await ctx.runMutation(internal.recommendations.saveRecommendation, {
        userId: data.userId,
        showId: args.showId,
        showNameSnapshot: data.show.name,
        ...parsed,
      });
    }

    return parsed;
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
