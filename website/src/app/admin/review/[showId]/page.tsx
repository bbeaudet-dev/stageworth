"use client";

import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Decision = "approved" | "rejected" | "edited";
type DataStatus = "needs_review" | "partial" | "complete";

interface EntryDecision {
  entryId: string;
  decision: Decision;
  reviewedValue?: string;
  note?: string;
}

interface FieldDef {
  field: string;
  label: string;
  isImage?: boolean;
  /** Fields that are always populated — display-only, no review actions needed */
  alwaysPresent?: boolean;
}

const STATUS_OPTIONS: { value: DataStatus; label: string }[] = [
  { value: "needs_review", label: "Needs Review" },
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" },
];

const REVIEWED_STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  edited: "bg-blue-50 text-blue-700 border-blue-200",
};

const SHOW_FIELDS: FieldDef[] = [
  { field: "name", label: "Name", alwaysPresent: true },
  { field: "type", label: "Type", alwaysPresent: true },
  { field: "subtype", label: "Sub-type" },
  { field: "hotlinkImageUrl", label: "Image", isImage: true },
  { field: "hotlinkImageSource", label: "Image Source" },
  { field: "wikipediaTitle", label: "Wikipedia Title" },
  { field: "ticketmasterAttractionId", label: "Ticketmaster ID" },
];

const PRODUCTION_FIELDS: FieldDef[] = [
  { field: "theatre", label: "Theatre" },
  { field: "city", label: "City" },
  { field: "district", label: "District", alwaysPresent: true },
  { field: "previewDate", label: "Preview Date" },
  { field: "openingDate", label: "Opening Date" },
  { field: "closingDate", label: "Closing Date" },
  { field: "productionType", label: "Production Type", alwaysPresent: true },
  { field: "hotlinkPosterUrl", label: "Poster Image", isImage: true },
  { field: "ticketmasterEventUrl", label: "Ticketmaster URL" },
  { field: "notes", label: "Notes" },
];

export default function ShowReviewDetail() {
  const params = useParams();
  const router = useRouter();
  const showId = params.showId as string;

  const detail = useQuery(
    api.reviewQueue.getShowReviewDetail,
    showId ? { showId: showId as Id<"shows"> } : "skip"
  );
  const submitReview = useMutation(api.reviewQueue.submitShowReview);

  const [decisions, setDecisions] = useState<Map<string, EntryDecision>>(
    new Map()
  );
  const [editValues, setEditValues] = useState<Map<string, string>>(new Map());
  const [showDataStatus, setShowDataStatus] = useState<DataStatus>("needs_review");
  const [productionStatuses, setProductionStatuses] = useState<
    Map<string, DataStatus>
  >(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [expandedProductions, setExpandedProductions] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (detail) {
      setShowDataStatus(detail.show.dataStatus as DataStatus);
      const prodStatuses = new Map<string, DataStatus>();
      for (const p of detail.productions) {
        prodStatuses.set(p._id, p.dataStatus as DataStatus);
      }
      setProductionStatuses(prodStatuses);
      setExpandedProductions(new Set(detail.productions.map((p) => p._id)));
    }
  }, [detail]);

  const setDecision = useCallback(
    (entryId: string, decision: Decision, reviewedValue?: string) => {
      setDecisions((prev) => {
        const next = new Map(prev);
        next.set(entryId, { entryId, decision, reviewedValue });
        return next;
      });
    },
    []
  );

  const handleSubmit = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const entryDecisions = Array.from(decisions.values()).map((d) => ({
        entryId: d.entryId as Id<"reviewQueue">,
        decision: d.decision,
        reviewedValue: d.reviewedValue,
        note: d.note,
      }));
      const prodStatuses = Array.from(productionStatuses.entries()).map(
        ([id, status]) => ({
          productionId: id as Id<"productions">,
          dataStatus: status,
        })
      );
      await submitReview({
        showId: showId as Id<"shows">,
        showDataStatus,
        entryDecisions,
        productionStatuses: prodStatuses,
      });
      router.push("/admin");
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!detail) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  const { show, showReviewEntries, productions } = detail;
  const pendingShowCount = showReviewEntries.filter(
    (e) => e.status === "pending"
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      <button
        onClick={() => router.push("/admin")}
        className="text-sm text-gray-500 hover:text-gray-900 mb-6 block"
      >
        &larr; Back to dashboard
      </button>

      {/* Show header */}
      <div className="flex items-start gap-6 mb-8">
        {show.images[0] ? (
          <img
            src={show.images[0]}
            alt={show.name}
            className="h-32 w-32 rounded-lg object-cover bg-gray-100 shrink-0"
          />
        ) : (
          <div className="h-32 w-32 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 shrink-0 text-sm">
            No image
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{show.name}</h1>
          <p className="text-gray-600 capitalize">{show.type}</p>
          {show.subtype && (
            <p className="text-gray-500 text-sm">{show.subtype}</p>
          )}
        </div>
      </div>

      {/* Show fields */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">
          Show Data
          {pendingShowCount > 0 && (
            <span className="ml-2 text-sm font-normal text-amber-600">
              ({pendingShowCount} pending)
            </span>
          )}
        </h2>
        <div className="space-y-3">
          {SHOW_FIELDS.map(({ field, label, isImage, alwaysPresent }) => {
            const value = (show as Record<string, unknown>)[field] as
              | string
              | undefined;
            const entry = showReviewEntries.find((e) => e.field === field);
            return (
              <FieldRow
                key={field}
                label={label}
                value={value}
                isImage={isImage}
                alwaysPresent={alwaysPresent}
                entry={entry}
                decision={entry ? decisions.get(entry._id) : undefined}
                editValue={entry ? editValues.get(entry._id) : undefined}
                onDecision={
                  entry
                    ? (d, v) => setDecision(entry._id, d, v)
                    : undefined
                }
                onEditValueChange={
                  entry
                    ? (v) =>
                        setEditValues((prev) =>
                          new Map(prev).set(entry._id, v)
                        )
                    : undefined
                }
              />
            );
          })}
        </div>
      </section>

      {/* Productions */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">
          Productions ({productions.length})
        </h2>

        {productions.length === 0 ? (
          <p className="text-gray-500 text-sm">No productions for this show.</p>
        ) : (
          <div className="space-y-4">
            {productions.map((prod) => {
              const isExpanded = expandedProductions.has(prod._id);
              const pendingCount = prod.reviewEntries.filter(
                (e) => e.status === "pending"
              ).length;

              return (
                <div
                  key={prod._id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Production header */}
                  <button
                    onClick={() =>
                      setExpandedProductions((prev) => {
                        const next = new Set(prev);
                        if (next.has(prod._id)) next.delete(prod._id);
                        else next.add(prod._id);
                        return next;
                      })
                    }
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {prod.posterUrl ? (
                        <img
                          src={prod.posterUrl}
                          alt="poster"
                          className="h-8 w-8 rounded object-cover bg-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-200 shrink-0" />
                      )}
                      <div>
                        <span className="text-sm font-medium">
                          {prod.theatre ?? "Unknown theatre"},{" "}
                          {prod.city ?? "Unknown city"}
                        </span>
                        <span className="text-xs text-gray-500 ml-2 capitalize">
                          {prod.district.replace(/_/g, " ")} &middot;{" "}
                          {prod.productionType}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {pendingCount} pending
                        </span>
                      )}
                      <span className="text-gray-400 text-sm">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-4 space-y-3">
                      {/* Production status */}
                      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-700">
                          Status:
                        </span>
                        {STATUS_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex items-center gap-1.5 text-sm"
                          >
                            <input
                              type="radio"
                              name={`prod-status-${prod._id}`}
                              checked={
                                productionStatuses.get(prod._id) === opt.value
                              }
                              onChange={() =>
                                setProductionStatuses((prev) =>
                                  new Map(prev).set(prod._id, opt.value)
                                )
                              }
                              className="accent-gray-900"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>

                      {/* All production fields */}
                      {PRODUCTION_FIELDS.map(
                        ({ field, label, isImage, alwaysPresent }) => {
                          const value = (
                            prod as Record<string, unknown>
                          )[field] as string | undefined;
                          const entry = prod.reviewEntries.find(
                            (e) => e.field === field
                          );
                          return (
                            <FieldRow
                              key={field}
                              label={label}
                              value={value}
                              isImage={isImage}
                              alwaysPresent={alwaysPresent}
                              entry={entry}
                              decision={
                                entry ? decisions.get(entry._id) : undefined
                              }
                              editValue={
                                entry ? editValues.get(entry._id) : undefined
                              }
                              onDecision={
                                entry
                                  ? (d, v) => setDecision(entry._id, d, v)
                                  : undefined
                              }
                              onEditValueChange={
                                entry
                                  ? (v) =>
                                      setEditValues((prev) =>
                                        new Map(prev).set(entry._id, v)
                                      )
                                  : undefined
                              }
                            />
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              Show status:
            </span>
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 text-sm"
              >
                <input
                  type="radio"
                  name="show-data-status"
                  checked={showDataStatus === opt.value}
                  onChange={() => setShowDataStatus(opt.value)}
                  className="accent-gray-900"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FieldRow: single field with all states ───────────────────────────────────

type QueueEntry = {
  _id: string;
  field: string;
  currentValue?: string;
  source: string;
  status: string;
};

function FieldRow({
  label,
  value,
  isImage,
  alwaysPresent,
  entry,
  decision,
  editValue,
  onDecision,
  onEditValueChange,
}: {
  label: string;
  value: string | undefined;
  isImage?: boolean;
  alwaysPresent?: boolean;
  entry?: QueueEntry;
  decision?: EntryDecision;
  editValue?: string;
  onDecision?: (decision: Decision, reviewedValue?: string) => void;
  onEditValueChange?: (value: string) => void;
}) {
  const isEmpty = value === undefined || value === null || value === "";
  const currentDecision = decision?.decision;
  const isEditing = currentDecision === "edited";

  // Pending entry — full interactive row
  if (entry && entry.status === "pending") {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <span className="text-sm font-medium text-gray-900">{label}</span>
            <span className="ml-2 text-xs text-gray-400 capitalize">
              via {entry.source}
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onDecision?.("approved")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currentDecision === "approved"
                  ? "bg-green-600 text-white"
                  : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
              }`}
            >
              Approve
            </button>
            <button
              onClick={() =>
                onDecision?.("edited", editValue ?? value ?? "")
              }
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currentDecision === "edited"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => onDecision?.("rejected")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currentDecision === "rejected"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              }`}
            >
              Reject
            </button>
          </div>
        </div>

        {isImage && value ? (
          <img
            src={value}
            alt={label}
            className="max-h-48 rounded border border-gray-200 bg-gray-50 object-contain"
          />
        ) : (
          <div className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 break-all">
            {value ?? <span className="text-gray-400">Empty</span>}
          </div>
        )}

        {isEditing && (
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-600 block mb-1">
              {isImage ? "New image URL" : "New value"}
            </label>
            <input
              type="text"
              value={editValue ?? value ?? ""}
              onChange={(e) => {
                onEditValueChange?.(e.target.value);
                onDecision?.("edited", e.target.value);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            {isImage && editValue && (
              <img
                src={editValue}
                alt="preview"
                className="mt-2 max-h-32 rounded border border-gray-200 object-contain"
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // Compact row for everything else
  const statusBadge = entry ? (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
        REVIEWED_STATUS_STYLES[entry.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
      }`}
    >
      {entry.status}
    </span>
  ) : isEmpty && !alwaysPresent ? (
    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
      Missing
    </span>
  ) : null;

  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-gray-50 text-sm">
      <span className="font-medium text-gray-600 w-36 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">
        {isImage && value ? (
          <img
            src={value}
            alt={label}
            className="max-h-24 rounded border border-gray-200 object-contain"
          />
        ) : (
          <span
            className={`break-all ${isEmpty ? "text-gray-400 italic" : "text-gray-800"}`}
          >
            {isEmpty ? "—" : value}
          </span>
        )}
      </div>
      {statusBadge && <div className="shrink-0">{statusBadge}</div>}
    </div>
  );
}
