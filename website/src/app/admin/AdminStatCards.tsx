"use client";

export function StatCard({
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
      <div className="text-[11px] sm:text-xs text-gray-600 leading-snug mt-0.5">{label}</div>
    </div>
  );
}

export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  needs_review: { label: "Unpublished", className: "bg-amber-100 text-amber-800" },
  partial: { label: "Partial", className: "bg-blue-100 text-blue-800" },
  complete: { label: "Complete", className: "bg-green-100 text-green-800" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_LABELS[status] ?? STATUS_LABELS.needs_review;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
