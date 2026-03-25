import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export type District =
  | "broadway"
  | "off_broadway"
  | "off_off_broadway"
  | "west_end"
  | "touring"
  | "regional"
  | "other";

export type ProductionType =
  | "original"
  | "revival"
  | "transfer"
  | "touring"
  | "concert"
  | "workshop"
  | "other";

export type ShowType = "musical" | "play" | "opera" | "dance" | "other";

export type EventType =
  | "new_announcement"
  | "date_change"
  | "closing_notice"
  | "casting"
  | "other";

export type ParsedProduction = {
  show_name: string;
  show_type: ShowType;
  district: District;
  production_type: ProductionType;
  theatre: string | null;
  city: string | null;
  preview_date: string | null;   // YYYY-MM-DD or null
  opening_date: string | null;   // YYYY-MM-DD or null
  closing_date: string | null;   // YYYY-MM-DD or null
  event_type: EventType;
  confidence: number;            // 0–1
  summary: string;               // one-sentence push notification body
};

const SYSTEM_PROMPT = `You are a theatre database assistant. Extract structured production data from the given news article.

Return a single JSON object with these fields:
- show_name: the show's title (string)
- show_type: one of "musical", "play", "opera", "dance", "other"
- district: one of "broadway", "off_broadway", "off_off_broadway", "west_end", "touring", "regional", "other"
- production_type: one of "original", "revival", "transfer", "touring", "concert", "workshop", "other"
- theatre: venue name or null
- city: city name or null
- preview_date: ISO date YYYY-MM-DD or null
- opening_date: ISO date YYYY-MM-DD or null
- closing_date: ISO date YYYY-MM-DD or null
- event_type: one of "new_announcement", "date_change", "closing_notice", "casting", "other"
- confidence: a number 0–1 (0.9+ if dates and venue are explicit; 0.5–0.9 if inferred; <0.5 if uncertain)
- summary: one sentence suitable as a push notification body (e.g. "Hamilton announces a new Broadway revival opening March 2026.")

Rules:
- Use null for any field not mentioned in the article.
- event_type "new_announcement": brand new production being announced for the first time.
- event_type "date_change": an existing production's preview/opening/closing date has changed.
- event_type "closing_notice": a closing date was just announced or confirmed.
- event_type "casting": only about casting, no production-level news.
- event_type "other": anything else (awards, reviews, etc.).
- Only return the JSON object, no other text.`;

export async function parseArticle(
  title: string,
  content: string,
): Promise<ParsedProduction | null> {
  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Title: ${title}\n\nContent: ${content}`,
        },
      ],
    });

    const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.warn("No JSON found in Claude response:", text.slice(0, 200));
      return null;
    }

    return JSON.parse(match[0]) as ParsedProduction;
  } catch (err) {
    console.error("Claude parse error:", err);
    return null;
  }
}
