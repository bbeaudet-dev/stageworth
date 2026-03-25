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

export default http;
