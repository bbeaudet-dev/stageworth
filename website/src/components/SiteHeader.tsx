"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_BLUE, BRAND_PURPLE } from "@/lib/brand-colors";

export function SiteHeader() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight bg-clip-text text-transparent"
          style={{
            backgroundImage: `linear-gradient(90deg, ${BRAND_BLUE}, ${BRAND_PURPLE})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          Theatre Diary
        </Link>
        {isAdmin && (
          <div className="ml-auto">
            <a
              href="/api/admin/logout"
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Log out
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
