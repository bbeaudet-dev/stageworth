"use client";

import { useMutation, useQueries, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type StatusFilter = "needs_review" | "partial" | "complete" | undefined;

const PAGE_SIZE = 50;
/** Cap rows returned per request (schedule filters run in Convex before this limit). */
const FETCH_LIMIT = 500;

/** Property Focus mode: show-level fields (flat list, one row per show). */
const SHOW_FOCUS_FIELDS = [
  { value: "name", label: "Name" },
  { value: "type", label: "Type" },
  { value: "subtype", label: "Subtype" },
  { value: "hotlinkImageUrl", label: "Image URL" },
] as const;

/** Property Focus mode: production-level fields (E-layout, one row per production). */
const PRODUCTION_FOCUS_FIELDS = [
  { value: "openingDate", label: "Opening Date" },
  { value: "closingDate", label: "Closing Date" },
  { value: "previewDate", label: "Preview Date" },
  { value: "theatre", label: "Theatre" },
  { value: "city", label: "City" },
  { value: "runningTime", label: "Running Time" },
  { value: "intermissionCount", label: "Intermissions" },
  { value: "intermissionMinutes", label: "Intermission Duration" },
  { value: "description", label: "Description" },
  { value: "hotlinkPosterUrl", label: "Poster Image" },
  { value: "isOpenRun", label: "Open Run" },
  { value: "isClosed", label: "Is Closed" },
] as const;

type ShowFocusField = (typeof SHOW_FOCUS_FIELDS)[number]["value"];
type ProductionFocusField = (typeof PRODUCTION_FOCUS_FIELDS)[number]["value"];
type FocusFieldValue = ShowFocusField | ProductionFocusField;

function isProductionFocusField(field: string): field is ProductionFocusField {
  return PRODUCTION_FOCUS_FIELDS.some((f) => f.value === field);
}

const SOURCE_LABELS: Record<string, string> = {
  playbill: "Playbill",
  wikipedia: "Wikipedia",
  ticketmaster: "Ticketmaster",
  bot: "Bot",
  seed: "Seed",
  manual: "Manual",
  wikidata: "Wikidata",
};

/** Format a raw DB string value for display in the focus column. */
function formatFocusValue(field: string, value: string | null): string {
  if (value === null) return "—";
  if (field === "runningTime") return `${value} min`;
  if (field === "intermissionCount") return value === "0" ? "None" : value;
  if (field === "intermissionMinutes") return `${value} min`;
  if (field === "description") {
    return value.length > 90 ? value.slice(0, 90) + "…" : value;
  }
  return value;
}

type ListRow = {
  _id: string;
  name: string;
  type: string;
  dataStatus: string;
  imageUrl: string | null;
  pendingCount: number;
  productionCount: number;
  scheduleBucket: "running" | "upcoming" | "historical";
  latestQueueAt: number | null;
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
  const [focusField, setFocusField] = useState<FocusFieldValue | "">(() => {
    const p = searchParams.get("focus");
    const allFields = [...SHOW_FOCUS_FIELDS, ...PRODUCTION_FOCUS_FIELDS];
    return allFields.some((f) => f.value === p) ? (p as FocusFieldValue) : "";
  });
  const [onlyWithPending, setOnlyWithPending] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "recentQueue">(() => {
    return searchParams.get("sort") === "recentQueue" ? "recentQueue" : "name";
  });

  /** Dashboard URL with status/schedule only (no search) — passed as review `returnTo`. */
  const adminPathWithoutSearch = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (!showRunning) params.set("running", "0");
    if (!showUpcoming) params.set("upcoming", "0");
    if (!showClosed) params.set("closed", "0");
    if (focusField) params.set("focus", focusField);
    if (sortBy !== "name") params.set("sort", sortBy);
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  }, [statusFilter, showRunning, showUpcoming, showClosed, focusField, sortBy]);

  /** Keep URL in sync with filters (shallow replace — no navigation). */
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (!showRunning) params.set("running", "0");
    if (!showUpcoming) params.set("upcoming", "0");
    if (!showClosed) params.set("closed", "0");
    if (search) params.set("q", search);
    if (focusField) params.set("focus", focusField);
    if (sortBy !== "name") params.set("sort", sortBy);
    const qs = params.toString();
    router.replace(qs ? `/admin?${qs}` : "/admin");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, showRunning, showUpcoming, showClosed, search, focusField, sortBy]);

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
  const submitReview = useMutation(api.reviewQueue.submitShowReview);

  // ── Property Focus mode ──────────────────────────────────────────────────
  const showFocusArgs = useMemo(() => {
    if (!focusField || isProductionFocusField(focusField)) return "skip" as const;
    return {
      field: focusField,
      statusFilter: statusFilter,
      search: search.trim() || undefined,
      includeRunning: showRunning,
      includeUpcoming: showUpcoming,
      includeHistorical: showClosed,
      onlyWithPending: onlyWithPending || undefined,
    };
  }, [focusField, statusFilter, search, showRunning, showUpcoming, showClosed, onlyWithPending]);

  const productionFocusArgs = useMemo(() => {
    if (!focusField || !isProductionFocusField(focusField)) return "skip" as const;
    return {
      field: focusField,
      statusFilter: statusFilter,
      search: search.trim() || undefined,
      includeRunning: showRunning,
      includeUpcoming: showUpcoming,
      includeHistorical: showClosed,
      onlyWithPending: onlyWithPending || undefined,
    };
  }, [focusField, statusFilter, search, showRunning, showUpcoming, showClosed, onlyWithPending]);

  const showFocusListRaw = useQuery(api.reviewQueue.listShowsForFieldReview, showFocusArgs);
  const prodFocusListRaw = useQuery(api.reviewQueue.listShowsWithProductionFieldFocus, productionFocusArgs);
  const focusListRaw = focusField
    ? (isProductionFocusField(focusField) ? prodFocusListRaw : showFocusListRaw)
    : undefined;

  // Inline focus-row action state
  type FocusEditState = { showId: string; entryId: string | null; entityId?: string; value: string };
  const [focusEdit, setFocusEdit] = useState<FocusEditState | null>(null);
  const [focusBusy, setFocusBusy] = useState<Set<string>>(new Set());
  const focusEditRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusEdit) focusEditRef.current?.focus();
  }, [focusEdit]);

  async function handleFocusAction(
    showId: string,
    showDataStatus: string,
    entryId: string | null,
    decision: "approved" | "rejected" | "edited" | "direct",
    value?: string,
    /** For production field direct-sets: the production entity ID and type. */
    directEntity?: { entityType: "show" | "production"; entityId: string }
  ) {
    setFocusBusy((prev) => new Set(prev).add(entryId ?? showId));
    try {
      if (decision === "approved" && entryId) {
        await submitReview({
          showId: showId as Id<"shows">,
          showDataStatus: showDataStatus as "needs_review" | "partial" | "complete",
          entryDecisions: [{ entryId: entryId as Id<"reviewQueue">, decision: "approved" }],
        });
      } else if (decision === "rejected" && entryId) {
        await submitReview({
          showId: showId as Id<"shows">,
          showDataStatus: showDataStatus as "needs_review" | "partial" | "complete",
          entryDecisions: [{ entryId: entryId as Id<"reviewQueue">, decision: "rejected" }],
        });
      } else if (decision === "edited" && entryId && value !== undefined) {
        await submitReview({
          showId: showId as Id<"shows">,
          showDataStatus: showDataStatus as "needs_review" | "partial" | "complete",
          entryDecisions: [{ entryId: entryId as Id<"reviewQueue">, decision: "edited", reviewedValue: value }],
        });
        setFocusEdit(null);
      } else if (decision === "direct" && value !== undefined && focusField) {
        const entity = directEntity ?? { entityType: "show" as const, entityId: showId };
        await submitReview({
          showId: showId as Id<"shows">,
          showDataStatus: showDataStatus as "needs_review" | "partial" | "complete",
          entryDecisions: [],
          directEdits: [{ entityType: entity.entityType, entityId: entity.entityId, field: focusField, newValue: value || undefined }],
        });
        setFocusEdit(null);
      }
    } finally {
      setFocusBusy((prev) => { const s = new Set(prev); s.delete(entryId ?? showId); return s; });
    }
  }

  const adminQueries = useMemo(() => {
    const listArgs: {
      limit: number;
      offset: number;
      includeRunning: boolean;
      includeUpcoming: boolean;
      includeHistorical: boolean;
      statusFilter?: Exclude<StatusFilter, undefined>;
      search?: string;
      sortBy?: "name" | "recentQueue";
    } = {
      limit: FETCH_LIMIT,
      offset: 0,
      includeRunning: showRunning,
      includeUpcoming: showUpcoming,
      includeHistorical: showClosed,
      sortBy,
    };
    if (statusFilter !== undefined) listArgs.statusFilter = statusFilter;
    const q = search.trim();
    if (q) listArgs.search = q;

    return {
      stats: { query: api.reviewQueue.stats, args: {} },
      list: { query: api.reviewQueue.listShowsForReview, args: listArgs },
    };
  }, [statusFilter, search, showRunning, showUpcoming, showClosed, sortBy]);

  const adminResults = useQueries(adminQueries);
  const stats =
    adminResults.stats instanceof Error ? undefined : adminResults.stats;
  const listRaw = adminResults.list;
  const listError = listRaw instanceof Error ? listRaw : null;
  const listResult =
    listRaw !== undefined && !(listRaw instanceof Error) ? listRaw : undefined;

  const listPage = listResult?.page as ListRow[] | undefined;

  const rows = useMemo(
    () => (listPage ?? []).slice(0, visibleCount),
    [listPage, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, showRunning, showUpcoming, showClosed, search, focusField, onlyWithPending, sortBy]);

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

  const loading = focusField
    ? (isProductionFocusField(focusField) ? prodFocusListRaw === undefined : showFocusListRaw === undefined)
    : listRaw === undefined;
  const totalFiltered = focusField
    ? (focusListRaw instanceof Error ? 0 : (focusListRaw?.length ?? 0))
    : (listPage?.length ?? 0);
  const hasMore = visibleCount < totalFiltered;
  const pageLen = listResult?.page?.length ?? 0;
  const truncated =
    !focusField && pageLen >= FETCH_LIMIT && (listResult?.total ?? 0) > pageLen;

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
        <div className="flex gap-4 mb-5 text-sm">
          <span className="font-medium text-gray-900">Shows</span>
          <Link href="/admin/unmatched" className="text-gray-500 hover:text-gray-900">Unmatched Locations</Link>
          <Link href="/admin/feedback" className="text-gray-500 hover:text-gray-900">User Feedback</Link>
        </div>
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

      {listError ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-medium">Could not load the show list from Convex.</p>
          <p className="mt-2 text-amber-900/90 whitespace-pre-wrap">
            {listError.message}
          </p>
          <p className="mt-3 text-amber-900/90">
            This often happens if the website was deployed before the backend.
            From the repo root, deploy Convex so <code className="rounded bg-amber-100/80 px-1">listShowsForReview</code> matches the site (includes schedule filter arguments):{" "}
            <code className="rounded bg-amber-100/80 px-1">npx convex deploy</code>
          </p>
        </div>
      ) : null}

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <input
              id="admin-show-search"
              type="search"
              placeholder="Search shows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search shows"
              className="min-w-0 w-48 flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap" htmlFor="sort-select">
                Sort:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "recentQueue")}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="name">Name</option>
                <option value="recentQueue">Recent Activity</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap" htmlFor="focus-field-select">
                Focus:
              </label>
              <select
                id="focus-field-select"
                value={focusField}
                onChange={(e) => {
                  setFocusField(e.target.value as FocusFieldValue | "");
                  setFocusEdit(null);
                  setOnlyWithPending(false);
                }}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="">— none —</option>
                <optgroup label="Show">
                  {SHOW_FOCUS_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Production">
                  {PRODUCTION_FOCUS_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            {focusField && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={onlyWithPending}
                  onChange={(e) => setOnlyWithPending(e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-600">Pending only</span>
              </label>
            )}
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
      ) : listError && !focusField ? null : (
        <>
          {focusField ? (
            // ── Property Focus mode ───────────────────────────────────────
            (() => {
              const focusRows = focusListRaw instanceof Error || !focusListRaw ? [] : focusListRaw;
              const visibleFocusRows = focusRows.slice(0, visibleCount);
              const isProdFocus = isProductionFocusField(focusField);
              const allFields = [...SHOW_FOCUS_FIELDS, ...PRODUCTION_FOCUS_FIELDS];
              const focusLabel = allFields.find((f) => f.value === focusField)?.label ?? focusField;

              if (focusRows.length === 0 && !loading) {
                return <div className="text-gray-500 text-sm">No shows match the current filters.</div>;
              }

              /** Reusable inline action cell for any pending entry + entity. */
              const ActionCell = ({
                showId,
                showDataStatus,
                entryId,
                proposedValue,
                currentValue,
                entityType,
                entityId,
              }: {
                showId: string;
                showDataStatus: string;
                entryId: string | null;
                proposedValue: string | null;
                currentValue: string | null;
                entityType: "show" | "production";
                entityId: string;
              }) => {
                const busyKey = entryId ?? entityId;
                const busy = focusBusy.has(busyKey);
                const isEditing = focusEdit?.showId === showId && focusEdit?.entryId === entryId && (focusEdit?.entityId ?? showId) === entityId;
                if (isEditing) {
                  return (
                    <form
                      className="flex items-center gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const val = focusEdit!.value;
                        if (focusEdit!.entryId) {
                          void handleFocusAction(showId, showDataStatus, focusEdit!.entryId, "edited", val);
                        } else {
                          void handleFocusAction(showId, showDataStatus, null, "direct", val, { entityType, entityId });
                        }
                      }}
                    >
                      <input
                        ref={focusEditRef}
                        type="text"
                        value={focusEdit!.value}
                        onChange={(e) => setFocusEdit((prev) => prev ? { ...prev, value: e.target.value } : null)}
                        className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                        disabled={busy}
                      />
                      <button type="submit" disabled={busy} className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50">Save</button>
                      <button type="button" onClick={() => setFocusEdit(null)} disabled={busy} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                    </form>
                  );
                }
                if (entryId && proposedValue !== null) {
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button type="button" disabled={busy} onClick={() => handleFocusAction(showId, showDataStatus, entryId, "approved")} className="rounded bg-green-700 px-2 py-1 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50">Approve</button>
                      <button type="button" disabled={busy} onClick={() => setFocusEdit({ showId, entryId, entityId, value: proposedValue })} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50">Edit</button>
                      <button type="button" disabled={busy} onClick={() => handleFocusAction(showId, showDataStatus, entryId, "rejected")} className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
                    </div>
                  );
                }
                return (
                  <button type="button" onClick={() => setFocusEdit({ showId, entryId: null, entityId, value: currentValue ?? "" })} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Set</button>
                );
              };

              const ShowThumbnail = ({ show }: { show: { _id: string; name: string; imageUrl: string | null } }) => (
                <Link href={`/admin/review/${show._id}?returnTo=${encodeURIComponent(adminPathWithoutSearch)}`} className="flex items-center gap-2.5 group min-w-0">
                  {show.imageUrl ? (
                    <div className="w-8 shrink-0 rounded overflow-hidden bg-[#f0f0f4]" style={{ aspectRatio: "2/3" }}>
                      <img src={show.imageUrl} alt={show.name} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-8 shrink-0 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs" style={{ aspectRatio: "2/3" }}>?</div>
                  )}
                  <span className="text-sm font-medium text-gray-900 group-hover:underline truncate">{show.name}</span>
                </Link>
              );

              return (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    Showing {visibleFocusRows.length} of {focusRows.length} shows — {focusLabel}
                    {isProdFocus && <span className="text-gray-400"> (production level)</span>}
                  </p>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">Show</th>
                          {isProdFocus && <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Production</th>}
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suggestion</th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {isProdFocus ? (
                          // E-layout: show image spans all its production rows
                          (visibleFocusRows as typeof prodFocusListRaw extends (infer T)[] | undefined ? T[] : never[]).flatMap((show) => {
                            const prods = (show as { productions: { _id: string; showId: string; label: string; dataStatus: string; currentFieldValue: string | null; pendingEntry: { _id: string; proposedValue: string; source: string } | null }[] }).productions;
                            if (prods.length === 0) {
                              return [(
                                <tr key={show._id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3"><ShowThumbnail show={show as { _id: string; name: string; imageUrl: string | null }} /></td>
                                  <td colSpan={4} className="px-3 py-3 text-sm text-gray-400 italic">No productions</td>
                                </tr>
                              )];
                            }
                            return prods.map((prod, i) => {
                              const busyKey = prod.pendingEntry?._id ?? prod._id;
                              const busy = focusBusy.has(busyKey);
                              return (
                                <tr key={prod._id} className={busy ? "opacity-50" : "hover:bg-gray-50"}>
                                  {i === 0 && (
                                    <td rowSpan={prods.length} className="px-4 py-3 align-top border-r border-gray-100">
                                      <ShowThumbnail show={show as { _id: string; name: string; imageUrl: string | null }} />
                                    </td>
                                  )}
                                  <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{prod.label}</td>
                                  <td className="px-3 py-3 text-sm max-w-[180px]">
                                    {prod.currentFieldValue !== null
                                      ? <span className="text-gray-800">{formatFocusValue(focusField, prod.currentFieldValue)}</span>
                                      : <span className="text-gray-400 italic">empty</span>}
                                  </td>
                                  <td className="px-3 py-3 text-sm max-w-[200px]">
                                    {prod.pendingEntry ? (
                                      <span className="flex flex-col gap-1">
                                        <span className="text-gray-800">{formatFocusValue(focusField, prod.pendingEntry.proposedValue)}</span>
                                        <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{SOURCE_LABELS[prod.pendingEntry.source] ?? prod.pendingEntry.source}</span>
                                      </span>
                                    ) : <span className="text-gray-400 italic">none</span>}
                                  </td>
                                  <td className="px-3 py-3">
                                    <ActionCell
                                      showId={(show as { _id: string })._id}
                                      showDataStatus={(show as { dataStatus: string }).dataStatus}
                                      entryId={prod.pendingEntry?._id ?? null}
                                      proposedValue={prod.pendingEntry?.proposedValue ?? null}
                                      currentValue={prod.currentFieldValue}
                                      entityType="production"
                                      entityId={prod._id}
                                    />
                                  </td>
                                </tr>
                              );
                            });
                          })
                        ) : (
                          // Flat layout: one row per show
                          (visibleFocusRows as typeof showFocusListRaw extends (infer T)[] | undefined ? T[] : never[]).map((show) => {
                            const s = show as { _id: string; name: string; imageUrl: string | null; dataStatus: string; currentFieldValue: string | null; pendingEntry: { _id: string; proposedValue: string; source: string } | null };
                            return (
                              <tr key={s._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3"><ShowThumbnail show={s} /></td>
                                <td className="px-3 py-3 text-sm max-w-[200px]">
                                  {s.currentFieldValue !== null
                                    ? <span className="text-gray-800">{formatFocusValue(focusField, s.currentFieldValue)}</span>
                                    : <span className="text-gray-400 italic">empty</span>}
                                </td>
                                <td className="px-3 py-3 text-sm max-w-[220px]">
                                  {s.pendingEntry ? (
                                    <span className="flex flex-col gap-1">
                                      <span className="text-gray-800">{formatFocusValue(focusField, s.pendingEntry.proposedValue)}</span>
                                      <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{SOURCE_LABELS[s.pendingEntry.source] ?? s.pendingEntry.source}</span>
                                    </span>
                                  ) : <span className="text-gray-400 italic">none</span>}
                                </td>
                                <td className="px-3 py-3">
                                  <ActionCell
                                    showId={s._id}
                                    showDataStatus={s.dataStatus}
                                    entryId={s.pendingEntry?._id ?? null}
                                    proposedValue={s.pendingEntry?.proposedValue ?? null}
                                    currentValue={s.currentFieldValue}
                                    entityType="show"
                                    entityId={s._id}
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {visibleCount < focusRows.length && (
                    <div className="flex justify-center py-4">
                      <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Load more</button>
                    </div>
                  )}
                </>
              );
            })()
          ) : rows.length === 0 ? (
            // ── Normal mode — empty state ─────────────────────────────────
            <div className="text-gray-500 text-sm">
              No shows match the current filters.
            </div>
          ) : (
            // ── Normal mode — shows table ─────────────────────────────────
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
                            href={`/admin/review/${show._id}?returnTo=${encodeURIComponent(adminPathWithoutSearch)}`}
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
                    href={`/admin/review/${addShowSuccessId}?returnTo=${encodeURIComponent(adminPathWithoutSearch)}`}
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
