"use client";

import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type StatusFilter = "needs_review" | "partial" | "complete" | undefined;

type ScheduleFilter = "all" | "current_upcoming" | "historical";

const PAGE_SIZE = 50;
/** Fetch enough rows for client-side schedule filtering without extra Convex args. */
const FETCH_LIMIT = 5000;

type ListRow = {
  _id: string;
  name: string;
  type: string;
  dataStatus: string;
  imageUrl: string | null;
  pendingCount: number;
  productionCount: number;
  scheduleBucket: "current_upcoming" | "historical";
};

const SHOW_TYPES = [
  "musical",
  "play",
  "opera",
  "dance",
  "other",
] as const;

type ShowFormType = (typeof SHOW_TYPES)[number];

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
  /** Schedule filter applies across data statuses; default All so Current & upcoming is not empty when drafts lack dated runs. */
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [scheduleFilter, setScheduleFilter] =
    useState<ScheduleFilter>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [newShowName, setNewShowName] = useState("");
  const [newShowType, setNewShowType] = useState<ShowFormType>("musical");
  const [newShowImage, setNewShowImage] = useState<File | null>(null);
  const [addShowBusy, setAddShowBusy] = useState(false);
  const [addShowError, setAddShowError] = useState<string | null>(null);
  const [addShowSuccessId, setAddShowSuccessId] = useState<string | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);

  const generateUploadUrl = useMutation(
    api.reviewQueue.generateShowImageUploadUrl
  );
  const createShowFromForm = useMutation(
    api.reviewQueue.createShowFromAdminForm
  );

  const stats = useQuery(api.reviewQueue.stats);
  const listResult = useQuery(api.reviewQueue.listShowsForReview, {
    statusFilter,
    search: search || undefined,
    limit: FETCH_LIMIT,
    offset: 0,
  });

  const filteredRows = useMemo(() => {
    const page = listResult?.page as ListRow[] | undefined;
    if (!page) return [];
    if (scheduleFilter === "all") return page;
    if (scheduleFilter === "current_upcoming") {
      return page.filter((r) => r.scheduleBucket === "current_upcoming");
    }
    return page.filter((r) => r.scheduleBucket === "historical");
  }, [listResult?.page, scheduleFilter]);

  const rows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, scheduleFilter, search]);

  const loading = listResult === undefined;
  const hasMore = visibleCount < filteredRows.length;
  const totalFiltered = filteredRows.length;
  const pageLen = listResult?.page?.length ?? 0;
  const truncated =
    pageLen >= FETCH_LIMIT && (listResult?.total ?? 0) > pageLen;

  async function handleAddMissingShow(e: FormEvent) {
    e.preventDefault();
    setAddShowError(null);
    setAddShowSuccessId(null);
    const name = newShowName.trim();
    if (!name) {
      setAddShowError("Enter a show name.");
      return;
    }
    setAddShowBusy(true);
    try {
      let imageStorageId: Id<"_storage"> | undefined;
      if (newShowImage) {
        const postUrl = await generateUploadUrl();
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": newShowImage.type || "application/octet-stream" },
          body: newShowImage,
        });
        if (!res.ok) {
          throw new Error("Image upload failed. Try a smaller file or different format.");
        }
        const data = (await res.json()) as { storageId: Id<"_storage"> };
        if (!data.storageId) throw new Error("Upload did not return a storage id.");
        imageStorageId = data.storageId;
      }
      const showId = await createShowFromForm({
        name,
        type: newShowType,
        imageStorageId,
      });
      setAddShowSuccessId(showId);
      setNewShowName("");
      setNewShowType("musical");
      setNewShowImage(null);
      setImageInputKey((k) => k + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setAddShowError(message);
    } finally {
      setAddShowBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-6">Review Dashboard</h1>

      <section className="mb-8 rounded-lg border border-gray-200 bg-gray-50/50 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Add a missing show
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Creates an unpublished show and pending review entries for the name and
          type. Optional image is stored as key art (review the show to approve
          fields).
        </p>
        <form
          onSubmit={handleAddMissingShow}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="text-xs font-medium text-gray-600">Show name</label>
            <input
              type="text"
              value={newShowName}
              onChange={(e) => setNewShowName(e.target.value)}
              placeholder="e.g. Example Musical"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              disabled={addShowBusy}
            />
          </div>
          <div className="flex flex-col gap-1 w-full sm:w-40">
            <label className="text-xs font-medium text-gray-600">Type</label>
            <select
              value={newShowType}
              onChange={(e) =>
                setNewShowType(e.target.value as ShowFormType)
              }
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              disabled={addShowBusy}
            >
              {SHOW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px] flex-1">
            <label className="text-xs font-medium text-gray-600">
              Image (optional)
            </label>
            <input
              key={imageInputKey}
              type="file"
              accept="image/*"
              onChange={(e) =>
                setNewShowImage(e.target.files?.[0] ?? null)
              }
              className="text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-200 file:px-2 file:py-1 file:text-xs"
              disabled={addShowBusy}
            />
          </div>
          <button
            type="submit"
            disabled={addShowBusy}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {addShowBusy ? "Submitting…" : "Submit"}
          </button>
        </form>
        {addShowError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {addShowError}
          </p>
        )}
        {addShowSuccessId && (
          <p className="mt-3 text-sm text-green-700">
            Show created.{" "}
            <Link
              href={`/admin/review/${addShowSuccessId}`}
              className="font-medium underline underline-offset-2"
            >
              Open review
            </Link>
          </p>
        )}
      </section>

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
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
              Schedule
            </label>
            <select
              value={scheduleFilter}
              onChange={(e) =>
                setScheduleFilter(e.target.value as ScheduleFilter)
              }
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 min-w-[260px]"
            >
              <option value="all">All</option>
              <option value="current_upcoming">
                Current &amp; upcoming (at least one active or future run)
              </option>
              <option value="historical">
                Historical &amp; other (all runs ended, or no schedule data)
              </option>
            </select>
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

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500 text-sm">
          No shows match the current filters.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Showing {rows.length} of {totalFiltered} shows
            {truncated && (
              <span className="text-amber-600">
                {" "}
                (first {FETCH_LIMIT} matches loaded; narrow data status or search
                if you need the rest)
              </span>
            )}
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
          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Load more
              </button>
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
