"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearPortalSession } from "@/lib/role-auth";
import { Calendar, LayoutDashboard, LogOut, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { name: "Match Dashboard", href: "/volunteer", icon: LayoutDashboard },
  { name: "All Matches", href: "/volunteer/matches", icon: Calendar },
  { name: "Teams & Players", href: "/volunteer/teams", icon: UsersRound },
];

export function VolunteerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="dashboard-surface min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <div className="flex w-full flex-col border-b border-border bg-card md:w-72 md:border-b-0 md:border-r">
        <div className="border-b border-border p-3 sm:p-6">
          <div className="flex items-center gap-3 md:block md:space-y-4">
            <div className="dashboard-logo flex h-10 w-28 max-w-full shrink-0 items-center justify-start overflow-hidden sm:h-20 sm:w-60">
              <img
                src="/msu-logo-transparent.png"
                alt="Medhavi Skills University"
                className="h-auto w-full max-w-full object-contain"
              />
            </div>
            <span className="block text-sm font-bold uppercase tracking-[0.2em] text-foreground font-serif italic sm:text-[20px] sm:tracking-[0.4em]">Invicta</span>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-accent mt-1.5 sm:text-[10px] sm:tracking-[0.2em] sm:mt-2">Volunteer Match Tools</p>
        </div>

        <nav className="flex flex-wrap gap-2 overflow-x-auto p-4 md:flex-1 md:flex-col md:space-y-2 md:overflow-visible">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex min-w-fit whitespace-nowrap items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all md:min-w-0",
                  isActive
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <button
            onClick={() => {
              clearPortalSession();
              router.replace("/login");
            }}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-4 backdrop-blur-xl sm:px-8 md:px-12 md:py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Volunteer Area</p>
            <h2 className="text-xl font-black uppercase tracking-tight sport-heading">Update Scores and Match Status</h2>
          </div>
          <ThemeToggle />
        </header>
        <main className="p-4 sm:p-8 md:p-12">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-[0.02] blur-[20px] pointer-events-none select-none">
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
