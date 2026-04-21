/**
 * Shared prompt fragments for the recommendation engines
 * (single-show "would I like this", find-a-show, help-me-decide).
 *
 * Keep tone/voice rules here so a single tweak lands everywhere.
 */

type Context = "single" | "list";

const BASE_OUTPUT_RULES: ReadonlyArray<string> = [
  `Show titles are proper nouns — quote them verbatim. Do NOT add, drop, or translate articles. Never say things like "the Hamilton" — use only the exact title given.`,
  `Do NOT interpret a title's words literally (e.g. "The Unknown" is not "about the unknown" — it's a specific show with that name). Use the provided description for subject matter only.`,
  `Do NOT mention closing date, open-run status, running status, show type, or poster — those are displayed separately in the UI.`,
  `Do NOT mention missing descriptions, context gaps, data availability, or "we don't know much" in user-facing text. If you genuinely cannot produce a quality response, return the insufficient_context shape described below.`,
];

export function buildOutputRulesBlock(extraRules: ReadonlyArray<string> = []): string {
  const rules = [...BASE_OUTPUT_RULES, ...extraRules];
  return [
    "OUTPUT RULES (follow strictly):",
    ...rules.map((rule, i) => `${i + 1}. ${rule}`),
  ].join("\n");
}

export function buildNoRegurgitationBlock(context: Context): string {
  const lead =
    context === "single"
      ? "The show's description is already displayed on the show page directly above your recommendation."
      : "Users can read each candidate's full description on its show page.";

  const jobTail =
    context === "single"
      ? "ANALYSIS"
      : "ANALYSIS and cross-candidate comparison";

  return [
    "CRITICAL — NO PLOT REGURGITATION:",
    `${lead} Do NOT summarize, paraphrase, or repeat the plot, setting, characters, or log-line back to the reader. Your job is taste-match ${jobTail}, not synopsis. Use the description internally to understand what the show IS; then write about the TASTE ANGLE — what qualities the show has and how they intersect with the reader's stated preferences or inferred patterns. If your output reads like a plot summary, rewrite it.`,
  ].join("\n");
}

export function buildVoiceRulesBlock(context: Context): string {
  const showWord = context === "single" ? "SHOW" : "SHOWS";
  return [
    "VOICE RULES (follow strictly):",
    `- You are writing directly TO the reader. When you need to refer to them, always use "you" / "your". NEVER use third person — banned phrasings include "the user", "this user", "the viewer", "this viewer", "someone who loves X", "they", "them".`,
    `- Keep the subject the ${showWord}, not the reader. Describe the show's qualities rather than narrating the reader's taste history. Saying "you" is fine when needed; narrating what "you usually love", "you gravitate toward", "you typically enjoy", "scores you love", or similar is NOT. Prefer "Sharp writing and a tight runtime" over "Scores you usually love".`,
    `- Be concise and concrete. No filler phrases: "suitable for your taste", "right up your alley", "like your favorites", "as you know you love", "perfect for you", "you typically enjoy", "you'll probably love", "in your wheelhouse", or similar.`,
    `- You MAY cite ONE title from the reader's LOVED, LIKED, or DISLIKED list in parentheses as a concrete anchor for a taste claim about the show, e.g. "Sharp, character-driven storytelling (Hadestown)" for a positive anchor or "Leans on the same sprawling-epic structure that didn't land for you (Les Misérables)" for a warning anchor. At most one parenthetical anchor per pick, and only when it sharpens an otherwise-vague claim.`,
    `- Headline names the TASTE-MATCH angle, NOT the show's plot or setting. Good: "Hits your character-driven sweet spot" / "Stretches your usual range". Bad: "A timely family drama" / "Ambitious new pop musical".`,
  ].join("\n");
}
