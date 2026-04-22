import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { requireConvexUserId } from "../auth";

// Admin review surface for user-filed reports (Apple 1.2 UGC safety).
//
// SECURITY NOTE: These endpoints are not yet scoped to an admin Convex
// identity. They are intended to be consumed by the internal
// `website/src/app/admin/reports` route which is protected by site-level
// auth. Mirror the pattern used by `convex/admin/catalogUserFeedback.ts`.

const statusValidator = v.union(
  v.literal("open"),
  v.literal("reviewed"),
  v.literal("actioned"),
  v.literal("dismissed")
);

type EnrichedReport = {
  _id: Doc<"userReports">["_id"];
  createdAt: number;
  status: Doc<"userReports">["status"];
  reason: Doc<"userReports">["reason"];
  targetKind: Doc<"userReports">["targetKind"];
  details: string | null;
  contentSnapshot: string | null;
  reviewedAt: number | null;
  reviewerNote: string | null;

  reporter: {
    _id: Doc<"users">["_id"];
    username: string | null;
    name: string | null;
    email: string | null;
  } | null;
  target: {
    _id: Doc<"users">["_id"];
    username: string | null;
    name: string | null;
    email: string | null;
  } | null;
  targetPostId: Doc<"userReports">["targetPostId"] | null;
  targetVisitId: Doc<"userReports">["targetVisitId"] | null;
  postPreview: {
    notes: string | null;
    theatre: string | null;
    city: string | null;
  } | null;
  visitPreview: {
    notes: string | null;
    theatre: string | null;
    city: string | null;
  } | null;
};

async function enrichReports(
  ctx: any,
  rows: Doc<"userReports">[]
): Promise<EnrichedReport[]> {
  return await Promise.all(
    rows.map(async (report) => {
      const [reporter, target, post, visit] = await Promise.all([
        ctx.db.get(report.reporterUserId),
        ctx.db.get(report.targetUserId),
        report.targetPostId
          ? ctx.db.get(report.targetPostId)
          : Promise.resolve(null),
        report.targetVisitId
          ? ctx.db.get(report.targetVisitId)
          : Promise.resolve(null),
      ]);

      return {
        _id: report._id,
        createdAt: report.createdAt,
        status: report.status,
        reason: report.reason,
        targetKind: report.targetKind,
        details: report.details ?? null,
        contentSnapshot: report.contentSnapshot ?? null,
        reviewedAt: report.reviewedAt ?? null,
        reviewerNote: report.reviewerNote ?? null,
        reporter: reporter
          ? {
              _id: reporter._id,
              username: reporter.username ?? null,
              name: reporter.name ?? null,
              email: reporter.email ?? null,
            }
          : null,
        target: target
          ? {
              _id: target._id,
              username: target.username ?? null,
              name: target.name ?? null,
              email: target.email ?? null,
            }
          : null,
        targetPostId: report.targetPostId ?? null,
        targetVisitId: report.targetVisitId ?? null,
        postPreview: post
          ? {
              notes: post.notes ?? null,
              theatre: post.theatre ?? null,
              city: post.city ?? null,
            }
          : null,
        visitPreview: visit
          ? {
              notes: visit.notes ?? null,
              theatre: visit.theatre ?? null,
              city: visit.city ?? null,
            }
          : null,
      };
    })
  );
}

/**
 * List reports for admin review. Defaults to open reports, newest first.
 * Pass an explicit status to filter; omit to default to "open".
 */
export const listForAdmin = query({
  args: {
    status: v.optional(statusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    const status = args.status ?? "open";

    const rows = await ctx.db
      .query("userReports")
      .withIndex("by_status_createdAt", (q) => q.eq("status", status))
      .order("desc")
      .take(limit);

    return await enrichReports(ctx, rows);
  },
});

/**
 * Counts of open reports — drives the admin sidebar badge.
 */
export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    const [open, reviewed, actioned, dismissed] = await Promise.all([
      ctx.db
        .query("userReports")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "open"))
        .collect(),
      ctx.db
        .query("userReports")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "reviewed"))
        .collect(),
      ctx.db
        .query("userReports")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "actioned"))
        .collect(),
      ctx.db
        .query("userReports")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "dismissed"))
        .collect(),
    ]);
    return {
      open: open.length,
      reviewed: reviewed.length,
      actioned: actioned.length,
      dismissed: dismissed.length,
    };
  },
});

/**
 * Resolve a report. Admin sets one of the terminal statuses and may add a
 * short note. The reporter and reported user are never notified here; any
 * downstream action (warning, ban) is handled separately.
 */
export const resolveReport = mutation({
  args: {
    reportId: v.id("userReports"),
    status: v.union(
      v.literal("reviewed"),
      v.literal("actioned"),
      v.literal("dismissed")
    ),
    reviewerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireConvexUserId(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    const trimmedNote = args.reviewerNote?.trim();
    await ctx.db.patch(args.reportId, {
      status: args.status,
      reviewedAt: Date.now(),
      reviewerNote:
        trimmedNote && trimmedNote.length > 0 ? trimmedNote : undefined,
    });

    return { ok: true };
  },
});
