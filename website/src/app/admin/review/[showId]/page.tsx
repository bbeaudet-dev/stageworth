"use client";

import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";
import { useSession, signIn } from "@/lib/auth-client";
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

const STATUS_OPTIONS: { value: DataStatus; label: string }[] = [
  { value: "needs_review", label: "Needs Review" },
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" },
];

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  type: "Type",
  subtype: "Sub-type",
  hotlinkImageUrl: "Image",
  theatre: "Theatre",
  city: "City",
  district: "District",
  previewDate: "Preview Date",
  openingDate: "Opening Date",
  closingDate: "Closing Date",
  productionType: "Production Type",
  hotlinkPosterUrl: "Poster Image",
};

export default function ShowReviewDetail() {
  const { data: session, isPending } = useSession();
  const params = useParams();
  const router = useRouter();
  const showId = params.showId as string;

  const authenticated = !!session?.user;
  const detail = useQuery(
    api.reviewQueue.getShowReviewDetail,
    authenticated && showId ? { showId: showId as Id<"shows"> } : "skip"
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

      // Expand all productions by default
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

  if (isPending || !detail) {
    if (!isPending && !authenticated) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
          <button
            onClick={() => signIn.social({ provider: "google", callbackURL: `/admin/review/${showId}` })}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Sign in with Google
          </button>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  const { show, showReviewEntries, productions } = detail;

  const pendingShowEntries = showReviewEntries.filter(
    (e) => e.status === "pending"
  );
  const reviewedShowEntries = showReviewEntries.filter(
    (e) => e.status !== "pending"
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      {/* Back link */}
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
            className="h-32 w-32 rounded-lg object-cover bg-gray-100"
          />
        ) : (
          <div className="h-32 w-32 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400">
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

      {/* Show fields section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">
          Show Data
          {pendingShowEntries.length > 0 && (
            <span className="ml-2 text-sm font-normal text-amber-600">
              ({pendingShowEntries.length} pending)
            </span>
          )}
        </h2>

        {pendingShowEntries.length === 0 && reviewedShowEntries.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No review queue entries for this show.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingShowEntries.map((entry) => (
              <ReviewEntryRow
                key={entry._id}
                entry={entry}
                decision={decisions.get(entry._id)}
                editValue={editValues.get(entry._id)}
                onDecision={(d, v) => setDecision(entry._id, d, v)}
                onEditValueChange={(v) =>
                  setEditValues((prev) => new Map(prev).set(entry._id, v))
                }
              />
            ))}
            {reviewedShowEntries.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  {reviewedShowEntries.length} previously reviewed
                </summary>
                <div className="mt-2 space-y-2">
                  {reviewedShowEntries.map((entry) => (
                    <div
                      key={entry._id}
                      className="rounded border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-500"
                    >
                      <span className="font-medium">
                        {FIELD_LABELS[entry.field] ?? entry.field}
                      </span>
                      : {entry.currentValue ?? "—"}{" "}
                      <span className="capitalize">({entry.status})</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      {/* Productions section */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 border-b pb-2">
          Productions ({productions.length})
        </h2>

        {productions.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No productions for this show.
          </p>
        ) : (
          <div className="space-y-4">
            {productions.map((prod) => {
              const isExpanded = expandedProductions.has(prod._id);
              const pendingEntries = prod.reviewEntries.filter(
                (e) => e.status === "pending"
              );
              const reviewedEntries = prod.reviewEntries.filter(
                (e) => e.status !== "pending"
              );

              return (
                <div
                  key={prod._id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
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
                          className="h-8 w-8 rounded object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-200" />
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
                      {pendingEntries.length > 0 && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {pendingEntries.length} pending
                        </span>
                      )}
                      <span className="text-gray-400 text-sm">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-4 space-y-4">
                      {/* Production status selector */}
                      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-700">
                          Production status:
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

                      {pendingEntries.map((entry) => (
                        <ReviewEntryRow
                          key={entry._id}
                          entry={entry}
                          decision={decisions.get(entry._id)}
                          editValue={editValues.get(entry._id)}
                          onDecision={(d, v) => setDecision(entry._id, d, v)}
                          onEditValueChange={(v) =>
                            setEditValues((prev) =>
                              new Map(prev).set(entry._id, v)
                            )
                          }
                        />
                      ))}

                      {pendingEntries.length === 0 &&
                        reviewedEntries.length === 0 && (
                          <p className="text-gray-500 text-sm">
                            No review queue entries.
                          </p>
                        )}

                      {reviewedEntries.length > 0 && (
                        <details>
                          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                            {reviewedEntries.length} previously reviewed
                          </summary>
                          <div className="mt-2 space-y-2">
                            {reviewedEntries.map((entry) => (
                              <div
                                key={entry._id}
                                className="rounded border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-500"
                              >
                                <span className="font-medium">
                                  {FIELD_LABELS[entry.field] ?? entry.field}
                                </span>
                                : {entry.currentValue ?? "—"}{" "}
                                <span className="capitalize">
                                  ({entry.status})
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
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

// ─── Review entry row component ───────────────────────────────────────────────

function ReviewEntryRow({
  entry,
  decision,
  editValue,
  onDecision,
  onEditValueChange,
}: {
  entry: {
    _id: string;
    field: string;
    currentValue?: string;
    source: string;
    status: string;
  };
  decision?: EntryDecision;
  editValue?: string;
  onDecision: (decision: Decision, reviewedValue?: string) => void;
  onEditValueChange: (value: string) => void;
}) {
  const isImage =
    entry.field === "hotlinkImageUrl" || entry.field === "hotlinkPosterUrl";
  const currentDecision = decision?.decision;
  const isEditing = currentDecision === "edited";

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {FIELD_LABELS[entry.field] ?? entry.field}
          </div>
          <div className="text-xs text-gray-500 capitalize">
            Source: {entry.source}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onDecision("approved")}
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
              onDecision("edited", editValue ?? entry.currentValue ?? "")
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
            onClick={() => onDecision("rejected")}
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

      {/* Current value display */}
      {isImage && entry.currentValue ? (
        <img
          src={entry.currentValue}
          alt={entry.field}
          className="max-h-48 rounded border border-gray-200 bg-gray-50 object-contain"
        />
      ) : (
        <div className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2">
          {entry.currentValue ?? <span className="text-gray-400">Empty</span>}
        </div>
      )}

      {/* Edit field */}
      {isEditing && (
        <div className="mt-3">
          <label className="text-xs font-medium text-gray-600 block mb-1">
            {isImage ? "New image URL" : "New value"}
          </label>
          <input
            type="text"
            value={editValue ?? entry.currentValue ?? ""}
            onChange={(e) => {
              onEditValueChange(e.target.value);
              onDecision("edited", e.target.value);
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
