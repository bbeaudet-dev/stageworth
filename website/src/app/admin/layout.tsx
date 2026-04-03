import ConvexClientProvider from "@/components/ConvexClientProvider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
