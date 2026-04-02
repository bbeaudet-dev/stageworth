"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-gray-900"
          >
            Theatre Diary
          </Link>
          <Link
            href="/admin"
            className={`text-sm font-medium ${
              pathname.startsWith("/admin")
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Review Queue
          </Link>
        </div>
      </div>
    </nav>
  );
}
