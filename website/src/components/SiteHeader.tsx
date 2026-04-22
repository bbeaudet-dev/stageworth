"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_BLUE, BRAND_PURPLE } from "@/lib/brand-colors";

export function SiteHeader() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isAdminLogin = pathname.startsWith("/admin/login");
  const showAdminNav = isAdmin && !isAdminLogin;

  const reviewQueueActive =
    pathname === "/admin" || pathname.startsWith("/admin/review");
  const unmatchedActive = pathname.startsWith("/admin/unmatched");
  const feedbackActive = pathname.startsWith("/admin/feedback");
  const showtimesActive = pathname.startsWith("/admin/showtimes");
  const reportsActive = pathname.startsWith("/admin/reports");

  const tabBase =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";
  const tabActive = "bg-gray-900 text-white";
  const tabIdle = "text-gray-600 hover:bg-gray-100 hover:text-gray-900";

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6 lg:px-8 sm:py-0 sm:h-14">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight bg-clip-text text-transparent shrink-0"
          style={{
            backgroundImage: `linear-gradient(90deg, ${BRAND_BLUE}, ${BRAND_PURPLE})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          Stageworth
        </Link>

        {showAdminNav && (
          <nav
            className="flex flex-wrap items-center gap-1"
            aria-label="Admin sections"
          >
            <Link
              href="/admin"
              className={`${tabBase} ${reviewQueueActive ? tabActive : tabIdle}`}
            >
              Show Review
            </Link>
            <Link
              href="/admin/unmatched"
              className={`${tabBase} ${unmatchedActive ? tabActive : tabIdle}`}
            >
              Venue Review
            </Link>
            <Link
              href="/admin/feedback"
              className={`${tabBase} ${feedbackActive ? tabActive : tabIdle}`}
            >
              User Feedback
            </Link>
            <Link
              href="/admin/showtimes"
              className={`${tabBase} ${showtimesActive ? tabActive : tabIdle}`}
            >
              Showtimes
            </Link>
            <Link
              href="/admin/reports"
              className={`${tabBase} ${reportsActive ? tabActive : tabIdle}`}
            >
              User Reports
            </Link>
          </nav>
        )}

        {isAdmin && !isAdminLogin && (
          <a
            href="/api/admin/logout"
            className="ml-auto text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          >
            Log out
          </a>
        )}
      </div>
    </header>
  );
}
