"use client";

import { useMutation, useQueries, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from "react";

export type StatusFilter = "needs_review" | "partial" | "complete" | undefined;

const PAGE_SIZE = 50;
const FETCH_LIMIT = 500;

export type FocusGroup = {
  value: string;
  label: string;
  entityType: "show" | "production";
  fields: readonly string[];
  fieldLabels: readonly string[];
};

export const SHOW_FOCUS_GROUPS: FocusGroup[] = [
  { value: "show_type", label: "Type", entityType: "show", fields: ["type", "subtype"], fieldLabels: ["Type", "Subtype"] },
  { value: "show_image", label: "Image", entityType: "show", fields: ["hotlinkImageUrl"], fieldLabels: ["Image URL"] },
];

export const PRODUCTION_FOCUS_GROUPS: FocusGroup[] = [
  { value: "prod_preview_opening", label: "Preview & Opening Dates", entityType: "production", fields: ["previewDate", "openingDate"], fieldLabels: ["Preview Date", "Opening Date"] },
  { value: "prod_closing", label: "Closing Info", entityType: "production", fields: ["closingDate", "isOpenRun", "isClosed"], fieldLabels: ["Closing Date", "Open Run", "Is Closed"] },
  { value: "prod_venue", label: "Venue", entityType: "production", fields: ["theatre", "city"], fieldLabels: ["Theatre", "City"] },
  { value: "prod_running_time", label: "Running Time", entityType: "production", fields: ["runningTime", "intermissionCount", "intermissionMinutes"], fieldLabels: ["Running Time (min)", "Intermissions", "Intermission (min)"] },
  { value: "prod_description", label: "Description", entityType: "production", fields: ["description"], fieldLabels: ["Description"] },
  { value: "prod_poster", label: "Poster Image", entityType: "production", fields: ["hotlinkPosterUrl"], fieldLabels: ["Poster URL"] },
];

export const ALL_FOCUS_GROUPS = [...SHOW_FOCUS_GROUPS, ...PRODUCTION_FOCUS_GROUPS];

export function getFocusGroup(value: string): FocusGroup | undefined {
  return ALL_FOCUS_GROUPS.find((g) => g.value === value);
}

export const SOURCE_LABELS: Record<string, string> = {
  playbill: "Playbill",
  wikipedia: "Wikipedia",
  ticketmaster: "Ticketmaster",
  bot: "Bot",
  seed: "Seed",
  manual: "Manual",
  wikidata: "Wikidata",
};

export type ListRow = {
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

export const SHOW_TYPES = ["musical", "play", "opera", "dance", "revue", "comedy", "magic", "other"] as const;
export type ShowFormType = (typeof SHOW_TYPES)[number];
export type ShowDataStatus = "needs_review" | "partial" | "complete";

export type FocusEditState = { showId: string; entryId: string | null; entityId?: string; value: string };

export function useAdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [focusField, setFocusField] = useState<string>(() => {
    const p = searchParams.get("focus");
    return p !== null && ALL_FOCUS_GROUPS.some((g) => g.value === p) ? p : "";
  });
  const [onlyWithPending, setOnlyWithPending] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "recentQueue">(() =>
    searchParams.get("sort") === "recentQueue" ? "recentQueue" : "name"
  );

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

  // ── Add show modal ────────────────────────────────────────────────────────
  const [newShowName, setNewShowName] = useState("");
  const [newShowType, setNewShowType] = useState<ShowFormType>("musical");
  const [newShowDataStatus, setNewShowDataStatus] = useState<ShowDataStatus>("needs_review");
  const [newShowImage, setNewShowImage] = useState<File | null>(null);
  const [addShowBusy, setAddShowBusy] = useState(false);
  const [addShowError, setAddShowError] = useState<string | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [addShowModalOpen, setAddShowModalOpen] = useState(false);
  const [addShowSubmitIntent, setAddShowSubmitIntent] = useState<"open" | "exit">("open");

  const generateUploadUrl = useMutation(api.reviewQueue.generateShowImageUploadUrl);
  const createShowFromForm = useMutation(api.reviewQueue.createShowFromAdminForm);
  const submitReview = useMutation(api.reviewQueue.submitShowReview);

  useEffect(() => {
    if (!addShowModalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAddShowModalOpen(false); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [addShowModalOpen]);

  async function handleAddMissingShow(e: FormEvent) {
    e.preventDefault();
    setAddShowError(null);
    const name = newShowName.trim();
    if (!name) { setAddShowError("Enter a show name."); return; }
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
        if (!res.ok) throw new Error("Image upload failed. Try a smaller file or different format.");
        const data = (await res.json()) as { storageId: Id<"_storage"> };
        if (!data.storageId) throw new Error("Upload did not return a storage id.");
        imageStorageId = data.storageId;
      }
      const showId = await createShowFromForm({
        name,
        type: newShowType,
        dataStatus: newShowDataStatus,
        imageStorageId,
      });
      setNewShowName("");
      setNewShowType("musical");
      setNewShowDataStatus("needs_review");
      setNewShowImage(null);
      setImageInputKey((k) => k + 1);
      if (addShowSubmitIntent === "exit") {
        setAddShowModalOpen(false);
        return;
      }
      setAddShowModalOpen(false);
      router.push(`/admin/review/${showId}?returnTo=${encodeURIComponent(adminPathWithoutSearch)}`);
    } catch (err) {
      setAddShowError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAddShowBusy(false);
    }
  }

  function openAddShowModal() {
    setAddShowModalOpen(true);
    setAddShowError(null);
    setAddShowSubmitIntent("open");
  }

  function closeAddShowModal() {
    if (addShowBusy) return;
    setAddShowModalOpen(false);
    setAddShowError(null);
  }

  // ── Property Focus mode ───────────────────────────────────────────────────
  const focusGroup = focusField ? getFocusGroup(focusField) : undefined;

  const showFocusArgs = useMemo(() => {
    if (!focusGroup || focusGroup.entityType !== "show") return "skip" as const;
    return {
      fields: [...focusGroup.fields],
      statusFilter,
      search: search.trim() || undefined,
      includeRunning: showRunning,
      includeUpcoming: showUpcoming,
      includeHistorical: showClosed,
      onlyWithPending: onlyWithPending || undefined,
    };
  }, [focusGroup, statusFilter, search, showRunning, showUpcoming, showClosed, onlyWithPending]);

  const productionFocusArgs = useMemo(() => {
    if (!focusGroup || focusGroup.entityType !== "production") return "skip" as const;
    return {
      fields: [...focusGroup.fields],
      statusFilter,
      search: search.trim() || undefined,
      includeRunning: showRunning,
      includeUpcoming: showUpcoming,
      includeHistorical: showClosed,
      onlyWithPending: onlyWithPending || undefined,
    };
  }, [focusGroup, statusFilter, search, showRunning, showUpcoming, showClosed, onlyWithPending]);

  const showFocusListRaw = useQuery(api.reviewQueue.listShowsForFieldReview, showFocusArgs);
  const prodFocusListRaw = useQuery(api.reviewQueue.listShowsWithProductionFieldFocus, productionFocusArgs);
  const focusListRaw = focusGroup
    ? (focusGroup.entityType === "production" ? prodFocusListRaw : showFocusListRaw)
    : undefined;

  // ── Focus inline-edit state ───────────────────────────────────────────────
  const [focusEdit, setFocusEdit] = useState<FocusEditState | null>(null);
  const [focusBusy, setFocusBusy] = useState<Set<string>>(new Set());
  const focusEditRef = useRef<HTMLInputElement>(null) as RefObject<HTMLInputElement>;

  useEffect(() => {
    if (focusEdit) focusEditRef.current?.focus();
  }, [focusEdit]);

  async function handleFocusAction(
    showId: string,
    showDataStatus: string,
    entryId: string | null,
    decision: "approved" | "rejected" | "edited" | "direct",
    value?: string,
    directEntity?: { entityType: "show" | "production"; entityId: string },
    directField?: string,
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
      } else if (decision === "direct" && value !== undefined && directField) {
        const entity = directEntity ?? { entityType: "show" as const, entityId: showId };
        const trimmedVal = value.trim();
        await submitReview({
          showId: showId as Id<"shows">,
          showDataStatus: showDataStatus as "needs_review" | "partial" | "complete",
          entryDecisions: [],
          directEdits: [{
            entityType: entity.entityType,
            entityId: entity.entityId,
            field: directField,
            newValue: trimmedVal === "" ? undefined : trimmedVal,
          }],
        });
        setFocusEdit(null);
      }
    } finally {
      setFocusBusy((prev) => { const s = new Set(prev); s.delete(entryId ?? showId); return s; });
    }
  }

  // ── Main list queries ─────────────────────────────────────────────────────
  const adminQueries = useMemo(() => {
    const listArgs: {
      limit: number; offset: number;
      includeRunning: boolean; includeUpcoming: boolean; includeHistorical: boolean;
      statusFilter?: Exclude<StatusFilter, undefined>;
      search?: string; sortBy?: "name" | "recentQueue";
    } = {
      limit: FETCH_LIMIT, offset: 0,
      includeRunning: showRunning, includeUpcoming: showUpcoming, includeHistorical: showClosed,
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
  const stats = adminResults.stats instanceof Error ? undefined : adminResults.stats;
  const listRaw = adminResults.list;
  const listError = listRaw instanceof Error ? listRaw : null;
  const listResult = listRaw !== undefined && !(listRaw instanceof Error) ? listRaw : undefined;
  const listPage = listResult?.page as ListRow[] | undefined;

  const rows = useMemo(
    () => (listPage ?? []).slice(0, visibleCount),
    [listPage, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, showRunning, showUpcoming, showClosed, search, focusField, onlyWithPending, sortBy]);

  const loading = focusGroup
    ? (focusGroup.entityType === "production" ? prodFocusListRaw === undefined : showFocusListRaw === undefined)
    : listRaw === undefined;
  const totalFiltered = focusField
    ? (focusListRaw instanceof Error ? 0 : (focusListRaw?.length ?? 0))
    : (listPage?.length ?? 0);
  const hasMore = visibleCount < totalFiltered;
  const pageLen = listResult?.page?.length ?? 0;
  const truncated = !focusField && pageLen >= FETCH_LIMIT && (listResult?.total ?? 0) > pageLen;

  return {
    // filter state
    statusFilter, setStatusFilter,
    showRunning, setShowRunning,
    showUpcoming, setShowUpcoming,
    showClosed, setShowClosed,
    search, setSearch,
    focusField, setFocusField,
    onlyWithPending, setOnlyWithPending,
    sortBy, setSortBy,
    visibleCount, setVisibleCount,
    // derived
    adminPathWithoutSearch,
    focusGroup,
    loading,
    rows,
    totalFiltered,
    hasMore,
    truncated,
    // data
    stats,
    listError,
    focusListRaw,
    // focus edit
    focusEdit, setFocusEdit,
    focusBusy,
    focusEditRef,
    handleFocusAction,
    // add show modal
    addShowModalOpen,
    newShowName, setNewShowName,
    newShowType, setNewShowType,
    newShowDataStatus, setNewShowDataStatus,
    newShowImage, setNewShowImage,
    addShowBusy,
    addShowError,
    imageInputKey,
    setAddShowSubmitIntent,
    handleAddMissingShow,
    openAddShowModal,
    closeAddShowModal,
  };
}
