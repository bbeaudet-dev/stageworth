"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type StatusFilter = "needs_review" | "partial" | "complete" | undefined;

type ScheduleFilter = "all" | "current_upcoming" | "historical";
type ScheduleSort = "none" | "current_first" | "historical_first";

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  needs_review: {
    label: "Unpublished",
    className: "bg-amber-100 text-amber-800",
  },
  partial: {
    label: "Partial",
    className: "bg-blue-100 text-blue-800",
  },
  complete: {
    label: "Complete",
    className: "bg-green-100 text-green-800",
  },
};

export default function AdminDashboard() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("needs_review");
  const [scheduleFilter, setScheduleFilter] =
    useState<ScheduleFilter>("all");
  const [scheduleSort, setScheduleSort] =
    useState<ScheduleSort>("none");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<
    Array<{
      _id: string;
      name: string;
      type: string;
      dataStatus: string;
      imageUrl: string | null;
      pendingCount: number;
      productionCount: number;
    }>
  >([]);
  const [totalCount, setTotalCount] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<number | null>(null);
  const loadMoreInFlightRef = useRef(false);

  const stats = useQuery(api.reviewQueue.stats);
  const listResult = useQuery(api.reviewQueue.listShowsForReview, {
    statusFilter: statusFilter,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset,
    scheduleFilter,
    scheduleSort,
  });

  useEffect(() => {
    setOffset(0);
    setRows([]);
  }, [statusFilter, scheduleFilter, scheduleSort, search]);

  useEffect(() => {
    if (!listResult) return;
    setTotalCount(listResult.total);
    if (offset === 0) {
      setRows(listResult.page);
    } else {
      setRows((prev) => {
        const incomingIds = new Set(
          listResult.page.map((s) => String(s._id))
        );
        if (prev.some((r) => incomingIds.has(String(r._id)))) return prev;
        return [...prev, ...listResult.page];
      });
    }
    loadMoreInFlightRef.current = false;
  }, [listResult, offset]);

  useLayoutEffect(() => {
    if (pendingScrollRef.current === null) return;
    const y = pendingScrollRef.current;
    pendingScrollRef.current = null;
    window.scrollTo(0, y);
  }, [rows]);

  const syncingFirstPage =
    listResult !== undefined &&
    offset === 0 &&
    rows.length === 0 &&
    listResult.total > 0;

  const showInitialSpinner =
    offset === 0 && (listResult === undefined || syncingFirstPage);

  const loadingMore = offset > 0 && listResult === undefined;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (loadMoreInFlightRef.current) return;
        if (!listResult?.hasMore) return;
        if (listResult === undefined) return;

        loadMoreInFlightRef.current = true;
        pendingScrollRef.current = window.scrollY;
        setOffset((o) => o + PAGE_SIZE);
      },
      { root: null, rootMargin: "320px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [listResult?.hasMore, listResult, rows.length]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Review Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Unpublished"
            value={stats.shows.needsReview}
            className="border-amber-200 bg-amber-50"
          />
          <StatCard
            label="Partial"
            value={stats.shows.partial}
            className="border-blue-200 bg-blue-50"
          />
          <StatCard
            label="Complete"
            value={stats.shows.complete}
            className="border-green-200 bg-green-50"
          />
          <StatCard
            label="Pending Queue Items"
            value={stats.pendingQueueEntries}
            className="border-gray-200 bg-gray-50"
          />
        </div>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Data status
            </div>
            <div className="flex gap-2 flex-wrap">
              {([undefined, "needs_review", "partial", "complete"] as const).map(
                (status) => (
                  <button
                    key={status ?? "all"}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {status ? STATUS_LABELS[status].label : "All"}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                Productions schedule
              </label>
              <select
                value={scheduleFilter}
                onChange={(e) =>
                  setScheduleFilter(e.target.value as ScheduleFilter)
                }
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 min-w-[200px]"
              >
                <option value="all">All shows</option>
                <option value="current_upcoming">
                  Current / upcoming (or no productions)
                </option>
                <option value="historical">Historical (all runs closed)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                Sort by schedule
              </label>
              <select
                value={scheduleSort}
                onChange={(e) =>
                  setScheduleSort(e.target.value as ScheduleSort)
                }
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 min-w-[200px]"
              >
                <option value="none">Default (status, then name)</option>
                <option value="current_first">Active / no runs first</option>
                <option value="historical_first">Historical first</option>
              </select>
            </div>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search shows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 max-w-md"
        />
      </div>

      {showInitialSpinner ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 text-sm">
          No shows match the current filters.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Showing {rows.length} of {totalCount || rows.length} shows
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Show
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((show) => (
                  <tr key={show._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/review/${show._id}`}
                        className="flex items-center gap-3 group"
                      >
                        {show.imageUrl ? (
                          <img
                            src={show.imageUrl}
                            alt={show.name}
                            className="h-10 w-10 rounded object-cover bg-gray-100"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                            ?
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900 group-hover:underline">
                          {show.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {show.type}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={show.dataStatus} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {show.pendingCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {show.pendingCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {show.productionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 0 &&
            (loadingMore || (listResult && listResult.hasMore)) && (
              <div
                ref={sentinelRef}
                className="flex min-h-12 items-center justify-center py-4"
                aria-hidden
              >
                {loadingMore ? (
                  <span className="text-sm text-gray-500">Loading more…</span>
                ) : (
                  <span className="text-xs text-gray-400">Scroll for more</span>
                )}
              </div>
            )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_LABELS[status] ?? STATUS_LABELS.needs_review;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
