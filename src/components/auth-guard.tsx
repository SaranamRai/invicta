"use client";

import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = pathname === "/login";
  const isRemovedUserAuthPage = pathname === "/register";
  // Volunteer routes have their own layout and auth guard
  const isVolunteerPage = pathname.startsWith("/volunteer");

  useEffect(() => {
    if (!loading) {
      if (isRemovedUserAuthPage) {
        router.replace("/");
        return;
      }

      if (user && isAuthPage) {
        if (user.email?.toLowerCase() === "volunteer@gmail.com") {
          router.push("/volunteer");
        } else {
          auth.signOut();
        }
      }
    }
  }, [user, loading, isAuthPage, isRemovedUserAuthPage, isVolunteerPage, router]);

  if (isVolunteerPage) {
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

  if (isRemovedUserAuthPage) {
    return null;
  }

  // Auth pages: no sidebar/header
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Header />
        <main className="p-8 transition-all duration-300 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
