import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./authFactory";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

// ─── Bot ingestion endpoint ───────────────────────────────────────────────────
// Called by the Mac Mini news bot every time it parses a new production article.
// Secured with a shared secret set via: npx convex env set BOT_SECRET <value>

http.route({
  path: "/bot/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${process.env.BOT_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    try {
      await ctx.runMutation(internal.botIngestion.ingestProduction, body as never);
    } catch (err) {
      console.error("botIngestion.ingestProduction failed:", err);
      return new Response("Internal error", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  }),
});

// ─── Bot activity endpoint (for OpenClaw morning summary) ─────────────────────
// GET /bot/activity?since=<ISO timestamp or epoch ms>
// Authorization: Bearer {BOT_SECRET}

http.route({
  path: "/bot/activity",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${process.env.BOT_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const sinceParam = url.searchParams.get("since");
    let since: number;

    if (!sinceParam) {
      // Default: last 24 hours
      since = Date.now() - 24 * 60 * 60 * 1000;
    } else if (/^\d+$/.test(sinceParam)) {
      since = parseInt(sinceParam, 10);
    } else {
      since = new Date(sinceParam).getTime();
      if (isNaN(since)) {
        return new Response("Invalid 'since' parameter", { status: 400 });
      }
    }

    const rows = await ctx.runQuery(
      internal.botIngestion.listBotActivitySince,
      { since }
    );

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ─── Playbill enrichment endpoints ───────────────────────────────────────────
// Called by the GitHub Actions scraping pipeline.
// Secured with a shared secret: npx convex env set PLAYBILL_SECRET <value>

/**
 * GET /playbill/enrich-queue
 * Returns the list of productions with a playbillProductionId that are still
 * missing enrichable fields. The scraping script uses this to build its work
 * list without needing full DB access.
 */
http.route({
  path: "/playbill/enrich-queue",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${process.env.PLAYBILL_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const rows = await ctx.runQuery(
      internal.playbill.getProductionsNeedingEnrichment,
      {}
    );

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * POST /playbill/findings
 * Accepts an array of scraped findings and stages them as pending reviewQueue
 * entries. Idempotent — safe to call multiple times with the same data.
 *
 * Body: { findings: Array<{ entityType, entityId, field, value }> }
 * Response: { created: number, skipped: number }
 */
http.route({
  path: "/playbill/findings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${process.env.PLAYBILL_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: { findings: unknown };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!Array.isArray(body?.findings)) {
      return new Response('Body must be { "findings": [...] }', { status: 400 });
    }

    try {
      const result = await ctx.runMutation(
        internal.playbill.submitFindings,
        { findings: body.findings } as never
      );
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("playbill.submitFindings failed:", err);
      return new Response("Internal error", { status: 500 });
    }
  }),
});

// ─── Weekly showtimes sync endpoint ──────────────────────────────────────────
// Called by the weekly-showtimes GitHub Action after scraping Playbill.
// Secured with a shared secret: npx convex env set SHOWTIMES_SYNC_SECRET <value>

/**
 * POST /showtimes/sync
 * Body: { weekOf: string, shows: Array<{ title, schedule: { mon..sun: string[] } }> }
 * Response: { weekOf, matched: string[], unmatched: string[] }
 */
http.route({
  path: "/showtimes/sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = request.headers.get("Authorization");
    const token = auth?.replace(/^Bearer\s+/i, "").trim();
    const allowedTokens = [
      process.env.SHOWTIMES_SYNC_SECRET,
      // Temporary fallback so existing infra can still sync even if
      // SHOWTIMES_SYNC_SECRET is mismatched across deployments.
      process.env.PLAYBILL_SECRET,
      process.env.BOT_SECRET,
    ]
      .filter((v): v is string => Boolean(v))
      .map((v) => v.trim());
    if (!token || !allowedTokens.includes(token)) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const payload = body as { weekOf?: string; shows?: unknown[] };
    if (typeof payload?.weekOf !== "string" || !Array.isArray(payload?.shows)) {
      return new Response('Body must be { "weekOf": "...", "shows": [...] }', { status: 400 });
    }

    try {
      const result = await ctx.runMutation(
        internal.showtimes.syncWeeklyShowtimes,
        { weekOf: payload.weekOf, shows: payload.shows } as never
      );
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("showtimes.syncWeeklyShowtimes failed:", err);
      return new Response("Internal error", { status: 500 });
    }
  }),
});

export default http;
