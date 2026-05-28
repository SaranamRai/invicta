import { ADMIN_AUTH_KEY, PORTAL_ROLE_KEY } from "@/lib/admin-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isAdmin =
    cookieStore.get(ADMIN_AUTH_KEY)?.value === "true" ||
    cookieStore.get(PORTAL_ROLE_KEY)?.value === "admin";

  if (!isAdmin) {
    redirect("/login");
  }

  return <>{children}</>;
}
