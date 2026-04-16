"use client";

import Image from "next/image";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { StatusBadge } from "./AdminStatCards";
import type { ListRow } from "./useAdminDashboard";

const PAGE_SIZE = 50;
const FETCH_LIMIT = 500;

interface AdminShowTableProps {
  rows: ListRow[];
  totalFiltered: number;
  truncated: boolean;
  hasMore: boolean;
  visibleCount: number;
  setVisibleCount: Dispatch<SetStateAction<number>>;
  adminPathWithoutSearch: string;
}

export function AdminShowTable({
  rows,
  totalFiltered,
  truncated,
  hasMore,
  setVisibleCount,
  adminPathWithoutSearch,
}: AdminShowTableProps) {
  if (rows.length === 0) {
    return <div className="text-gray-500 text-sm">No shows match the current filters.</div>;
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-3">
        Showing {rows.length} of {totalFiltered} shows
        {truncated && (
          <span className="text-amber-600">
            {" "}(first {FETCH_LIMIT} matches loaded; narrow data status or search if you need the rest)
          </span>
        )}
      </p>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Show</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productions</th>
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
                      <div className="relative w-9 shrink-0 rounded overflow-hidden bg-[#f0f0f4]" style={{ aspectRatio: "2/3" }}>
                        <Image src={show.imageUrl} alt={show.name} fill sizes="36px" className="object-contain" unoptimized />
                      </div>
                    ) : (
                      <div className="w-9 shrink-0 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs" style={{ aspectRatio: "2/3" }}>?</div>
                    )}
                    <span className="text-sm font-medium text-gray-900 group-hover:underline">{show.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 capitalize">{show.type}</td>
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
                <td className="px-4 py-3 text-sm text-gray-600">{show.productionCount}</td>
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
  );
}
