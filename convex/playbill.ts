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
 *   - Show-level `description`: empty on the linked `shows` doc (per
 *     docs/plans/show-descriptions-pipeline; production.description is legacy
 *     and no longer scraped).
 *   - Production-level numeric/date fields: undefined/null on the production.
 *     Dates additionally skip when a pending reviewQueue entry already exists
 *     via the dedupe in submitFindings.
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
      missingShowFields: string[];
      missingProductionFields: string[];
    }> = [];

    for (const production of productions) {
      if (!production.playbillProductionId) continue;

      const show = await ctx.db.get(production.showId);
      if (!show) continue;

      const missingShowFields: string[] = [];
      if (!show.description) missingShowFields.push("description");

      const missingProductionFields: string[] = [];
      if (production.runningTime === undefined || production.runningTime === null)
        missingProductionFields.push("runningTime");
      if (production.intermissionCount === undefined || production.intermissionCount === null)
        missingProductionFields.push("intermissionCount");
      if (!production.previewDate) missingProductionFields.push("previewDate");
      if (!production.openingDate) missingProductionFields.push("openingDate");
      // Only flag closingDate if we don't already know it's an open run.
      if (!production.closingDate && !production.isOpenRun)
        missingProductionFields.push("closingDate");

      if (
        missingShowFields.length === 0 &&
        missingProductionFields.length === 0
      )
        continue;

      rows.push({
        productionId: production._id as string,
        playbillProductionId: production.playbillProductionId,
        showId: production.showId as string,
        showName: show.name,
        missingShowFields,
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

      // Rule 3 (descriptions only): if admins have already rejected this exact
      // text for this show, don't keep re-staging the same proposal on every
      // import run. They can still accept a different future value.
      if (
        finding.entityType === "show" &&
        finding.field === "description" &&
        existing.some(
          (e) => e.status === "rejected" && e.currentValue === finding.value
        )
      ) {
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

// ─── Playbill ID mapping backfill ─────────────────────────────────────────────
// Unlocks Playbill enrichment (descriptions, dates, running time) for historical
// productions that predate the existing playbillProductionId seeding. Ships as
// a separate workflow so a wrong guess stays gated behind admin review.

/**
 * Productions missing `playbillProductionId`. Returns enough context for the
 * mapping script to search Playbill and score candidates (name, theatre,
 * district, opening year). Kept minimal to avoid shipping the whole DB.
 */
export const getProductionsNeedingPlaybillMapping = internalQuery({
  args: {},
  handler: async (ctx) => {
    const productions = await ctx.db.query("productions").collect();

    const rows: Array<{
      productionId: string;
      showId: string;
      showName: string;
      theatre: string | null;
      city: string | null;
      district: string;
      previewDate: string | null;
      openingDate: string | null;
      closingDate: string | null;
    }> = [];

    for (const production of productions) {
      if (production.playbillProductionId) continue;

      const show = await ctx.db.get(production.showId);
      if (!show) continue;

      // Skip productions whose mapping is already pending review — stops the
      // script from stacking duplicate entries across runs.
      const existing = await ctx.db
        .query("reviewQueue")
        .withIndex("by_entity_field", (q) =>
          q
            .eq("entityType", "production")
            .eq("entityId", production._id as string)
            .eq("field", "playbillProductionId")
        )
        .collect();
      if (existing.some((e) => e.status === "pending")) continue;

      rows.push({
        productionId: production._id as string,
        showId: production.showId as string,
        showName: show.name,
        theatre: production.theatre ?? null,
        city: production.city ?? null,
        district: production.district,
        previewDate: production.previewDate ?? null,
        openingDate: production.openingDate ?? null,
        closingDate: production.closingDate ?? null,
      });
    }

    return rows;
  },
});

/**
 * Stage playbillProductionId mapping proposals as pending reviewQueue entries.
 *
 * Each finding carries the top candidate plus optional confidence / alternate
 * slugs (flattened into the `note` field so admins can see the shortlist
 * without a separate table). Idempotency mirrors submitFindings: skip if a
 * pending entry exists, skip if the exact value has already been approved.
 */
export const submitMappingFindings = internalMutation({
  args: {
    findings: v.array(
      v.object({
        productionId: v.string(),
        playbillProductionId: v.string(),
        confidence: v.number(),
        alternateIds: v.optional(v.array(v.string())),
      })
    ),
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
            .eq("entityType", "production")
            .eq("entityId", finding.productionId)
            .eq("field", "playbillProductionId")
        )
        .collect();

      if (existing.some((e) => e.status === "pending")) {
        skipped++;
        continue;
      }

      const alreadyApproved = existing.some((e) => {
        if (e.status !== "approved" && e.status !== "edited") return false;
        const accepted = e.reviewedValue ?? e.currentValue;
        return accepted === finding.playbillProductionId;
      });
      if (alreadyApproved) {
        skipped++;
        continue;
      }

      const noteParts: string[] = [
        `confidence=${finding.confidence.toFixed(2)}`,
      ];
      if (finding.alternateIds && finding.alternateIds.length > 0) {
        noteParts.push(`alternates=${finding.alternateIds.join(",")}`);
      }

      await ctx.db.insert("reviewQueue", {
        entityType: "production",
        entityId: finding.productionId,
        field: "playbillProductionId",
        currentValue: finding.playbillProductionId,
        source: "playbill",
        status: "pending",
        note: noteParts.join(" | "),
        createdAt: now,
      });
      created++;
    }

    return { created, skipped };
  },
});
