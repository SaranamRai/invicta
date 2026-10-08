"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutPortalSession } from "@/lib/role-auth";
import { Calendar, LayoutDashboard, LogOut, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { InvictaLogo } from "@/components/invicta-logo";

const navigation = [
  { name: "Match Dashboard", href: "/volunteer", icon: LayoutDashboard },
  { name: "All Matches", href: "/volunteer/matches", icon: Calendar },
  { name: "Teams & Players", href: "/volunteer/teams", icon: UsersRound },
];

export function VolunteerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="dashboard-surface ops-dashboard-surface flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground md:h-screen md:flex-row md:overflow-hidden">
      <div className="flex w-full flex-col border-b border-border bg-card md:h-screen md:w-64 md:shrink-0 md:overflow-hidden md:border-b-0 md:border-r">
        <div className="border-b border-border p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3 md:block md:space-y-4">
            <InvictaLogo className="h-12 w-44 shrink-0 sm:h-16 sm:w-56" />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-accent mt-1.5 sm:text-[10px] sm:tracking-[0.2em] sm:mt-2">Volunteer Match Tools</p>
        </div>

        <nav className="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto p-3 sm:p-4 md:flex-1 md:flex-col md:space-y-2 md:overflow-y-auto md:overflow-x-hidden md:overscroll-contain">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                "flex min-w-fit whitespace-nowrap items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-all sm:px-3.5 sm:py-2.5 sm:text-xs md:min-w-0",
                  isActive
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon size={16} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={() => {
              void logoutPortalSession().finally(() => router.replace("/login"));
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-red-400 transition-all hover:bg-red-400/10 hover:text-red-300 sm:text-xs md:justify-start"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>

      <div className="relative min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Volunteer Area</p>
              <h2 className="text-lg font-black uppercase tracking-tight sport-heading sm:text-xl">Update Scores and Match Status</h2>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="p-3 sm:p-5 md:p-6">
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] blur-[20px] pointer-events-none select-none sm:h-96 sm:w-96">
            <img src="/msu-logo.png" alt="" className="w-full h-full object-contain" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
