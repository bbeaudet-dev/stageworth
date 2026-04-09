"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function formatStamp(ms: number | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

export default function AdminShowtimesPage() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const rows = useQuery(
    api.showtimes.listProposals,
    status === "all" ? { limit: 100 } : { status, limit: 100 }
  );
  const approve = useMutation(api.showtimes.approveProposal);
  const reject = useMutation(api.showtimes.rejectProposal);

  const ordered = useMemo(() => rows ?? [], [rows]);

  async function onApprove(id: string) {
    setBusyId(id);
    try {
      await approve({ proposalId: id as Id<"showtimesReviews"> });
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    setBusyId(id);
    try {
      await reject({
        proposalId: id as Id<"showtimesReviews">,
        note: rejectNote || undefined,
      });
      setRejectNote("");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Showtimes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Weekly Playbill snapshots staged for manual approval before writing to productions.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {rows === undefined ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-gray-500">No showtime proposals found.</p>
      ) : (
        <div className="space-y-4">
          {ordered.map((row) => {
            const expanded = openId === row._id;
            const busy = busyId === row._id;
            return (
              <article key={row._id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Week of {row.weekOf}
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {row.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Fetched {formatStamp(row.fetchedAt)} · Matched {row.matchedCount} / {row.shows.length}
                    </div>
                    {row.unmatchedTitles.length > 0 ? (
                      <div className="mt-1 text-xs text-amber-700">
                        Unmatched: {row.unmatchedTitles.join(", ")}
                      </div>
                    ) : null}
                    {row.reviewedAt ? (
                      <div className="mt-1 text-xs text-gray-500">
                        Reviewed {formatStamp(row.reviewedAt)}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(expanded ? null : row._id)}
                      className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {expanded ? "Hide details" : "View full payload"}
                    </button>
                    {row.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onApprove(row._id)}
                          disabled={busy}
                          className="rounded-md bg-green-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(row._id)}
                          disabled={busy}
                          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {row.status === "pending" && expanded ? (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Reject note (optional)</label>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                      placeholder="Why this snapshot was rejected"
                    />
                  </div>
                ) : null}

                {expanded ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-gray-600">Raw snapshot JSON</summary>
                    <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800">
                      {JSON.stringify({ weekOf: row.weekOf, shows: row.shows }, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

