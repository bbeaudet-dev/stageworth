"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminUserFeedbackPage() {
  const rows = useQuery(api.catalogUserFeedback.listForAdmin, { limit: 200 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex gap-4 mb-5 text-sm">
        <Link href="/admin" className="text-gray-500 hover:text-gray-900">Shows</Link>
        <Link href="/admin/unmatched" className="text-gray-500 hover:text-gray-900">Unmatched Locations</Link>
        <span className="font-medium text-gray-900">User Feedback</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Notes from the app about incorrect or missing catalog data.
      </p>

      {rows === undefined ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No feedback yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <article
              key={r._id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 gap-y-1">
                <div className="text-sm font-semibold text-gray-900">
                  <Link
                    href={`/admin/review/${r.showId}?returnTo=${encodeURIComponent("/admin/feedback")}`}
                    className="hover:underline"
                  >
                    {r.showNameSnapshot}
                  </Link>
                  {r.productionId && (
                    <span className="font-normal text-gray-600">
                      {" · "}
                      {r.productionLabelSnapshot ?? "Production"}
                    </span>
                  )}
                </div>
                <time
                  className="text-xs text-gray-400 tabular-nums"
                  dateTime={new Date(r.createdAt).toISOString()}
                >
                  {new Date(r.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
                {r.note}
              </p>
              <p className="mt-3 text-xs text-gray-500">
                From{" "}
                <span className="font-medium text-gray-700">
                  {r.userUsername
                    ? `@${r.userUsername}`
                    : r.userEmail ?? String(r.userId)}
                </span>
                {r.userUsername && r.userEmail ? (
                  <span className="text-gray-400"> · {r.userEmail}</span>
                ) : null}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
