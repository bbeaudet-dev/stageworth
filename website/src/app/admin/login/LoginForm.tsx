"use client";

import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const hasError = searchParams.get("error") === "1";

  return (
    <form method="POST" action="/api/admin/login" className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          placeholder="Enter admin password"
        />
      </div>
      {hasError && (
        <p className="text-sm text-red-600">Incorrect password. Try again.</p>
      )}
      <button
        type="submit"
        className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        Sign in
      </button>
    </form>
  );
}
