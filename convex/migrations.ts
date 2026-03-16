import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { ensureDefaultSystemLists, getEligibleUncategorizedShowIds } from "./listRules";

export const backfillIssue11UserLists = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const uncategorizedSeedShowIds = await getEligibleUncategorizedShowIds(ctx);
    const users = await ctx.db.query("users").collect();
    const clampedLimit = args.limit
      ? Math.max(0, Math.min(args.limit, users.length))
      : users.length;
    const selectedUsers = users.slice(0, clampedLimit);

    for (const user of selectedUsers) {
      await ensureDefaultSystemLists(ctx, user._id, uncategorizedSeedShowIds);
    }

    return {
      totalUsers: users.length,
      processedUsers: selectedUsers.length,
      seededShowCount: uncategorizedSeedShowIds.length,
    };
  },
});
