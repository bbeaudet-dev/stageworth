"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "@/lib/auth-client";

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID;

export function Nav() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isAdmin = session?.user?.id && ADMIN_USER_ID
    ? session.user.id === ADMIN_USER_ID
    : false;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-gray-900"
            >
              Theatre Diary
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className={`text-sm font-medium ${
                    pathname.startsWith("/admin") && !pathname.startsWith("/admin/partial")
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Review Queue
                </Link>
                <Link
                  href="/admin/partial"
                  className={`text-sm font-medium ${
                    pathname.startsWith("/admin/partial")
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Partial Shows
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {session?.user ? (
              <button
                onClick={() => signOut()}
                className="text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() =>
                  signIn.social({ provider: "google", callbackURL: "/" })
                }
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
