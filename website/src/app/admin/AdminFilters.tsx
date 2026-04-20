"use client";

import type { Dispatch, SetStateAction } from "react";
import { STATUS_LABELS } from "./AdminStatCards";
import { PRODUCTION_FOCUS_GROUPS, SHOW_FOCUS_GROUPS, type FocusEditState, type StatusFilter } from "./useAdminDashboard";

interface AdminFiltersProps {
  statusFilter: StatusFilter;
  setStatusFilter: Dispatch<SetStateAction<StatusFilter>>;
  showRunning: boolean;
  setShowRunning: Dispatch<SetStateAction<boolean>>;
  showUpcoming: boolean;
  setShowUpcoming: Dispatch<SetStateAction<boolean>>;
  showClosed: boolean;
  setShowClosed: Dispatch<SetStateAction<boolean>>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  sortBy: "name" | "recentQueue";
  setSortBy: Dispatch<SetStateAction<"name" | "recentQueue">>;
  focusField: string;
  setFocusField: Dispatch<SetStateAction<string>>;
  setFocusEdit: Dispatch<SetStateAction<FocusEditState | null>>;
  onlyWithPending: boolean;
  setOnlyWithPending: Dispatch<SetStateAction<boolean>>;
  onAddShow: () => void;
}

export function AdminFilters({
  statusFilter, setStatusFilter,
  showRunning, setShowRunning,
  showUpcoming, setShowUpcoming,
  showClosed, setShowClosed,
  search, setSearch,
  sortBy, setSortBy,
  focusField, setFocusField,
  setFocusEdit,
  onlyWithPending, setOnlyWithPending,
  onAddShow,
}: AdminFiltersProps) {
  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by publication status">
          {([undefined, "needs_review", "partial", "complete"] as const).map((status) => (
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
          ))}
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
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap" htmlFor="sort-select">Sort:</label>
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
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap" htmlFor="focus-field-select">Focus:</label>
            <select
              id="focus-field-select"
              value={focusField}
              onChange={(e) => {
                setFocusField(e.target.value);
                setFocusEdit(null);
              }}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="">— none —</option>
              <optgroup label="Show">
                {SHOW_FOCUS_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </optgroup>
              <optgroup label="Production">
                {PRODUCTION_FOCUS_GROUPS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
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
          onClick={onAddShow}
          className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Add missing show
        </button>
      </div>
    </div>
  );
}
