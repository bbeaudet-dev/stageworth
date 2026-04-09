/**
 * Playbill data enrichment — Convex backend.
 *
 * Provides two operations consumed by the GitHub Actions pipeline:
 *
 *   GET  /playbill/enrich-queue   → list of productions that have a
 *                                   playbillProductionId but are missing
 *                                   one or more enrichable fields.
 *
 *   POST /playbill/findings       → idempotently stage scraped values as
 *                                   pending reviewQueue entries.
 *
 * The scraping itself lives in scripts/fetchPlaybillShowData.mjs and runs
 * in a GitHub Actions workflow. Nothing here makes external HTTP calls.
 *
 * Event-driven enrichment (triggering on show/production creation) will be
 * wired in a future phase once the scraping script is stable.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ─── Validators ───────────────────────────────────────────────────────────────

const findingValidator = v.object({
  entityType: v.union(v.literal("show"), v.literal("production")),
  /** Convex document ID as a plain string. */
  entityId: v.string(),
  /** Field name matching schema — e.g. "runningTime", "openingDate". */
  field: v.string(),
  /**
   * String representation of the scraped value.
   * Numbers are passed as e.g. "150"; the approval flow in reviewQueue.ts
   * converts them back via NUMERIC_FIELDS before writing to the DB.
   */
  value: v.string(),
});

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns productions that have a playbillProductionId set and are missing
 * at least one enrichable field. Used by the GitHub Actions scraping script
 * to build its work list without downloading the whole DB.
 *
 * "Missing" means:
 *   - Show fields: undefined/null on the show doc.
 *   - Production date fields: undefined/null AND no approved reviewQueue entry
 *     for that field already exists (avoids re-proposing data we already have
 *     queued for review).
 */
export const getProductionsNeedingEnrichment = internalQuery({
  args: {},
  handler: async (ctx) => {
    const productions = await ctx.db.query("productions").collect();

    const rows: Array<{
      productionId: string;
      playbillProductionId: string;
      showId: string;
      showName: string;
      missingProductionFields: string[];
    }> = [];

    for (const production of productions) {
      if (!production.playbillProductionId) continue;

      const show = await ctx.db.get(production.showId);
      if (!show) continue;

      // All enrichable fields are production-level.
      const missingProductionFields: string[] = [];
      if (production.runningTime === undefined || production.runningTime === null)
        missingProductionFields.push("runningTime");
      if (production.intermissionCount === undefined || production.intermissionCount === null)
        missingProductionFields.push("intermissionCount");
      if (!production.description) missingProductionFields.push("description");
      if (!production.previewDate) missingProductionFields.push("previewDate");
      if (!production.openingDate) missingProductionFields.push("openingDate");
      // Only flag closingDate if we don't already know it's an open run.
      if (!production.closingDate && !production.isOpenRun)
        missingProductionFields.push("closingDate");

      if (missingProductionFields.length === 0) continue;

      rows.push({
        productionId: production._id as string,
        playbillProductionId: production.playbillProductionId,
        showId: production.showId as string,
        showName: show.name,
        missingProductionFields,
      });
    }

    return rows;
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Idempotently stage Playbill-scraped values as pending reviewQueue entries.
 *
 * For each finding, this function:
 *   1. Skips if a "pending" entry already exists for this entity + field
 *      (one pending suggestion at a time per field).
 *   2. Skips if an "approved" or "edited" entry exists whose accepted value
 *      matches the incoming value (no point re-proposing what's already known).
 *   3. Otherwise inserts a new pending entry with source "playbill".
 *
 * Returns { created, skipped } counts for logging.
 */
export const submitFindings = internalMutation({
  args: {
    findings: v.array(findingValidator),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let skipped = 0;
    const now = Date.now();

    for (const finding of args.findings) {
      const existing = await ctx.db
        .query("reviewQueue")
        .withIndex("by_entity_field", (q) =>
          q
            .eq("entityType", finding.entityType)
            .eq("entityId", finding.entityId)
            .eq("field", finding.field)
        )
        .collect();

      // Rule 1: don't stack a new pending entry if one already exists.
      if (existing.some((e) => e.status === "pending")) {
        skipped++;
        continue;
      }

      // Rule 2: don't re-propose a value that's already been approved.
      const alreadyApproved = existing.some((e) => {
        if (e.status !== "approved" && e.status !== "edited") return false;
        const accepted = e.reviewedValue ?? e.currentValue;
        return accepted === finding.value;
      });
      if (alreadyApproved) {
        skipped++;
        continue;
      }

      await ctx.db.insert("reviewQueue", {
        entityType: finding.entityType,
        entityId: finding.entityId,
        field: finding.field,
        currentValue: finding.value,
        source: "playbill",
        status: "pending",
        createdAt: now,
      });
      created++;
    }

    return { created, skipped };
  },
});
