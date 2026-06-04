import { ProtectedRoute } from "@/components/protected-route";
import { VolunteerShell } from "@/components/volunteer/volunteer-shell";

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
