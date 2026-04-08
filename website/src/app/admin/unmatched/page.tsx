"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function AdminUnmatchedLocationsPage() {
  const rows = useQuery(api.visits.listUnmatchedLocations, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex gap-4 mb-5 text-sm">
        <Link href="/admin" className="text-gray-500 hover:text-gray-900">Shows</Link>
        <span className="font-medium text-gray-900">Unmatched Locations</span>
        <Link href="/admin/feedback" className="text-gray-500 hover:text-gray-900">User Feedback</Link>
      </div>

      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Unmatched Locations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visit locations that couldn&apos;t be matched to a known venue. Sorted by visit count.
          Use this list to identify venues worth adding to the seed catalog.
        </p>
      </div>

      {rows === undefined ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No unmatched locations — great!</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">{rows.length} unique location{rows.length !== 1 ? "s" : ""}</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Theatre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visits
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={`${row.theatre}|||${row.city}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.theatre || <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.city || <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right tabular-nums">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
