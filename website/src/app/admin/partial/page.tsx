"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/api";
import { useSession, signIn } from "@/lib/auth-client";
import Link from "next/link";

export default function PartialShowsPage() {
  const { data: session, isPending } = useSession();
  const authenticated = !!session?.user;
  const shows = useQuery(
    api.reviewQueue.listPartialShows,
    authenticated ? {} : "skip"
  );

  if (isPending) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
        <button
          onClick={() => signIn.social({ provider: "google", callbackURL: "/admin/partial" })}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-2">Partial Shows</h1>
      <p className="text-gray-600 text-sm mb-8">
        Shows that are visible to users but still missing some data. Review them
        to find and fill in what&apos;s missing.
      </p>

      {!shows ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : shows.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No partial shows</p>
          <p className="text-sm mt-1">
            All reviewed shows are either complete or still in the review queue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shows.map((show) => (
            <Link
              key={show._id}
              href={`/admin/review/${show._id}`}
              className="group rounded-lg border border-gray-200 p-4 hover:border-gray-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                {show.imageUrl ? (
                  <img
                    src={show.imageUrl}
                    alt={show.name}
                    className="h-16 w-16 rounded object-cover bg-gray-100 shrink-0"
                  />
                ) : (
                  <div className="h-16 w-16 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs shrink-0">
                    No img
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:underline truncate">
                    {show.name}
                  </h3>
                  <p className="text-xs text-gray-500 capitalize mt-0.5">
                    {show.type} &middot; {show.productionCount} production
                    {show.productionCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {show.missingFields.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {show.missingFields.map((field) => (
                    <span
                      key={field}
                      className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700"
                    >
                      Missing: {field}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
