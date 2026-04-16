"use client";

import Image from "next/image";
import Link from "next/link";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { SOURCE_LABELS, type FocusEditState, type FocusGroup } from "./useAdminDashboard";

const PAGE_SIZE = 50;

/** Format a raw DB string value for display in the focus column. */
function formatFocusValue(field: string, value: string | null): string {
  if (value === null) return "—";
  if (field === "runningTime") return `${value} min`;
  if (field === "intermissionCount") return value === "0" ? "None" : value;
  if (field === "intermissionMinutes") return `${value} min`;
  if (field === "isOpenRun" || field === "isClosed") return value === "true" ? "Yes" : "No";
  if (field === "description") return value.length > 80 ? value.slice(0, 80) + "…" : value;
  return value;
}

type PendingEntry = { _id: string; proposedValue: string; source: string };

interface PropertyFocusTableProps {
  focusGroup: FocusGroup;
  focusListRaw: unknown;
  adminPathWithoutSearch: string;
  visibleCount: number;
  setVisibleCount: Dispatch<SetStateAction<number>>;
  loading: boolean;
  focusEdit: FocusEditState | null;
  setFocusEdit: Dispatch<SetStateAction<FocusEditState | null>>;
  focusBusy: Set<string>;
  focusEditRef: RefObject<HTMLInputElement>;
  handleFocusAction: (
    showId: string,
    showDataStatus: string,
    entryId: string | null,
    decision: "approved" | "rejected" | "edited" | "direct",
    value?: string,
    directEntity?: { entityType: "show" | "production"; entityId: string },
    directField?: string,
  ) => Promise<void>;
}

export function PropertyFocusTable({
  focusGroup,
  focusListRaw,
  adminPathWithoutSearch,
  visibleCount,
  setVisibleCount,
  loading,
  focusEdit,
  setFocusEdit,
  focusBusy,
  focusEditRef,
  handleFocusAction,
}: PropertyFocusTableProps) {
  const focusRows = focusListRaw instanceof Error || !focusListRaw ? [] : (focusListRaw as unknown[]);
  const visibleFocusRows = (focusRows as unknown[]).slice(0, visibleCount);
  const isProdFocus = focusGroup.entityType === "production";
  const groupFields = focusGroup.fields;
  const groupFieldLabels = focusGroup.fieldLabels;

  if (focusRows.length === 0 && !loading) {
    return <div className="text-gray-500 text-sm">No shows match the current filters.</div>;
  }

  const ShowThumbnail = ({ show }: { show: { _id: string; name: string; imageUrl: string | null } }) => (
    <Link
      href={`/admin/review/${show._id}?returnTo=${encodeURIComponent(adminPathWithoutSearch)}`}
      className="flex items-center gap-2.5 group min-w-0"
    >
      {show.imageUrl ? (
        <div className="relative w-8 shrink-0 rounded overflow-hidden bg-[#f0f0f4]" style={{ aspectRatio: "2/3" }}>
          <Image src={show.imageUrl} alt={show.name} fill sizes="32px" className="object-contain" unoptimized />
        </div>
      ) : (
        <div className="w-8 shrink-0 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs" style={{ aspectRatio: "2/3" }}>?</div>
      )}
      <span className="text-sm font-medium text-gray-900 group-hover:underline truncate">{show.name}</span>
    </Link>
  );

  const FieldCell = ({
    field,
    showId,
    showDataStatus,
    entityType,
    entityId,
    currentValue,
    pendingEntry,
  }: {
    field: string;
    showId: string;
    showDataStatus: string;
    entityType: "show" | "production";
    entityId: string;
    currentValue: string | null;
    pendingEntry: PendingEntry | null;
  }) => {
    const editKey = `${entityId}:${field}`;
    const busy = focusBusy.has(pendingEntry?._id ?? editKey);
    const isEditing = focusEdit?.entityId === editKey;

    if (isEditing) {
      return (
        <form
          className="flex flex-col gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const val = focusEdit!.value;
            if (focusEdit!.entryId) {
              void handleFocusAction(showId, showDataStatus, focusEdit!.entryId, "edited", val);
            } else {
              void handleFocusAction(showId, showDataStatus, null, "direct", val, { entityType, entityId }, field);
            }
          }}
        >
          <input
            ref={focusEditRef}
            type="text"
            value={focusEdit!.value}
            onChange={(e) => setFocusEdit((prev) => prev ? { ...prev, value: e.target.value } : null)}
            className="w-28 rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            disabled={busy}
          />
          <div className="flex gap-1">
            <button type="submit" disabled={busy} className="rounded bg-gray-900 px-2 py-0.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50">Save</button>
            <button type="button" onClick={() => setFocusEdit(null)} disabled={busy} className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          </div>
        </form>
      );
    }

    return (
      <div className={`flex flex-col gap-0.5 ${busy ? "opacity-50" : ""}`}>
        <span className={currentValue !== null ? "text-gray-800 text-sm" : "text-gray-400 text-xs italic"}>
          {formatFocusValue(field, currentValue)}
        </span>
        {pendingEntry ? (
          <>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="text-amber-700 font-medium">→</span>
              {formatFocusValue(field, pendingEntry.proposedValue)}
              <span className="rounded-full bg-amber-100 px-1.5 py-px text-xs font-medium text-amber-800 ml-0.5">
                {SOURCE_LABELS[pendingEntry.source] ?? pendingEntry.source}
              </span>
            </span>
            <div className="flex gap-1 mt-0.5">
              <button type="button" disabled={busy} onClick={() => handleFocusAction(showId, showDataStatus, pendingEntry._id, "approved")} className="rounded bg-green-700 px-1.5 py-px text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50">✓</button>
              <button type="button" disabled={busy} onClick={() => setFocusEdit({ showId, entryId: pendingEntry._id, entityId: editKey, value: pendingEntry.proposedValue })} className="rounded border border-gray-300 px-1.5 py-px text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50">✏</button>
              <button type="button" disabled={busy} onClick={() => handleFocusAction(showId, showDataStatus, pendingEntry._id, "rejected")} className="rounded border border-red-200 px-1.5 py-px text-xs text-red-700 hover:bg-red-50 disabled:opacity-50">✗</button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setFocusEdit({ showId, entryId: null, entityId: editKey, value: currentValue ?? "" })} className="self-start rounded border border-gray-300 px-1.5 py-px text-xs text-gray-500 hover:bg-gray-50">Set</button>
        )}
      </div>
    );
  };

  return (
    <>
      <p className="text-sm text-gray-500 mb-3">
        Showing {visibleFocusRows.length} of {focusRows.length} shows — {focusGroup.label}
        {isProdFocus && <span className="text-gray-400"> · production level</span>}
      </p>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Show</th>
              {isProdFocus && <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Production</th>}
              {groupFieldLabels.map((label) => (
                <th key={label} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isProdFocus ? (
              (visibleFocusRows as Array<{
                _id: string; name: string; imageUrl: string | null; dataStatus: string;
                productions: Array<{ _id: string; label: string; fieldValues: Record<string, string | null>; pendingEntries: Record<string, PendingEntry | null> }>;
              }>).flatMap((show) => {
                if (show.productions.length === 0) {
                  return [(
                    <tr key={show._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><ShowThumbnail show={show} /></td>
                      <td colSpan={groupFields.length + 1} className="px-3 py-3 text-sm text-gray-400 italic">No productions</td>
                    </tr>
                  )];
                }
                return show.productions.map((prod, i) => (
                  <tr key={prod._id} className="hover:bg-gray-50">
                    {i === 0 && (
                      <td rowSpan={show.productions.length} className="px-4 py-3 align-top border-r border-gray-100">
                        <ShowThumbnail show={show} />
                      </td>
                    )}
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap align-top">{prod.label}</td>
                    {groupFields.map((field) => (
                      <td key={field} className="px-3 py-3 align-top">
                        <FieldCell
                          field={field}
                          showId={show._id}
                          showDataStatus={show.dataStatus}
                          entityType="production"
                          entityId={prod._id}
                          currentValue={prod.fieldValues[field] ?? null}
                          pendingEntry={prod.pendingEntries[field] ?? null}
                        />
                      </td>
                    ))}
                  </tr>
                ));
              })
            ) : (
              (visibleFocusRows as Array<{
                _id: string; name: string; imageUrl: string | null; dataStatus: string;
                fieldValues: Record<string, string | null>; pendingEntries: Record<string, PendingEntry | null>;
              }>).map((show) => (
                <tr key={show._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 align-top"><ShowThumbnail show={show} /></td>
                  {groupFields.map((field) => (
                    <td key={field} className="px-3 py-3 align-top">
                      <FieldCell
                        field={field}
                        showId={show._id}
                        showDataStatus={show.dataStatus}
                        entityType="show"
                        entityId={show._id}
                        currentValue={show.fieldValues[field] ?? null}
                        pendingEntry={show.pendingEntries[field] ?? null}
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {visibleCount < focusRows.length && (
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
  );
}
