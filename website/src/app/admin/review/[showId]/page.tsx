"use client";

import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { sanitizeAdminReturnTo } from "../../adminReturnTo";
import type React from "react";

type Decision = "approved" | "rejected" | "edited";
type DataStatus = "needs_review" | "partial" | "complete";

interface EntryDecision {
  entryId: string;
  decision: Decision;
  reviewedValue?: string;
  note?: string;
}

interface DirectEdit {
  entityType: "show" | "production";
  entityId: string;
  field: string;
  newValue?: string;
}

const editKey = (
  entityType: "show" | "production",
  entityId: string,
  field: string
) => `${entityType}:${entityId}:${field}`;

function normFieldStr(v: string | undefined | null): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

/** Convex storage file id from admin upload — not an http(s) URL. */
function looksLikeStorageId(s: string | undefined): boolean {
  if (!s) return false;
  if (s.length < 20 || s.length > 64) return false;
  if (s.includes("://") || s.includes("/") || s.includes(" ")) return false;
  return /^[a-z0-9_-]+$/i.test(s);
}

function ImageUploadControl({
  disabled,
  onUploaded,
}: {
  disabled?: boolean;
  onUploaded: (storageId: string) => void;
}) {
  const generateUrl = useMutation(api.reviewQueue.generateShowImageUploadUrl);
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || disabled || busy) return;
    setBusy(true);
    try {
      const postUrl = await generateUrl();
      const res = await fetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!res.ok) throw new Error("upload failed");
      const data = (await res.json()) as { storageId?: string };
      if (!data.storageId) throw new Error("no storage id");
      onUploaded(data.storageId);
      setInputKey((k) => k + 1);
    } catch {
      window.alert("Image upload failed. Try a smaller file or another format.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        key={inputKey}
        type="file"
        accept="image/*"
        disabled={disabled || busy}
        onChange={onFileChange}
        className="block w-full text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-200 file:px-2 file:py-1 file:text-xs"
      />
      {busy ? (
        <span className="text-xs text-gray-500">Uploading…</span>
      ) : null}
    </div>
  );
}

function ResolvedImagePreview({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className: string;
}) {
  const isId = looksLikeStorageId(value);
  const fromStorage = useQuery(
    api.reviewQueue.storagePreviewUrl,
    isId ? { storageId: value as Id<"_storage"> } : "skip"
  );
  const src = isId ? (fromStorage ?? undefined) : value;
  if (!src) {
    return isId ? (
      <span className="text-xs text-gray-400">Loading preview…</span>
    ) : null;
  }
  return <img src={src} alt={label} className={className} />;
}

interface FieldDef {
  field: string;
  label: string;
  isImage?: boolean;
  /** Use Convex file upload instead of a URL field (show / production key art). */
  imageUpload?: boolean;
  /** Required fields — never show a Missing badge or a Clear button */
  alwaysPresent?: boolean;
  inputType?: "text" | "select" | "date" | "url" | "textarea" | "boolean";
  options?: string[];
}

const STATUS_OPTIONS: { value: DataStatus; label: string }[] = [
  { value: "needs_review", label: "Unpublished" },
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" },
];

const REVIEWED_STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  edited: "bg-blue-50 text-blue-700 border-blue-200",
};

const SHOW_FIELDS: FieldDef[] = [
  { field: "name", label: "Name", alwaysPresent: true, inputType: "text" },
  {
    field: "type",
    label: "Type",
    alwaysPresent: true,
    inputType: "select",
    options: ["musical", "play", "opera", "dance", "other"],
  },
  { field: "subtype", label: "Sub-type", inputType: "text" },
  { field: "runningTime", label: "Running Time (min)", inputType: "text" },
  { field: "intermissionCount", label: "Intermissions", inputType: "text" },
  { field: "description", label: "Description", inputType: "textarea" },
  {
    field: "hotlinkImageUrl",
    label: "Image",
    isImage: true,
    imageUpload: true,
    inputType: "text",
  },
  {
    field: "hotlinkImageSource",
    label: "Image Source",
    inputType: "select",
    options: ["wikipedia", "ticketmaster"],
  },
  { field: "wikipediaTitle", label: "Wikipedia Title", inputType: "text" },
  {
    field: "ticketmasterAttractionId",
    label: "Ticketmaster ID",
    inputType: "text",
  },
];

const PRODUCTION_FIELDS: FieldDef[] = [
  { field: "theatre", label: "Theatre", inputType: "text" },
  { field: "city", label: "City", inputType: "text" },
  {
    field: "district",
    label: "District",
    alwaysPresent: true,
    inputType: "select",
    options: [
      "broadway",
      "off_broadway",
      "off_off_broadway",
      "west_end",
      "touring",
      "regional",
      "other",
    ],
  },
  { field: "previewDate", label: "Preview Date", inputType: "date" },
  { field: "openingDate", label: "Opening Date", inputType: "date" },
  { field: "closingDate", label: "Closing Date", inputType: "date" },
  { field: "isOpenRun", label: "Open Run", inputType: "boolean" },
  { field: "isClosed", label: "Closed", inputType: "boolean" },
  {
    field: "productionType",
    label: "Production Type",
    alwaysPresent: true,
    inputType: "select",
    options: [
      "original",
      "revival",
      "transfer",
      "touring",
      "concert",
      "workshop",
      "other",
    ],
  },
  {
    field: "hotlinkPosterUrl",
    label: "Poster Image",
    isImage: true,
    imageUpload: true,
    inputType: "text",
  },
  {
    field: "ticketmasterEventUrl",
    label: "Ticketmaster URL",
    inputType: "url",
  },
  { field: "playbillProductionId", label: "Playbill Production ID", inputType: "text" },
  { field: "notes", label: "Notes", inputType: "textarea" },
];

// ─── Auto-detect helpers ──────────────────────────────────────────────────────

type ShowDetail = {
  _id: string;
  hotlinkImageUrl?: string;
  /** Resolved image URLs from the server (hotlink, storage, or production fallback). */
  images?: string[];
};

type ShowQueueEntry = {
  _id: string;
  field: string;
  currentValue?: string;
  status: string;
};

type ProdDoc = {
  theatre?: string;
  city?: string;
  openingDate?: string;
  closingDate?: string;
};

/** Apply pending queue decisions so auto-detect sees values that are not on the doc yet. */
function applyPendingDecisionsToShowImage(
  show: ShowDetail,
  entries: ShowQueueEntry[],
  decisions: Map<string, EntryDecision>
): { hotlinkImageUrl?: string; images?: string[] } {
  let hotlink = show.hotlinkImageUrl;
  const images = show.images ? [...show.images] : [];
  for (const e of entries) {
    if (e.status !== "pending" || e.field !== "hotlinkImageUrl") continue;
    const d = decisions.get(e._id);
    if (d?.decision === "approved" && e.currentValue)
      hotlink = hotlink || e.currentValue;
    if (d?.decision === "edited") {
      hotlink = d.reviewedValue ?? e.currentValue ?? hotlink;
    }
  }
  return { hotlinkImageUrl: hotlink, images };
}

function computeShowDataStatus(
  show: ShowDetail,
  entries: ShowQueueEntry[],
  decisions: Map<string, EntryDecision>,
  directEdits: Map<string, DirectEdit>
): DataStatus {
  const applied = applyPendingDecisionsToShowImage(show, entries, decisions);
  let hotlink = applied.hotlinkImageUrl;
  const imgArr = applied.images;
  const de = directEdits.get(editKey("show", show._id, "hotlinkImageUrl"));
  if (de !== undefined) hotlink = de.newValue;
  const deImages = directEdits.get(editKey("show", show._id, "images"));
  const hasImage = !!(
    hotlink ||
    (Array.isArray(imgArr) && imgArr.length > 0) ||
    deImages?.newValue
  );
  return hasImage ? "complete" : "partial";
}

function mergeProductionFromDecisions(
  prod: Record<string, unknown>,
  reviewEntries: Array<{
    _id: string;
    field: string;
    currentValue?: string;
    status: string;
  }>,
  decisions: Map<string, EntryDecision>,
  directEdits: Map<string, DirectEdit>,
  prodId: string
): ProdDoc {
  const out: Record<string, unknown> = { ...prod };
  for (const e of reviewEntries) {
    if (e.status !== "pending") continue;
    const d = decisions.get(e._id);
    if (d?.decision === "approved" && e.currentValue !== undefined && e.currentValue !== "")
      out[e.field] = e.currentValue;
    if (d?.decision === "edited") {
      const v = d.reviewedValue ?? e.currentValue;
      if (v !== undefined) out[e.field] = v;
    }
  }
  for (const edit of directEdits.values()) {
    if (edit.entityType === "production" && edit.entityId === prodId) {
      if (edit.newValue === undefined) delete out[edit.field];
      else out[edit.field] = edit.newValue;
    }
  }
  return out as ProdDoc;
}

/**
 * Effective production fields for admin preview (venue match, etc.): includes
 * pending queue values before submit, and respects Approve / Edit / Reject choices.
 */
function mergeProductionForVenuePreview(
  prod: Record<string, unknown>,
  reviewEntries: Array<{
    _id: string;
    field: string;
    currentValue?: string;
    status: string;
  }>,
  decisions: Map<string, EntryDecision>,
  directEdits: Map<string, DirectEdit>,
  prodId: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...prod };
  for (const e of reviewEntries) {
    if (e.status !== "pending") continue;
    const d = decisions.get(e._id);
    if (d?.decision === "rejected") continue;

    if (d?.decision === "approved") {
      if (e.currentValue !== undefined && e.currentValue !== "") {
        out[e.field] = e.currentValue;
      }
    } else if (d?.decision === "edited") {
      const v = d.reviewedValue ?? e.currentValue;
      if (v !== undefined) {
        if (v === "") delete out[e.field];
        else out[e.field] = v;
      }
    } else if (e.currentValue !== undefined) {
      if (e.currentValue === "") delete out[e.field];
      else out[e.field] = e.currentValue;
    }
  }
  for (const edit of directEdits.values()) {
    if (edit.entityType === "production" && edit.entityId === prodId) {
      if (edit.newValue === undefined) delete out[edit.field];
      else out[edit.field] = edit.newValue;
    }
  }
  return out;
}

function VenueMatchBadge({ theatreName }: { theatreName: string }) {
  const trimmed = theatreName.trim();
  const match = useQuery(
    api.reviewQueue.findVenueMatchPreview,
    trimmed ? { theatreName: trimmed } : "skip"
  );
  if (!trimmed) return null;
  if (match === undefined) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs text-gray-400 shrink-0">
        Checking venue…
      </span>
    );
  }
  if (match) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs text-teal-700 shrink-0">
        ✓ {match.name}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-500 shrink-0">
      No venue match
    </span>
  );
}

function computeProductionStatus(prod: ProdDoc): DataStatus {
  const hasTheatre = !!prod.theatre;
  const hasCity = !!prod.city;
  const hasDate = !!(prod.openingDate || prod.closingDate);
  return hasTheatre && hasCity && hasDate ? "complete" : "partial";
}

function computeProductionDataStatus(
  prod: Record<string, unknown>,
  reviewEntries: Array<{
    _id: string;
    field: string;
    currentValue?: string;
    status: string;
  }>,
  decisions: Map<string, EntryDecision>,
  directEdits: Map<string, DirectEdit>,
  prodId: string
): DataStatus {
  return computeProductionStatus(
    mergeProductionFromDecisions(
      prod,
      reviewEntries,
      decisions,
      directEdits,
      prodId
    )
  );
}

// ─── Field value normalisation ────────────────────────────────────────────────

/**
 * Normalises a raw document field value to string | undefined so the rest of
 * the UI can treat every value uniformly.  Booleans become "true" / "false"
 * and are displayed as "Yes" / "No" by FieldRow.
 */
function getFieldValue(
  doc: Record<string, unknown>,
  field: string
): string | undefined {
  const raw = doc[field];
  if (raw === true) return "true";
  if (raw === false) return "false";
  if (raw === null || raw === undefined) return undefined;
  return String(raw);
}

function ShowReviewDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showId = params.showId as string;
  const adminReturnTo = sanitizeAdminReturnTo(searchParams.get("returnTo"));

  const navigateToAdminList = () => {
    if (adminReturnTo) {
      router.push(adminReturnTo);
      return;
    }
    router.back();
  };

  const detail = useQuery(
    api.reviewQueue.getShowReviewDetail,
    showId ? { showId: showId as Id<"shows"> } : "skip"
  );
  const submitReview = useMutation(api.reviewQueue.submitShowReview);
  const createProduction = useMutation(api.reviewQueue.createProductionFromAdminForm);
  const deleteProductionAdmin = useMutation(api.reviewQueue.deleteProductionAdmin);
  const deleteShowAdmin = useMutation(api.reviewQueue.deleteShowAdmin);

  const [decisions, setDecisions] = useState<Map<string, EntryDecision>>(
    new Map()
  );
  const [editValues, setEditValues] = useState<Map<string, string>>(new Map());
  // Direct edits: staged but not yet submitted patches to any field
  const [directEdits, setDirectEdits] = useState<Map<string, DirectEdit>>(
    new Map()
  );
  const [showDataStatus, setShowDataStatus] =
    useState<DataStatus>("needs_review");
  const [productionStatuses, setProductionStatuses] = useState<
    Map<string, DataStatus>
  >(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [expandedProductions, setExpandedProductions] = useState<Set<string>>(
    new Set()
  );

  const [newProductionOpen, setNewProductionOpen] = useState(false);
  const [newProdBusy, setNewProdBusy] = useState(false);
  const [newProdTheatre, setNewProdTheatre] = useState("");
  const [newProdCity, setNewProdCity] = useState("");
  const [newProdDistrict, setNewProdDistrict] = useState<string>("broadway");
  const [newProdPreview, setNewProdPreview] = useState("");
  const [newProdOpening, setNewProdOpening] = useState("");
  const [newProdClosing, setNewProdClosing] = useState("");
  const [newProdIsOpenRun, setNewProdIsOpenRun] = useState(false);
  const [newProdIsClosed, setNewProdIsClosed] = useState(false);
  const [newProdType, setNewProdType] = useState<string>("original");
  const [newProdNotes, setNewProdNotes] = useState("");
  const [newProdTmUrl, setNewProdTmUrl] = useState("");
  const [newProdPosterId, setNewProdPosterId] = useState<string | undefined>();
  const [deletingProductionId, setDeletingProductionId] = useState<string | null>(
    null
  );
  const [deleteShowBusy, setDeleteShowBusy] = useState(false);

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

  const stageDirectEdit = useCallback((edit: DirectEdit) => {
    setDirectEdits((prev) => {
      const next = new Map(prev);
      next.set(editKey(edit.entityType, edit.entityId, edit.field), edit);
      return next;
    });
  }, []);

  const unstageDirectEdit = useCallback(
    (entityType: "show" | "production", entityId: string, field: string) => {
      setDirectEdits((prev) => {
        const next = new Map(prev);
        next.delete(editKey(entityType, entityId, field));
        return next;
      });
    },
    []
  );

  const approveAllShow = useCallback(() => {
    if (!detail) return;
    const pending = detail.showReviewEntries.filter(
      (e) => e.status === "pending"
    );
    const next = new Map(decisions);
    for (const e of pending) {
      next.set(e._id, { entryId: e._id, decision: "approved" });
    }
    setDecisions(next);
    setShowDataStatus(
      computeShowDataStatus(
        detail.show,
        detail.showReviewEntries,
        next,
        directEdits
      )
    );
  }, [detail, decisions, directEdits]);

  const inferShowDataStatus = useCallback(() => {
    if (!detail) return;
    setShowDataStatus(
      computeShowDataStatus(
        detail.show,
        detail.showReviewEntries,
        decisions,
        directEdits
      )
    );
  }, [detail, decisions, directEdits]);

  const approveAllForProduction = useCallback(
    (prodId: string, prod: Record<string, unknown> & { reviewEntries: Array<{ _id: string; status: string; field: string; currentValue?: string }> }) => {
      const pending = prod.reviewEntries.filter((e) => e.status === "pending");
      const next = new Map(decisions);
      for (const e of pending) {
        next.set(e._id, { entryId: e._id, decision: "approved" });
      }
      setDecisions(next);
      setProductionStatuses((prev) =>
        new Map(prev).set(
          prodId,
          computeProductionDataStatus(
            prod,
            prod.reviewEntries,
            next,
            directEdits,
            prodId
          )
        )
      );
    },
    [decisions, directEdits]
  );

  const handleCreateProduction = async () => {
    const theatre = newProdTheatre.trim();
    if (!theatre) {
      window.alert("Theatre is required.");
      return;
    }
    setNewProdBusy(true);
    try {
      await createProduction({
        showId: showId as Id<"shows">,
        theatre,
        city: newProdCity.trim() || undefined,
        district: newProdDistrict as
          | "broadway"
          | "off_broadway"
          | "off_off_broadway"
          | "west_end"
          | "touring"
          | "regional"
          | "other",
        previewDate: newProdPreview.trim() || undefined,
        openingDate: newProdOpening.trim() || undefined,
        closingDate: newProdClosing.trim() || undefined,
        isOpenRun: newProdIsOpenRun ? true : undefined,
        isClosed: newProdIsClosed ? true : undefined,
        productionType: newProdType as
          | "original"
          | "revival"
          | "transfer"
          | "touring"
          | "concert"
          | "workshop"
          | "other",
        notes: newProdNotes.trim() || undefined,
        ticketmasterEventUrl: newProdTmUrl.trim() || undefined,
        posterStorageId: newProdPosterId
          ? (newProdPosterId as Id<"_storage">)
          : undefined,
      });
      setNewProductionOpen(false);
      setNewProdTheatre("");
      setNewProdCity("");
      setNewProdDistrict("broadway");
      setNewProdPreview("");
      setNewProdOpening("");
      setNewProdClosing("");
      setNewProdIsOpenRun(false);
      setNewProdType("original");
      setNewProdNotes("");
      setNewProdTmUrl("");
      setNewProdPosterId(undefined);
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Failed to create production"
      );
    } finally {
      setNewProdBusy(false);
    }
  };

  const handleDeleteProduction = async (prodId: string, label: string) => {
    if (
      !window.confirm(
        `Delete production "${label.trim() || "this run"}"? This cannot be undone. Blocked if any visit is tied to this production.`
      )
    ) {
      return;
    }
    setDeletingProductionId(prodId);
    try {
      await deleteProductionAdmin({
        productionId: prodId as Id<"productions">,
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingProductionId(null);
    }
  };

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
      const directEditsArr = Array.from(directEdits.values());

      await submitReview({
        showId: showId as Id<"shows">,
        showDataStatus,
        entryDecisions,
        productionStatuses: prodStatuses,
        directEdits: directEditsArr,
      });
      navigateToAdminList();
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
  const pendingTotalCount =
    pendingShowCount +
    productions.reduce(
      (sum, p) => sum + p.reviewEntries.filter((e) => e.status === "pending").length,
      0
    );
  const dirtyCount = directEdits.size;

  const handleDeleteShow = async () => {
    if (
      !window.confirm(
        `Delete "${show.name}" and all ${productions.length} production(s) from the catalog? This cannot be undone. The server will refuse if visits, lists, trips, or other user data still reference this show.`
      )
    ) {
      return;
    }
    setDeleteShowBusy(true);
    try {
      await deleteShowAdmin({ showId: showId as Id<"shows"> });
      router.push(adminReturnTo ?? "/admin");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteShowBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32">
      <button
        onClick={() => navigateToAdminList()}
        className="text-sm text-gray-500 hover:text-gray-900 mb-6 block"
      >
        &larr; Back to dashboard
      </button>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{show.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pendingTotalCount > 0 && (
            <span className="text-amber-600 font-medium">
              {pendingTotalCount} pending
            </span>
          )}
          {pendingTotalCount > 0 && dirtyCount > 0 && (
            <span className="mx-1.5 text-gray-300">·</span>
          )}
          {dirtyCount > 0 && (
            <span className="text-yellow-600 font-medium">
              {dirtyCount} staged edit{dirtyCount !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      {/* Show fields */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3 border-b pb-2">
          Show Data
          {pendingShowCount > 0 && (
            <span className="ml-2 text-sm font-normal text-amber-600">
              ({pendingShowCount} pending)
            </span>
          )}
        </h2>
        <div className="space-y-2">
          {SHOW_FIELDS.map(
            ({
              field,
              label,
              isImage,
              imageUpload,
              alwaysPresent,
              inputType,
              options,
            }) => {
              const raw = getFieldValue(show as Record<string, unknown>, field);
              const value =
                field === "hotlinkImageUrl"
                  ? raw ??
                    (Array.isArray(show.images) && show.images[0]
                      ? String(show.images[0])
                      : undefined)
                  : raw;
              const entry = showReviewEntries.find((e) => e.field === field);
              const stagedEdit =
                field === "hotlinkImageUrl"
                  ? directEdits.get(editKey("show", show._id, "images")) ??
                    directEdits.get(editKey("show", show._id, field))
                  : directEdits.get(editKey("show", show._id, field));
              return (
                <FieldRow
                  key={field}
                  label={label}
                  value={value}
                  isImage={isImage}
                  imageUpload={imageUpload}
                  alwaysPresent={alwaysPresent}
                  inputType={inputType}
                  options={options}
                  entry={entry}
                  stagedEdit={stagedEdit}
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
                  onStageEdit={(newValue) =>
                    stageDirectEdit({
                      entityType: "show",
                      entityId: show._id,
                      field:
                        field === "hotlinkImageUrl" ? "images" : field,
                      newValue,
                    })
                  }
                  onUnstageEdit={() => {
                    if (field === "hotlinkImageUrl") {
                      unstageDirectEdit("show", show._id, "images");
                      unstageDirectEdit("show", show._id, "hotlinkImageUrl");
                    } else {
                      unstageDirectEdit("show", show._id, field);
                    }
                  }}
                />
              );
            }
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 mt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-sm font-medium text-gray-700 shrink-0">
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
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={inferShowDataStatus}
              className="rounded-md bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Auto-detect from data
            </button>
            {pendingShowCount > 0 && (
              <button
                type="button"
                onClick={approveAllShow}
                className="rounded-md bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
              >
                Approve All
              </button>
            )}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-red-100">
          <p className="text-xs text-gray-600 mb-2">
            Remove this show and every production from the catalog. The server
            blocks the delete if visits, lists, trip plans, rankings, feed
            posts, or AI history still reference the show.
          </p>
          <button
            type="button"
            onClick={() => void handleDeleteShow()}
            disabled={deleteShowBusy || submitting}
            className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteShowBusy ? "Deleting…" : "Delete show"}
          </button>
        </div>
      </section>

      {/* Productions */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b pb-2">
          <h2 className="text-lg font-semibold">
            Productions ({productions.length})
          </h2>
          <button
            type="button"
            onClick={() => setNewProductionOpen((o) => !o)}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 shrink-0"
          >
            {newProductionOpen ? "Cancel" : "Add production"}
          </button>
        </div>

        {newProductionOpen ? (
          <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 space-y-3">
            <p className="text-xs text-gray-600">
              Creates a run with status <strong>needs review</strong>. Use
              Submit Review when you are ready to approve queue entries and set
              catalog status.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-700">
                  Theatre *
                </span>
                <input
                  type="text"
                  value={newProdTheatre}
                  onChange={(e) => setNewProdTheatre(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="e.g. Lunt-Fontanne Theatre"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">City</span>
                <input
                  type="text"
                  value={newProdCity}
                  onChange={(e) => setNewProdCity(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="New York"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  District
                </span>
                <select
                  value={newProdDistrict}
                  onChange={(e) => setNewProdDistrict(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                >
                  {(
                    [
                      "broadway",
                      "off_broadway",
                      "off_off_broadway",
                      "west_end",
                      "touring",
                      "regional",
                      "other",
                    ] as const
                  ).map((d) => (
                    <option key={d} value={d}>
                      {d.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Preview date
                </span>
                <input
                  type="date"
                  value={newProdPreview}
                  onChange={(e) => setNewProdPreview(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Opening date
                </span>
                <input
                  type="date"
                  value={newProdOpening}
                  onChange={(e) => setNewProdOpening(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Closing date
                </span>
                <input
                  type="date"
                  value={newProdClosing}
                  onChange={(e) => setNewProdClosing(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  checked={newProdIsOpenRun}
                  onChange={(e) => setNewProdIsOpenRun(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Open run</span>
              </label>
              <label className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  checked={newProdIsClosed}
                  onChange={(e) => setNewProdIsClosed(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Closed</span>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-700">
                  Production type
                </span>
                <select
                  value={newProdType}
                  onChange={(e) => setNewProdType(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                >
                  {(
                    [
                      "original",
                      "revival",
                      "transfer",
                      "touring",
                      "concert",
                      "workshop",
                      "other",
                    ] as const
                  ).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-700">
                  Ticketmaster URL
                </span>
                <input
                  type="url"
                  value={newProdTmUrl}
                  onChange={(e) => setNewProdTmUrl(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="https://..."
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-700">Notes</span>
                <textarea
                  value={newProdNotes}
                  onChange={(e) => setNewProdNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </label>
              <div className="block sm:col-span-2">
                <span className="text-xs font-medium text-gray-700">
                  Poster (optional)
                </span>
                <div className="mt-1">
                  <ImageUploadControl
                    disabled={newProdBusy}
                    onUploaded={(storageId) => setNewProdPosterId(storageId)}
                  />
                </div>
                {newProdPosterId ? (
                  <p className="text-xs text-green-700 mt-1">Poster uploaded.</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleCreateProduction}
                disabled={newProdBusy || !newProdTheatre.trim()}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {newProdBusy ? "Creating…" : "Create production"}
              </button>
            </div>
          </div>
        ) : null}

        {productions.length === 0 ? (
          <p className="text-gray-500 text-sm mb-2">
            No productions for this show yet.
          </p>
        ) : null}

        <div className="space-y-4">
            {productions.map((prod) => {
              const isExpanded = expandedProductions.has(prod._id);
              const pendingCount = prod.reviewEntries.filter(
                (e) => e.status === "pending"
              ).length;
              const prodStagedCount = Array.from(directEdits.keys()).filter(
                (k) => k.startsWith(`production:${prod._id}:`)
              ).length;
              const previewProd = mergeProductionForVenuePreview(
                prod as Record<string, unknown>,
                prod.reviewEntries,
                decisions,
                directEdits,
                prod._id
              );
              const venuePreviewTheatre = String(
                previewProd.theatre ?? ""
              ).trim();

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
                      {prodStagedCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          {prodStagedCount} staged
                        </span>
                      )}
                      <span className="text-gray-400 text-sm">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 py-4 space-y-2">
                      {PRODUCTION_FIELDS.map(
                        ({
                          field,
                          label,
                          isImage,
                          imageUpload,
                          alwaysPresent,
                          inputType,
                          options,
                        }) => {
                          const raw = getFieldValue(
                            prod as Record<string, unknown>,
                            field
                          );
                          const value =
                            field === "hotlinkPosterUrl"
                              ? raw ??
                                (typeof prod.posterUrl === "string"
                                  ? prod.posterUrl
                                  : undefined)
                              : raw;
                          const entry = prod.reviewEntries.find(
                            (e) => e.field === field
                          );
                          const stagedEdit =
                            field === "hotlinkPosterUrl"
                              ? directEdits.get(
                                  editKey("production", prod._id, "posterImage")
                                ) ??
                                directEdits.get(
                                  editKey("production", prod._id, field)
                                )
                              : directEdits.get(
                                  editKey("production", prod._id, field)
                                );

                          const extraBadge =
                            field === "theatre" ? (
                              <VenueMatchBadge
                                theatreName={venuePreviewTheatre}
                              />
                            ) : undefined;

                          return (
                            <FieldRow
                              key={field}
                              label={label}
                              value={value}
                              isImage={isImage}
                              imageUpload={imageUpload}
                              alwaysPresent={alwaysPresent}
                              inputType={inputType}
                              options={options}
                              entry={entry}
                              stagedEdit={stagedEdit}
                              extraBadge={extraBadge}
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
                              onStageEdit={(newValue) =>
                                stageDirectEdit({
                                  entityType: "production",
                                  entityId: prod._id,
                                  field:
                                    field === "hotlinkPosterUrl"
                                      ? "posterImage"
                                      : field,
                                  newValue,
                                })
                              }
                              onUnstageEdit={() => {
                                if (field === "hotlinkPosterUrl") {
                                  unstageDirectEdit(
                                    "production",
                                    prod._id,
                                    "posterImage"
                                  );
                                  unstageDirectEdit(
                                    "production",
                                    prod._id,
                                    "hotlinkPosterUrl"
                                  );
                                } else {
                                  unstageDirectEdit(
                                    "production",
                                    prod._id,
                                    field
                                  );
                                }
                              }}
                            />
                          );
                        }
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 mt-3 border-t border-gray-200">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span className="text-sm font-medium text-gray-700 shrink-0">
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
                                  productionStatuses.get(prod._id) ===
                                  opt.value
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
                        {pendingCount > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              approveAllForProduction(prod._id, prod)
                            }
                            className="rounded-md bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors shrink-0"
                          >
                            Approve All
                          </button>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-red-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-xs text-gray-600">
                          Remove this run from the catalog. Blocked if any user
                          visit is linked to this production.
                        </p>
                        <button
                          type="button"
                          disabled={
                            deletingProductionId === prod._id || submitting
                          }
                          onClick={() =>
                            void handleDeleteProduction(
                              prod._id,
                              [prod.theatre, prod.city].filter(Boolean).join(", ")
                            )
                          }
                          className="shrink-0 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingProductionId === prod._id
                            ? "Deleting…"
                            : "Delete production"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-end gap-4">
          <button
            type="button"
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

export default function ShowReviewDetail() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      }
    >
      <ShowReviewDetailInner />
    </Suspense>
  );
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

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
  imageUpload,
  alwaysPresent,
  inputType = "text",
  options,
  entry,
  stagedEdit,
  extraBadge,
  decision,
  editValue,
  onDecision,
  onEditValueChange,
  onStageEdit,
  onUnstageEdit,
}: {
  label: string;
  value: string | undefined;
  isImage?: boolean;
  imageUpload?: boolean;
  alwaysPresent?: boolean;
  inputType?: "text" | "select" | "date" | "url" | "textarea" | "boolean";
  options?: string[];
  entry?: QueueEntry;
  stagedEdit?: { newValue?: string };
  extraBadge?: React.ReactNode;
  decision?: EntryDecision;
  editValue?: string;
  onDecision?: (decision: Decision, reviewedValue?: string) => void;
  onEditValueChange?: (value: string) => void;
  onStageEdit: (newValue?: string) => void;
  onUnstageEdit: () => void;
}) {
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  /** Snapshot of displayed value when opening direct (non-queue) inline edit — for Cancel. */
  const inlineEditBaselineRef = useRef<string | null>(null);
  const hasStagedEdit = stagedEdit !== undefined;

  const currentDecision = decision?.decision;
  const isEditing = currentDecision === "edited";

  const startInlineEdit = () => {
    const dv = hasStagedEdit ? stagedEdit?.newValue : value;
    inlineEditBaselineRef.current = normFieldStr(dv);
    setIsInlineEditing(true);
  };

  const doneInlineEdit = () => {
    inlineEditBaselineRef.current = null;
    setIsInlineEditing(false);
  };

  const cancelInlineEdit = () => {
    const baseline = inlineEditBaselineRef.current;
    inlineEditBaselineRef.current = null;
    setIsInlineEditing(false);
    if (baseline === null) return;
    const dbNorm = normFieldStr(value);
    if (baseline === dbNorm) {
      onUnstageEdit();
    } else {
      onStageEdit(baseline === "" ? undefined : baseline);
    }
  };

  const imgPendingClass =
    "max-h-48 rounded border border-gray-200 bg-gray-50 object-contain";
  const imgCompactClass =
    "max-h-24 rounded border border-gray-200 object-contain";
  const imgPreviewClass =
    "mt-2 max-h-32 rounded border border-gray-200 object-contain";

  // ── Pending queue entry: full Approve / Edit / Reject card ────────────────
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
          <ResolvedImagePreview value={value} label={label} className={imgPendingClass} />
        ) : (
          <div className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 break-all">
            {value ?? <span className="text-gray-400 italic">Empty</span>}
          </div>
        )}

        {isEditing && (
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-600 block mb-1">
              {isImage && imageUpload
                ? "Upload replacement image"
                : isImage
                  ? "New image URL"
                  : "New value"}
            </label>
            {isImage && imageUpload ? (
              <ImageUploadControl
                onUploaded={(id) => {
                  onEditValueChange?.(id);
                  onDecision?.("edited", id);
                }}
              />
            ) : (
              <FieldInput
                inputType={inputType}
                options={options}
                value={editValue ?? value ?? ""}
                onChange={(v) => {
                  onEditValueChange?.(v);
                  onDecision?.("edited", v);
                }}
              />
            )}
            {isImage && editValue ? (
              <ResolvedImagePreview
                value={editValue}
                label="Preview"
                className={imgPreviewClass}
              />
            ) : null}
          </div>
        )}
      </div>
    );
  }

  // ── Compact row for reviewed / unqueued fields ────────────────────────────

  const displayValue = hasStagedEdit ? stagedEdit?.newValue : value;
  const displayIsEmpty =
    displayValue === undefined || displayValue === null || displayValue === "";

  const statusBadge = hasStagedEdit ? (
    <span className="inline-flex items-center rounded-full bg-yellow-50 border border-yellow-300 px-2 py-0.5 text-xs font-medium text-yellow-700">
      Staged
    </span>
  ) : entry ? (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
        REVIEWED_STATUS_STYLES[entry.status] ??
        "bg-gray-50 text-gray-500 border-gray-200"
      }`}
    >
      {entry.status}
    </span>
  ) : displayIsEmpty && !alwaysPresent ? (
    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
      Missing
    </span>
  ) : null;

  if (isInlineEditing) {
    if (imageUpload && isImage) {
      return (
        <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <button
              type="button"
              onClick={cancelInlineEdit}
              className="rounded-md bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-600 mb-2">Choose a file to stage as the new image.</p>
          <ImageUploadControl
            onUploaded={(id) => {
              onStageEdit(id);
              doneInlineEdit();
            }}
          />
        </div>
      );
    }

    const liveDirectValue = hasStagedEdit
      ? normFieldStr(stagedEdit?.newValue)
      : normFieldStr(value);

    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={doneInlineEdit}
              className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
            >
              Done
            </button>
            <button
              type="button"
              onClick={cancelInlineEdit}
              className="rounded-md bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
        <FieldInput
          inputType={inputType}
          options={options}
          value={liveDirectValue}
          onChange={(v) => onStageEdit(v === "" ? undefined : v)}
          autoFocus
        />
        {isImage && liveDirectValue ? (
          <ResolvedImagePreview
            value={liveDirectValue}
            label="Preview"
            className={imgPreviewClass}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        hasStagedEdit ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50 hover:bg-gray-100"
      }`}
    >
      <span className="font-medium text-gray-600 w-36 shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex-1 min-w-0">
        {isImage && displayValue ? (
          <ResolvedImagePreview
            value={displayValue}
            label={label}
            className={imgCompactClass}
          />
        ) : (
          <span
            className={`break-all ${displayIsEmpty ? "text-gray-400 italic" : "text-gray-800"}`}
          >
            {displayIsEmpty
              ? "—"
              : displayValue === "true"
                ? "Yes"
                : displayValue === "false"
                  ? "No"
                  : displayValue}
          </span>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
        {extraBadge}
        {statusBadge}
        {hasStagedEdit ? (
          <button
            type="button"
            onClick={onUnstageEdit}
            className="opacity-0 group-hover:opacity-100 rounded px-2 py-0.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-all"
          >
            Undo
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={startInlineEdit}
              className="opacity-0 group-hover:opacity-100 rounded px-2 py-0.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-all"
            >
              Edit
            </button>
            {!displayIsEmpty && !alwaysPresent && (
              <button
                type="button"
                onClick={() => onStageEdit(undefined)}
                className="opacity-0 group-hover:opacity-100 rounded px-2 py-0.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 transition-all"
              >
                Clear
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── FieldInput: renders the right input type for a field ─────────────────────

function FieldInput({
  inputType,
  options,
  value,
  onChange,
  autoFocus,
}: {
  inputType?: "text" | "select" | "date" | "url" | "textarea" | "boolean";
  options?: string[];
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const base =
    "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white";

  if (inputType === "boolean") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className={base}
      >
        <option value="">— Unknown</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (inputType === "select" && options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className={base}
      >
        <option value="">— select —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    );
  }

  if (inputType === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        rows={3}
        className={`${base} resize-y`}
      />
    );
  }

  return (
    <input
      type={inputType === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      className={base}
    />
  );
}
