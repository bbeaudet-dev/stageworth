import ConvexClientProvider from "@/components/ConvexClientProvider";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <header className="border-b border-gray-200 bg-white">
        <nav
          className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-2 text-sm"
          aria-label="Admin"
        >
          <Link
            href="/admin"
            className="rounded-md px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            Review queue
          </Link>
          <Link
            href="/admin/feedback"
            className="rounded-md px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            User feedback
          </Link>
        </nav>
      </header>
      {children}
    </ConvexClientProvider>
  );
}
