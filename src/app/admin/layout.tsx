import { ProtectedRoute } from "@/components/protected-route";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Allow both admin and coordinator to load this UI. Coordinator can edit; admin will be observer-only.
  return <ProtectedRoute allowedRole={["admin", "coordinator"]}>{children}</ProtectedRoute>;
}
