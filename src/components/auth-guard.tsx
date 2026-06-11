"use client";

import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [, loading] = useAuthState(auth);
  const pathname = usePathname();

<<<<<<< HEAD
=======
  const isLandingPage = pathname === "/";
  const isAboutPage = pathname === "/about";
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)
  const isAuthPage = pathname === "/login";
  const isTeamRegistrationPage = pathname === "/register";
  // Volunteer routes have their own layout and auth guard
  const isVolunteerPage = pathname.startsWith("/volunteer") || pathname.startsWith("/volunteer-dashboard");
  // Admin routes have their own layout and auth guard
  const isAdminPage = pathname.startsWith("/admin") || pathname.startsWith("/admin-dashboard");
  const isCoordinatorPage = pathname.startsWith("/coordinator-dashboard");

<<<<<<< HEAD
  if (isVolunteerPage || isAdminPage || isCoordinatorPage || isTeamRegistrationPage) {
=======
  if (isLandingPage || isAboutPage || isVolunteerPage || isAdminPage || isCoordinatorPage || isTeamRegistrationPage) {
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)
    return <>{children}</>;
  }

  if (loading && isAuthPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#020617]">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-accent/40" />
          <div className="absolute inset-4 rounded-full bg-accent shadow-[0_0_20px_rgba(252,191,77,0.5)]" />
        </div>
      </div>
    );
  }

  // Auth pages: no sidebar/header
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <Header />
        <main className="mx-auto w-full max-w-[1600px] p-4 transition-all duration-300 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
