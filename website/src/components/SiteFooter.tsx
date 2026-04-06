import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:flex-row">
        <span>&copy; {new Date().getFullYear()} Theatre Diary</span>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/about" className="hover:text-gray-900">
            About
          </Link>
          <Link href="/privacy" className="hover:text-gray-900">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-gray-900">
            Terms of Service
          </Link>
          <Link href="/admin" className="hover:text-gray-900">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
