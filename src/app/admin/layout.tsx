import { ProtectedRoute } from "@/components/protected-route";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute allowedRole={["admin", "supercoordinator"]}>{children}</ProtectedRoute>;
}
