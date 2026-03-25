import type { ParsedProduction } from "./parser.js";

const CONVEX_BOT_URL = process.env.CONVEX_BOT_URL;
const BOT_SECRET = process.env.BOT_SECRET;

export async function ingestProduction(
  production: ParsedProduction,
  sourceUrl: string,
): Promise<void> {
  if (!CONVEX_BOT_URL || !BOT_SECRET) {
    throw new Error("CONVEX_BOT_URL and BOT_SECRET must be set in environment");
  }

  const res = await fetch(CONVEX_BOT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BOT_SECRET}`,
    },
    body: JSON.stringify({ production, sourceUrl }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex ingest failed [${res.status}]: ${text}`);
  }
}
