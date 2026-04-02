import ConvexClientProvider from "@/components/ConvexClientProvider";
import { Nav } from "@/components/Nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <Nav />
      {children}
    </ConvexClientProvider>
  );
}
