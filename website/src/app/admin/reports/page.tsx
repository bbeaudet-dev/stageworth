"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/api";
import type { Id } from "@/convex/_generated/dataModel";

type StatusFilter = "open" | "reviewed" | "actioned" | "dismissed";

const STATUS_LABEL: Record<StatusFilter, string> = {
  open: "Open",
  reviewed: "Reviewed",
  actioned: "Actioned",
  dismissed: "Dismissed",
};

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate: "Hate speech",
  sexual: "Sexual content",
  violence: "Violence",
  self_harm: "Self harm",
  impersonation: "Impersonation",
  other: "Other",
};

const KIND_LABEL: Record<string, string> = {
  user: "User profile",
  activityPost: "Feed post",
  visit: "Visit",
};

export default function AdminUserReportsPage() {
  const [status, setStatus] = useState<StatusFilter>("open");
  const counts = useQuery(api.admin.userReports.countByStatus, {});
  const rows = useQuery(api.admin.userReports.listForAdmin, {
    status,
    limit: 200,
  });

  const resolveReport = useMutation(api.admin.userReports.resolveReport);
  const [busyId, setBusyId] = useState<Id<"userReports"> | null>(null);

  const handleResolve = async (
    reportId: Id<"userReports">,
    nextStatus: "reviewed" | "actioned" | "dismissed"
  ) => {
    if (busyId) return;
    const note = window.prompt(
      `Optional note for ${nextStatus} decision (leave empty to skip):`
    );
    if (note === null) return;
    setBusyId(reportId);
    try {
      await resolveReport({
        reportId,
        status: nextStatus,
        reviewerNote: note || undefined,
      });
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to resolve report"
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <p className="text-sm text-gray-500 mb-4">
        User-submitted reports of profiles, feed posts, and visits. Apple
        expects a review decision within 24 hours.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((s) => {
          const count = counts?.[s];
          const active = s === status;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {STATUS_LABEL[s]}
              {typeof count === "number" ? (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-white/20" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {rows === undefined ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No {STATUS_LABEL[status].toLowerCase()} reports.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const reporterLabel = r.reporter
              ? r.reporter.username
                ? `@${r.reporter.username}`
                : r.reporter.email ?? String(r.reporter._id)
              : "(deleted account)";
            const targetLabel = r.target
              ? r.target.username
                ? `@${r.target.username}`
                : r.target.email ?? String(r.target._id)
              : "(deleted account)";

            const preview =
              r.targetKind === "activityPost"
                ? r.postPreview
                : r.targetKind === "visit"
                  ? r.visitPreview
                  : null;

            return (
              <article
                key={r._id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
                  <div className="text-sm font-semibold text-gray-900">
                    {KIND_LABEL[r.targetKind] ?? r.targetKind}
                    <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">
                      {REASON_LABEL[r.reason] ?? r.reason}
                    </span>
                  </div>
                  <time
                    className="text-xs text-gray-400 tabular-nums"
                    dateTime={new Date(r.createdAt).toISOString()}
                  >
                    {new Date(r.createdAt).toLocaleString()}
                  </time>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Reported by{" "}
                  <span className="font-medium text-gray-700">
                    {reporterLabel}
                  </span>
                  {" · "}Target:{" "}
                  <span className="font-medium text-gray-700">
                    {targetLabel}
                  </span>
                </p>

                {r.details ? (
                  <div className="mt-3 rounded border border-gray-100 bg-gray-50 p-3 text-sm text-gray-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reporter note
                    </p>
                    <p className="whitespace-pre-wrap">{r.details}</p>
                  </div>
                ) : null}

                {preview ? (
                  <div className="mt-3 rounded border border-gray-100 bg-white p-3 text-sm text-gray-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Current content
                    </p>
                    {preview.notes ? (
                      <p className="whitespace-pre-wrap">{preview.notes}</p>
                    ) : (
                      <p className="text-gray-400 italic">(no notes)</p>
                    )}
                    {(preview.theatre || preview.city) && (
                      <p className="mt-1 text-xs text-gray-500">
                        {[preview.theatre, preview.city]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                ) : null}

                {r.contentSnapshot ? (
                  <div className="mt-3 rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                    <p className="mb-1 font-semibold uppercase tracking-wide text-gray-500">
                      Snapshot at report time
                    </p>
                    <p className="whitespace-pre-wrap">{r.contentSnapshot}</p>
                  </div>
                ) : null}

                {r.reviewerNote ? (
                  <p className="mt-3 text-xs text-gray-600">
                    <span className="font-semibold">Reviewer note:</span>{" "}
                    {r.reviewerNote}
                  </p>
                ) : null}

                {status === "open" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => handleResolve(r._id, "dismissed")}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => handleResolve(r._id, "reviewed")}
                      className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      Mark reviewed
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => handleResolve(r._id, "actioned")}
                      className="rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      Action taken
                    </button>
                  </div>
                ) : r.reviewedAt ? (
                  <p className="mt-3 text-xs text-gray-400">
                    Reviewed {new Date(r.reviewedAt).toLocaleString()}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
