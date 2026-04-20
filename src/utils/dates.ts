/**
 * Consolidated date formatting utilities.
 *
 * Convention: functions accepting an ISO date string (YYYY-MM-DD) parse it as a
 * **local** calendar date (`T00:00:00`) unless the name contains "UTC", in which
 * case they use `T00:00:00Z`.
 */

// ─── ISO helpers ─────────────────────────────────────────────────────────────

export function parseISODate(date: string): Date {
  const parsed = new Date(`${date}T00:00:00`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date();
  fallback.setHours(0, 0, 0, 0);
  return fallback;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Display formatters ──────────────────────────────────────────────────────

/** "Jan 5, 2026" style — from an ISO date string. */
export function formatDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Jan 5, 2026" style — from a Date object. */
export function formatDateObject(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Jan 5" this year, or "Jan 5, 2027" if a different year. */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Wed, Jan 5" — UTC-based for trip schedule days. */
export function formatDateDisplayUTC(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Jan 3–5, 2026" / "Jan 3 – Feb 1, 2026" / cross-year — UTC-based. */
export function formatDateRange(startDate: string, endDate: string): string {
  const s = new Date(startDate + "T00:00:00Z");
  const e = new Date(endDate + "T00:00:00Z");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const sm = monthNames[s.getUTCMonth()];
  const em = monthNames[e.getUTCMonth()];
  const sd = s.getUTCDate();
  const ed = e.getUTCDate();
  const sy = s.getUTCFullYear();
  const ey = e.getUTCFullYear();
  if (sy === ey && sm === em) return `${sm} ${sd}–${ed}, ${sy}`;
  if (sy === ey) return `${sm} ${sd} – ${em} ${ed}, ${sy}`;
  return `${sm} ${sd}, ${sy} – ${em} ${ed}, ${ey}`;
}

// ─── Relative / time-ago ────────────────────────────────────────────────────

/** "just now" / "5m ago" / "3h ago" / "2d ago" / "Jan 5" */
export function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (v % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** "today" / "yesterday" / "3 days ago" / "tomorrow" / "in 3 days" / "January 5th" / "January 5th, 2024" */
export function formatRelativeVisitDate(dateStr: string): string {
  const today = new Date();
  const target = new Date(`${dateStr}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays > 1 && diffDays <= 6) return `${diffDays} days ago`;
  if (diffDays === 7) return "a week ago";
  if (diffDays === -1) return "tomorrow";
  if (diffDays < -1 && diffDays >= -6) return `in ${-diffDays} days`;
  if (diffDays === -7) return "in a week";

  const month = MONTHS_FULL[target.getMonth()];
  const day = ordinal(target.getDate());
  const absDiff = Math.abs(diffDays);
  if (absDiff >= 335) return `${month} ${day}, ${target.getFullYear()}`;
  return `${month} ${day}`;
}

/** True when the ISO date is strictly after today. */
export function isFutureDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseISODate(dateStr);
  target.setHours(0, 0, 0, 0);
  return target.getTime() > today.getTime();
}

/** Section header for diary grouping: "Today" / "Yesterday" / "This Week" / "January 2026" */
export function formatDiaryGroupLabel(dateStr: string, now: Date): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const visitDate = new Date(y, m - 1, d);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - visitDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";

  return visitDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** "Jan 5, 2026" — from an ISO string via manual parse (avoids timezone issues). */
export function formatVisitDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Day math ────────────────────────────────────────────────────────────────

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
