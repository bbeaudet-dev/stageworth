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

export default http;
