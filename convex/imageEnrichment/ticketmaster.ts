import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  scoreNameMatch,
  isAcceptableMatch,
  pickBestTicketmasterImage,
  type TicketmasterImage,
} from "./nameMatch";

const BATCH_SIZE = 25;
const DELAY_MS = 220; // Stay under 5 req/s TM rate limit

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type TmEvent = {
  id: string;
  name: string;
  url: string;
  images: TicketmasterImage[];
  _embedded?: {
    venues?: { name: string; city?: { name: string } }[];
    attractions?: { name: string; id: string }[];
  };
};

type TmSearchResponse = {
  _embedded?: { events?: TmEvent[] };
  page?: { totalElements: number };
};

async function searchTicketmaster(
  apiKey: string,
  showName: string
): Promise<TmEvent[]> {
  const params = new URLSearchParams({
    apikey: apiKey,
    classificationName: "Theatre",
    city: "New York",
    countryCode: "US",
    keyword: showName,
    size: "10",
  });
  const res = await fetch(
    `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`
  );
  if (!res.ok) return [];
  const data = (await res.json()) as TmSearchResponse;
  return data._embedded?.events ?? [];
}

/**
 * Find the best TM event match for a show name, score it, and return the
 * image URL + event metadata, or null if nothing is good enough.
 */
function bestEventMatch(
  events: TmEvent[],
  showName: string
): {
  imageUrl: string;
  eventId: string;
  eventUrl: string;
  attractionId: string | undefined;
} | null {
  let bestScore = 0;
  let bestEvent: TmEvent | null = null;

  for (const event of events) {
    const eventScore = scoreNameMatch(showName, event.name);
    // Also check attraction name which is often cleaner
    const attractionName = event._embedded?.attractions?.[0]?.name;
    const attractionScore = attractionName
      ? scoreNameMatch(showName, attractionName)
      : 0;
    const score = Math.max(eventScore, attractionScore);
    if (score > bestScore) {
      bestScore = score;
      bestEvent = event;
    }
  }

  if (!bestEvent || !isAcceptableMatch(bestScore)) return null;

  const img = pickBestTicketmasterImage(bestEvent.images);
  if (!img) return null;

  return {
    imageUrl: img.url,
    eventId: bestEvent.id,
    eventUrl: bestEvent.url,
    attractionId: bestEvent._embedded?.attractions?.[0]?.id,
  };
}

// ─── Chunked enrichment action (NYC productions) ────────────────────────────

export const enrichProductionImages = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error("TICKETMASTER_API_KEY not set — skipping TM enrichment");
      return;
    }

    const batch = await ctx.runQuery(
      internal.imageEnrichment.queries.productionsNeedingImages,
      { limit: BATCH_SIZE, cursor: args.cursor ?? undefined }
    );

    let enriched = 0;
    let failed = 0;

    for (const item of batch.productions) {
      const events = await searchTicketmaster(apiKey, item.showName);
      const match = bestEventMatch(events, item.showName);

      if (match) {
        await ctx.runMutation(
          internal.imageEnrichment.mutations.setProductionHotlinkImage,
          {
            productionId: item.productionId,
            hotlinkPosterUrl: match.imageUrl,
            ticketmasterEventId: match.eventId,
            ticketmasterEventUrl: match.eventUrl,
          }
        );
        // Optionally backfill the parent show if it has no image yet.
        if (!item.showHasImage) {
          await ctx.runMutation(
            internal.imageEnrichment.mutations.setShowHotlinkImage,
            {
              showId: item.showId,
              hotlinkImageUrl: match.imageUrl,
              hotlinkImageSource: "ticketmaster",
              ticketmasterAttractionId: match.attractionId,
            }
          );
        }
        enriched++;
      } else {
        console.log(
          `Ticketmaster: no match for "${item.showName}" (production ${item.productionId})`
        );
        failed++;
      }
      await sleep(DELAY_MS);
    }

    console.log(
      `TM enrichment batch: ${enriched} enriched, ${failed} failed, ${batch.productions.length} processed`
    );

    if (batch.hasMore && batch.nextCursor) {
      await ctx.scheduler.runAfter(
        2000,
        internal.imageEnrichment.ticketmaster.enrichProductionImages,
        { cursor: batch.nextCursor }
      );
    }
  },
});

/**
 * Enrich a single production with a Ticketmaster image.
 * Suitable for scheduling from bot ingestion.
 */
export const enrichProductionTicketmaster = internalAction({
  args: {
    productionId: v.id("productions"),
    showId: v.id("shows"),
    showName: v.string(),
    showHasImage: v.boolean(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) return;

    const events = await searchTicketmaster(apiKey, args.showName);
    const match = bestEventMatch(events, args.showName);
    if (!match) return;

    await ctx.runMutation(
      internal.imageEnrichment.mutations.setProductionHotlinkImage,
      {
        productionId: args.productionId,
        hotlinkPosterUrl: match.imageUrl,
        ticketmasterEventId: match.eventId,
        ticketmasterEventUrl: match.eventUrl,
      }
    );

    if (!args.showHasImage) {
      await ctx.runMutation(
        internal.imageEnrichment.mutations.setShowHotlinkImage,
        {
          showId: args.showId,
          hotlinkImageUrl: match.imageUrl,
          hotlinkImageSource: "ticketmaster",
          ticketmasterAttractionId: match.attractionId,
        }
      );
    }
  },
});
