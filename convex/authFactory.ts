import { expo } from "@better-auth/expo";
import {
  type AuthFunctions,
  createClient,
  type GenericCtx,
} from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import type { GenericMutationCtx } from "convex/server";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import {
  ensureDefaultSystemLists,
  getEligibleUncategorizedShowIds,
} from "./listRules";

const authFunctions: AuthFunctions = internal.auth;

async function generateUniqueUsername(
  ctx: GenericMutationCtx<DataModel>,
  baseUsername: string
): Promise<string> {
  const sanitized = baseUsername
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .substring(0, 20);

  let candidate = sanitized || `user_${Date.now()}`.substring(0, 20);
  let suffix = 1;

  while (suffix < 100) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", candidate))
      .first();

    if (!existing) return candidate;

    suffix++;
    const maxBaseLen = 20 - String(suffix).length - 1;
    const truncatedBase = sanitized.substring(0, maxBaseLen);
    candidate = `${truncatedBase}_${suffix}`;
  }

  return `user_${Date.now()}`.substring(0, 20);
}

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, doc) => {
        const betterAuthUserId = doc._id;
        const email = doc.email || "";
        const hasRealName = doc.name && !doc.name.includes("@");
        const displayName = hasRealName ? doc.name : undefined;
        const rawName = displayName || email.split("@")[0] || `user_${Date.now()}`;

        if (!email) return;

        const existingUser = await ctx.db
          .query("users")
          .withIndex("by_betterAuthUserId", (q) =>
            q.eq("betterAuthUserId", betterAuthUserId)
          )
          .first();

        if (existingUser) return;

        const username = await generateUniqueUsername(ctx, rawName);
        const now = Date.now();

        const userId = await ctx.db.insert("users", {
          email: email.toLowerCase(),
          name: displayName,
          username,
          betterAuthUserId: betterAuthUserId,
          createdAt: now,
          updatedAt: now,
        });

        // Create an empty rankings document for the new user
        await ctx.db.insert("userRankings", {
          userId,
          showIds: [],
        });

        const uncategorizedSeedShowIds = await getEligibleUncategorizedShowIds(ctx);
        await ensureDefaultSystemLists(ctx, userId, uncategorizedSeedShowIds);
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

const getSiteUrl = () => {
  const url = process.env.CONVEX_SITE_URL || process.env.SITE_URL;
  if (!url) throw new Error("CONVEX_SITE_URL or SITE_URL is not set");
  return url;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = getSiteUrl();
  const nativeAppUrl = process.env.NATIVE_APP_URL || "theatrediary://";

  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [
      siteUrl,
      nativeAppUrl,
      "http://localhost:*",
      "https://*",
      "https://appleid.apple.com",
      "*",
    ],
    database: authComponent.adapter(ctx),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: false },
    plugins: [expo(), convex({ authConfig })],
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET && {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }),
      ...(process.env.APPLE_CLIENT_ID &&
        process.env.APPLE_CLIENT_SECRET && {
          apple: {
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET,
            appBundleIdentifier:
              process.env.APPLE_APP_BUNDLE_ID || "com.theatrediary.app",
          },
        }),
    },
  });
};
