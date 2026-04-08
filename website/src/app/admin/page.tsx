"use client";

import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";

type StatusFilter = "needs_review" | "partial" | "complete" | undefined;

const PAGE_SIZE = 50;
/** Fetch enough rows for client-side schedule filtering without extra Convex args. */
const FETCH_LIMIT = 500;

type ListRow = {
  _id: string;
  name: string;
  type: string;
  dataStatus: string;
  imageUrl: string | null;
  pendingCount: number;
  productionCount: number;
  scheduleBucket: "running" | "upcoming" | "historical";
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

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** Initialize filter state from URL params so it survives navigation back from review pages. */
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    const p = searchParams.get("status");
    if (p === "needs_review" || p === "partial" || p === "complete") return p;
    return undefined;
  });
  const [showRunning, setShowRunning] = useState(() => searchParams.get("running") !== "0");
  const [showUpcoming, setShowUpcoming] = useState(() => searchParams.get("upcoming") !== "0");
  const [showClosed, setShowClosed] = useState(() => searchParams.get("closed") !== "0");
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /** Keep URL in sync with filters (shallow replace — no navigation). */
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (!showRunning) params.set("running", "0");
    if (!showUpcoming) params.set("upcoming", "0");
    if (!showClosed) params.set("closed", "0");
    if (search) params.set("q", search);
    const qs = params.toString();
    router.replace(qs ? `/admin?${qs}` : "/admin");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, showRunning, showUpcoming, showClosed, search]);

  const [newShowName, setNewShowName] = useState("");
  const [newShowType, setNewShowType] = useState<ShowFormType>("musical");
  const [newShowImage, setNewShowImage] = useState<File | null>(null);
  const [addShowBusy, setAddShowBusy] = useState(false);
  const [addShowError, setAddShowError] = useState<string | null>(null);
  const [addShowSuccessId, setAddShowSuccessId] = useState<string | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [addShowModalOpen, setAddShowModalOpen] = useState(false);

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
    includeRunning: showRunning,
    includeUpcoming: showUpcoming,
    includeHistorical: showClosed,
  });

  const listPage = listResult?.page as ListRow[] | undefined;

  const rows = useMemo(
    () => (listPage ?? []).slice(0, visibleCount),
    [listPage, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, showRunning, showUpcoming, showClosed, search]);

  useEffect(() => {
    if (!addShowModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddShowModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [addShowModalOpen]);

  const loading = listResult === undefined;
  const totalFiltered = listPage?.length ?? 0;
  const hasMore = visibleCount < totalFiltered;
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

  function openAddShowModal() {
    setAddShowModalOpen(true);
    setAddShowError(null);
    setAddShowSuccessId(null);
  }

  function closeAddShowModal() {
    if (addShowBusy) return;
    setAddShowModalOpen(false);
    setAddShowError(null);
    setAddShowSuccessId(null);
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
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

      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div
            className="flex gap-2 flex-wrap"
            role="group"
            aria-label="Filter by publication status"
          >
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
          <div className="flex items-center gap-4 ml-auto" role="group" aria-label="Filter by schedule">
            {(
              [
                { key: "running", label: "Running", checked: showRunning, set: setShowRunning },
                { key: "upcoming", label: "Upcoming", checked: showUpcoming, set: setShowUpcoming },
                { key: "closed", label: "Closed/Other", checked: showClosed, set: setShowClosed },
              ] as const
            ).map(({ key, label, checked, set }) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => set(e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-0 max-w-md">
            <input
              id="admin-show-search"
              type="search"
              placeholder="Search shows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search shows"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <button
            type="button"
            onClick={openAddShowModal}
            className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Add missing show
          </button>
        </div>
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
                          <div className="w-9 shrink-0 rounded overflow-hidden bg-[#f0f0f4]" style={{ aspectRatio: "2/3" }}>
                            <img
                              src={show.imageUrl}
                              alt={show.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-9 shrink-0 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs" style={{ aspectRatio: "2/3" }}>
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

      {addShowModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-show-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close dialog"
            onClick={closeAddShowModal}
            disabled={addShowBusy}
          />
          <div className="relative z-10 w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2
                id="add-show-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                Add missing show
              </h2>
              <button
                type="button"
                onClick={closeAddShowModal}
                disabled={addShowBusy}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                aria-label="Close"
              >
                <span aria-hidden className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>

            {addShowSuccessId ? (
              <div className="space-y-4">
                <p className="text-sm text-green-800">
                  Show created. You can open it in the review queue now.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/review/${addShowSuccessId}`}
                    className="inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Open review
                  </Link>
                  <button
                    type="button"
                    onClick={closeAddShowModal}
                    className="inline-flex rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-4">
                  Creates an unpublished show with pending review entries. Name and
                  type are always queued; an uploaded image is queued too.
                </p>
                <form onSubmit={handleAddMissingShow} className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">
                      Show name
                    </label>
                    <input
                      type="text"
                      value={newShowName}
                      onChange={(e) => setNewShowName(e.target.value)}
                      placeholder="e.g. Example Musical"
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                      disabled={addShowBusy}
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Type</label>
                    <select
                      value={newShowType}
                      onChange={(e) =>
                        setNewShowType(e.target.value as ShowFormType)
                      }
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                      disabled={addShowBusy}
                    >
                      {SHOW_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">
                      Image — optional
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
                  {addShowError && (
                    <p className="text-sm text-red-600" role="alert">
                      {addShowError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeAddShowModal}
                      disabled={addShowBusy}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addShowBusy}
                      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {addShowBusy ? "Submitting…" : "Submit"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-5 text-sm text-gray-500">Loading...</div>}>
      <AdminDashboardContent />
    </Suspense>
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
    <div className={`rounded-md border px-2.5 py-2 sm:px-3 sm:py-2.5 ${className}`}>
      <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
      <div className="text-[11px] sm:text-xs text-gray-600 leading-snug mt-0.5">
        {label}
      </div>
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
