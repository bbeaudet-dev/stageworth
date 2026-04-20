"use client";

import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import { SHOW_TYPES, type ShowDataStatus, type ShowFormType } from "./useAdminDashboard";

interface AddShowModalProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  showName: string;
  setShowName: Dispatch<SetStateAction<string>>;
  showType: ShowFormType;
  setShowType: Dispatch<SetStateAction<ShowFormType>>;
  showDataStatus: ShowDataStatus;
  setShowDataStatus: Dispatch<SetStateAction<ShowDataStatus>>;
  imageInputKey: number;
  setShowImage: Dispatch<SetStateAction<File | null>>;
  onSaveClick: () => void;
  onSaveExitClick: () => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

export function AddShowModal({
  open,
  busy,
  error,
  showName,
  setShowName,
  showType,
  setShowType,
  showDataStatus,
  setShowDataStatus,
  imageInputKey,
  setShowImage,
  onSaveClick,
  onSaveExitClick,
  onSubmit,
  onClose,
}: AddShowModalProps) {
  if (!open) return null;

  return (
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
        onClick={onClose}
        disabled={busy}
      />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id="add-show-modal-title" className="text-lg font-semibold text-gray-900">
            Add missing show
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
            aria-label="Close"
          >
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
        </div>

        <>
          <p className="text-xs text-gray-500 mb-4">
            Creates a show immediately and opens its admin page. Entered values are saved directly.
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Show name</label>
                <input
                  type="text"
                  value={showName}
                  onChange={(e) => setShowName(e.target.value)}
                  placeholder="e.g. Example Musical"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  disabled={busy}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Type</label>
                <select
                  value={showType}
                  onChange={(e) => setShowType(e.target.value as ShowFormType)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  disabled={busy}
                >
                  {SHOW_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Data status</label>
                <select
                  value={showDataStatus}
                  onChange={(e) => setShowDataStatus(e.target.value as ShowDataStatus)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  disabled={busy}
                >
                  <option value="needs_review">Unpublished</option>
                  <option value="partial">Partial</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Image — optional</label>
                <input
                  key={imageInputKey}
                  type="file"
                  accept="image/*"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setShowImage(e.target.files?.[0] ?? null)}
                  className="text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-200 file:px-2 file:py-1 file:text-xs"
                  disabled={busy}
                />
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={onSaveExitClick}
                  disabled={busy}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save & Exit"}
                </button>
                <button
                  type="submit"
                  onClick={onSaveClick}
                  disabled={busy}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
          </form>
        </>
      </div>
    </div>
  );
}
