"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Calendar, HelpCircle, Images, LayoutDashboard, LogIn, Megaphone, Radio, Trophy } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const publicNavItems = [
  { label: "Dashboard", shortLabel: "Home", href: "/public-dashboard", icon: LayoutDashboard },
  { label: "Standings", href: "/standings", icon: Trophy },
  { label: "Matches", href: "/matches", icon: Calendar },
  { label: "Sports", href: "/sports", icon: Radio },
  { label: "Results", href: "/results", icon: Activity },
  { label: "News", href: "/announcements", icon: Megaphone },
  { label: "Rules", href: "/rules", icon: BookOpen },
  { label: "Gallery", href: "/gallery", icon: Images },
  { label: "Help", href: "/contact", icon: HelpCircle },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/public-dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="dashboard-surface public-dashboard-shell min-h-screen bg-[var(--public-shell-bg)] text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 border-r border-[var(--public-border)] bg-[var(--public-sidebar-bg)] px-9 py-5 shadow-sm backdrop-blur lg:flex lg:flex-col">
        <Link href="/" className="flex h-24 items-center justify-center rounded-2xl bg-white px-6 shadow-sm">
          <img src="/msu-logo.png" alt="Medhavi Skills University" className="max-h-16 w-full object-contain" />
        </Link>

        <div className="my-5 h-px bg-[var(--public-border)]" />
        <p className="mb-8 text-xs font-black uppercase tracking-widest text-accent">Sports Hub</p>

        <nav className="flex flex-1 flex-col gap-2.5">
          {publicNavItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-[58px] items-center gap-4 rounded-2xl border px-5 text-base font-black uppercase tracking-tight transition-all",
                  active
                    ? "border-accent bg-accent text-[#0f172a] shadow-sm"
                    : "border-[var(--public-border)] bg-[var(--public-panel-bg)] text-[var(--public-nav-text)] hover:border-accent hover:bg-accent/20"
                )}
              >
                <item.icon size={21} strokeWidth={2.3} />
                {item.shortLabel || item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 space-y-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-card px-5 text-sm font-black uppercase tracking-widest text-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <LogIn size={18} />
            Staff Login
          </Link>
        </div>
      </aside>

      <div className="sticky top-0 z-30 border-b border-[var(--public-border)] bg-[var(--public-sidebar-bg)] px-3 py-3 backdrop-blur lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/public-dashboard" className="flex h-12 min-w-0 items-center rounded-xl bg-white px-3 shadow-sm">
            <img src="/msu-logo.png" alt="Medhavi Skills University" className="h-9 w-36 object-contain" />
          </Link>
          <ThemeToggle />
        </div>
        <nav className="no-scrollbar flex gap-2 overflow-x-auto">
          {publicNavItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-[10px] font-black uppercase tracking-widest transition-all",
                  active
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-[var(--public-border)] bg-[var(--public-panel-bg)] text-[var(--public-nav-text)]"
                )}
              >
                <item.icon size={14} />
                {item.shortLabel || item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto max-w-[1500px] space-y-10 px-4 py-6 sm:px-8 lg:ml-80 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
