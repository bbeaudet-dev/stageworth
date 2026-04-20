"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@/lib/api";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = (typeof DAYS)[number];

function formatStamp(ms: number | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

function formatTimes(times: string[]): string {
  if (!times || times.length === 0) return "—";
  return times.join(", ");
}

export default function AdminShowtimesPage() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const rows = useQuery(
    api.showtimes.listProposals,
    status === "all" ? { limit: 100 } : { status, limit: 100 }
  );
  const approveAll = useMutation(api.showtimes.approveProposal);
  const reject = useMutation(api.showtimes.rejectProposal);

  const ordered = useMemo(() => rows ?? [], [rows]);

  async function onApproveAll(id: string) {
    setBusyId(id);
    try {
      await approveAll({ proposalId: id as Id<"showtimesReviews"> });
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: string) {
    setBusyId(id);
    try {
      await reject({
        proposalId: id as Id<"showtimesReviews">,
        note: rejectNote || undefined,
      });
      setRejectNote("");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Showtimes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Weekly Playbill snapshots staged for manual approval before writing to productions.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {rows === undefined ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-gray-500">No showtime proposals found.</p>
      ) : (
        <div className="space-y-4">
          {ordered.map((row) => {
            const expanded = openId === row._id;
            const busy = busyId === row._id;
            return (
              <article key={row._id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Week of {row.weekOf}
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {row.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Fetched {formatStamp(row.fetchedAt)} · Matched {row.matchedCount} / {row.shows.length}
                      {row.unmatchedTitles.length > 0 ? (
                        <>
                          {" "}·{" "}
                          <span className="text-amber-700">
                            {row.unmatchedTitles.length} unmatched
                          </span>
                        </>
                      ) : null}
                    </div>
                    {row.reviewedAt ? (
                      <div className="mt-1 text-xs text-gray-500">
                        Reviewed {formatStamp(row.reviewedAt)}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(expanded ? null : row._id)}
                      className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {expanded ? "Hide diff" : "View diff"}
                    </button>
                    {row.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onApproveAll(row._id)}
                          disabled={busy}
                          className="rounded-md bg-green-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                        >
                          Approve all
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(row._id)}
                          disabled={busy}
                          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {row.status === "pending" && expanded ? (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Reject note (optional)</label>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                      placeholder="Why this snapshot was rejected"
                    />
                  </div>
                ) : null}

                {expanded ? (
                  <ProposalDiffPanel
                    proposalId={row._id as Id<"showtimesReviews">}
                    status={row.status}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Diff panel ──────────────────────────────────────────────────────────────

function ProposalDiffPanel({
  proposalId,
  status,
}: {
  proposalId: Id<"showtimesReviews">;
  status: string;
}) {
  const diff = useQuery(api.showtimes.getProposalDiff, { proposalId });
  const approveShows = useMutation(api.showtimes.approveShows);

  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [applying, setApplying] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);

  // Auto-select all new+updated rows the first time the diff loads.
  const effectiveSelected = useMemo(() => {
    if (!diff) return new Set<string>();
    if (selected) return selected;
    const auto = new Set<string>();
    for (const d of diff.diffs) {
      if ((d.status === "new" || d.status === "updated") && !d.applied) {
        auto.add(d.title);
      }
    }
    return auto;
  }, [diff, selected]);

  if (diff === undefined) {
    return <p className="mt-3 text-sm text-gray-500">Computing diff…</p>;
  }

  const buckets = {
    new: diff.diffs.filter((d) => d.status === "new"),
    updated: diff.diffs.filter((d) => d.status === "updated"),
    unchanged: diff.diffs.filter((d) => d.status === "unchanged"),
    unmatched: diff.diffs.filter((d) => d.status === "unmatched"),
  };

  function toggle(title: string) {
    const next = new Set(effectiveSelected);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    setSelected(next);
  }

  function toggleBucket(bucket: "new" | "updated" | "unchanged") {
    const next = new Set(effectiveSelected);
    const all = buckets[bucket].every((d) => next.has(d.title) || d.applied);
    for (const d of buckets[bucket]) {
      if (d.applied) continue;
      if (all) next.delete(d.title);
      else next.add(d.title);
    }
    setSelected(next);
  }

  async function onApproveSelected() {
    if (effectiveSelected.size === 0) return;
    setApplying(true);
    try {
      await approveShows({
        proposalId,
        titles: [...effectiveSelected],
      });
      setSelected(null);
    } finally {
      setApplying(false);
    }
  }

  const pending = status === "pending";
  const selectableCount = [...effectiveSelected].filter((t) =>
    diff.diffs.some((d) => d.title === t && !d.applied && d.status !== "unmatched")
  ).length;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <CountPill label="New" count={diff.counts.new} tone="green" />
        <CountPill label="Updated" count={diff.counts.updated} tone="amber" />
        <CountPill label="Unchanged" count={diff.counts.unchanged} tone="gray" />
        <CountPill label="Unmatched" count={diff.counts.unmatched} tone="red" />
        {pending ? (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-gray-500">{selectableCount} selected</span>
            <button
              type="button"
              onClick={onApproveSelected}
              disabled={applying || selectableCount === 0}
              className="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Approve selected
            </button>
          </div>
        ) : null}
      </div>

      {buckets.new.length > 0 ? (
        <DiffBucket
          title="New"
          tone="green"
          rows={buckets.new}
          pending={pending}
          selected={effectiveSelected}
          onToggle={toggle}
          onToggleAll={() => toggleBucket("new")}
        />
      ) : null}
      {buckets.updated.length > 0 ? (
        <DiffBucket
          title="Updated"
          tone="amber"
          rows={buckets.updated}
          pending={pending}
          selected={effectiveSelected}
          onToggle={toggle}
          onToggleAll={() => toggleBucket("updated")}
        />
      ) : null}
      {buckets.unchanged.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowUnchanged((v) => !v)}
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            {showUnchanged ? "Hide" : "Show"} {buckets.unchanged.length} unchanged
          </button>
          {showUnchanged ? (
            <DiffBucket
              title="Unchanged"
              tone="gray"
              rows={buckets.unchanged}
              pending={pending}
              selected={effectiveSelected}
              onToggle={toggle}
              onToggleAll={() => toggleBucket("unchanged")}
            />
          ) : null}
        </div>
      ) : null}
      {buckets.unmatched.length > 0 ? (
        <UnmatchedBucket rows={buckets.unmatched} />
      ) : null}
    </div>
  );
}

// ─── Bucket rendering ────────────────────────────────────────────────────────

type DiffRow = {
  title: string;
  status: "new" | "updated" | "unchanged" | "unmatched";
  productionId?: string;
  showName?: string;
  applied: boolean;
  current: Record<Day, string[]> | null;
  currentWeekOf: string | null;
  proposed: Record<Day, string[]>;
  dayDiffs: Array<{ day: Day; from: string[]; to: string[] }>;
};

const TONE_CLASSES: Record<
  "green" | "amber" | "gray" | "red",
  { bg: string; border: string; text: string; pill: string }
> = {
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    pill: "bg-green-100 text-green-800",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    pill: "bg-amber-100 text-amber-800",
  },
  gray: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    pill: "bg-gray-100 text-gray-700",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    pill: "bg-red-100 text-red-800",
  },
};

function CountPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: keyof typeof TONE_CLASSES;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.pill}`}>
      {label} {count}
    </span>
  );
}

function DiffBucket({
  title,
  tone,
  rows,
  pending,
  selected,
  onToggle,
  onToggleAll,
}: {
  title: string;
  tone: keyof typeof TONE_CLASSES;
  rows: DiffRow[];
  pending: boolean;
  selected: Set<string>;
  onToggle: (title: string) => void;
  onToggleAll: () => void;
}) {
  const t = TONE_CLASSES[tone];
  const selectable = rows.filter((r) => !r.applied && r.status !== "unmatched");
  const allSelected =
    selectable.length > 0 && selectable.every((r) => selected.has(r.title));

  return (
    <section className={`rounded-md border ${t.border} ${t.bg}`}>
      <header className="flex items-center justify-between border-b border-gray-200 bg-white/60 px-3 py-2">
        <div className={`text-xs font-semibold uppercase tracking-wide ${t.text}`}>
          {title} ({rows.length})
        </div>
        {pending && selectable.length > 0 ? (
          <button
            type="button"
            onClick={onToggleAll}
            className="text-xs text-gray-600 hover:text-gray-900"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        ) : null}
      </header>
      <ul className="divide-y divide-gray-200">
        {rows.map((row) => (
          <DiffRowView
            key={row.title}
            row={row}
            pending={pending}
            selected={selected.has(row.title)}
            onToggle={() => onToggle(row.title)}
          />
        ))}
      </ul>
    </section>
  );
}

function DiffRowView({
  row,
  pending,
  selected,
  onToggle,
}: {
  row: DiffRow;
  pending: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const canSelect = pending && !row.applied && row.status !== "unmatched";
  return (
    <li className="flex gap-3 px-3 py-3">
      {canSelect ? (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0 accent-gray-900"
        />
      ) : (
        <span className="mt-1 h-4 w-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-gray-900">
              {row.title}
            </div>
            {row.showName && row.showName !== row.title ? (
              <div className="truncate text-xs text-gray-500">
                matched: {row.showName}
              </div>
            ) : null}
            {row.currentWeekOf ? (
              <div className="text-[11px] text-gray-400">
                current weekOf: {row.currentWeekOf}
              </div>
            ) : null}
          </div>
          {row.applied ? (
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
              applied
            </span>
          ) : null}
        </div>

        {row.status === "updated" && row.dayDiffs.length > 0 ? (
          <DayDiffTable dayDiffs={row.dayDiffs} />
        ) : null}
        {row.status === "new" ? <FullScheduleTable schedule={row.proposed} /> : null}
      </div>
    </li>
  );
}

function DayDiffTable({
  dayDiffs,
}: {
  dayDiffs: Array<{ day: Day; from: string[]; to: string[] }>;
}) {
  return (
    <table className="mt-2 w-full text-xs">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="w-12 pb-1 font-medium">Day</th>
          <th className="pb-1 font-medium">Current</th>
          <th className="pb-1 font-medium">Proposed</th>
        </tr>
      </thead>
      <tbody>
        {dayDiffs.map(({ day, from, to }) => (
          <tr key={day} className="align-top">
            <td className="py-1 pr-2 font-medium capitalize text-gray-700">{day}</td>
            <td className="py-1 pr-2">
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-800 line-through">
                {formatTimes(from)}
              </span>
            </td>
            <td className="py-1">
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800">
                {formatTimes(to)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FullScheduleTable({ schedule }: { schedule: Record<Day, string[]> }) {
  return (
    <table className="mt-2 w-full text-xs">
      <tbody>
        {DAYS.map((day) => (
          <tr key={day} className="align-top">
            <td className="w-12 py-1 pr-2 font-medium capitalize text-gray-700">
              {day}
            </td>
            <td className="py-1">
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800">
                {formatTimes(schedule[day])}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UnmatchedBucket({ rows }: { rows: DiffRow[] }) {
  const t = TONE_CLASSES.red;
  return (
    <section className={`rounded-md border ${t.border} ${t.bg}`}>
      <header className={`border-b border-gray-200 bg-white/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${t.text}`}>
        Unmatched ({rows.length})
      </header>
      <ul className="divide-y divide-gray-200 px-3 py-2 text-xs text-gray-700">
        {rows.map((row) => (
          <li key={row.title} className="py-1">
            {row.title}
          </li>
        ))}
      </ul>
      <p className="border-t border-gray-200 bg-white/60 px-3 py-2 text-[11px] text-gray-500">
        No open Broadway production matched these Playbill titles. Check{" "}
        <a href="/admin/unmatched" className="underline">
          /admin/unmatched
        </a>{" "}
        or create/un-close the production, then re-run the sync.
      </p>
    </section>
  );
}
