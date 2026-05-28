import { PORTAL_ROLE_KEY } from "@/lib/admin-auth";
import { VolunteerShell } from "@/components/volunteer/volunteer-shell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  if (cookieStore.get(PORTAL_ROLE_KEY)?.value !== "volunteer") {
    redirect("/login");
  }

  return <VolunteerShell>{children}</VolunteerShell>;
}
