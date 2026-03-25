import cron from "node-cron";
import { FEEDS, fetchFeedItems } from "./sources.js";
import { parseArticle } from "./parser.js";
import { hasSeen, markSeen } from "./db.js";
import { ingestProduction } from "./convex.js";

const MIN_CONFIDENCE = 0.6;

// Set to true to skip the Convex POST and only log what would be sent.
const DRY_RUN = process.env.DRY_RUN === "true";

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function poll(): Promise<void> {
  log("Polling feeds...");

  for (const feed of FEEDS) {
    let items;
    try {
      items = await fetchFeedItems(feed);
    } catch (err) {
      console.error(`Failed to fetch feed ${feed.label}:`, err);
      continue;
    }

    for (const item of items) {
      if (!item.url) continue;
      if (hasSeen(item.url)) continue;

      // Mark seen immediately so a crash mid-parse doesn't requeue it.
      markSeen(item.url);

      let parsed;
      try {
        parsed = await parseArticle(item.title, item.content);
      } catch (err) {
        console.error(`Parse error for "${item.title}":`, err);
        continue;
      }

      if (!parsed) {
        log(`Skip (no parse): ${item.title}`);
        continue;
      }

      if (parsed.confidence < MIN_CONFIDENCE) {
        log(`Skip (low confidence ${parsed.confidence.toFixed(2)}): ${item.title}`);
        continue;
      }

      if (parsed.event_type === "casting" || parsed.event_type === "other") {
        log(`Skip (${parsed.event_type}): ${item.title}`);
        continue;
      }

      log(`[${parsed.event_type}] ${parsed.show_name} (${parsed.district}) conf=${parsed.confidence.toFixed(2)}`);

      if (DRY_RUN) {
        log(`DRY RUN — would ingest: ${JSON.stringify(parsed, null, 2)}`);
        continue;
      }

      try {
        await ingestProduction(parsed, item.url);
        log(`Ingested: ${parsed.show_name}`);
      } catch (err) {
        console.error(`Ingest failed for "${parsed.show_name}":`, err);
      }
    }
  }

  log("Poll complete.");
}

// Run immediately on startup, then every 3 hours.
poll().catch(console.error);
cron.schedule("0 */3 * * *", () => {
  poll().catch(console.error);
});

log(`Theatre news bot started (DRY_RUN=${DRY_RUN}). Polling every 3 hours.`);
