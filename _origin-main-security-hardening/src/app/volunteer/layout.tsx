import { ProtectedRoute } from "@/components/protected-route";
import { VolunteerShell } from "@/components/volunteer/volunteer-shell";

export const dynamic = "force-dynamic";

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRole="volunteer">
      <VolunteerShell>{children}</VolunteerShell>
    </ProtectedRoute>
  );
}
