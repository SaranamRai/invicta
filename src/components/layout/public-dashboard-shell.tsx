"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Calendar, HelpCircle, Images, LayoutDashboard, LogIn, Menu, Megaphone, Radio, Trophy, Users, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { InvictaLogo } from "@/components/invicta-logo";
import { cn } from "@/lib/utils";

const primaryNavItems = [
  { label: "Home", href: "/public-dashboard", icon: LayoutDashboard },
  { label: "Matches", href: "/matches", icon: Calendar },
  { label: "Live Scores", href: "/live-score", icon: Radio },
  { label: "Standings", href: "/standings", icon: Trophy },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Sports", href: "/sports", icon: Activity },
  { label: "News", href: "/announcements", icon: Megaphone },
];

const moreNavItems = [
  { label: "Results", href: "/results", icon: Activity },
  { label: "Rules", href: "/rules", icon: BookOpen },
  { label: "Gallery", href: "/gallery", icon: Images },
  { label: "Help and Contact", href: "/contact", icon: HelpCircle },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/public-dashboard" && pathname.startsWith(`${href}/`));
}

export function PublicDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileNavItems = [primaryNavItems[0], primaryNavItems[1], primaryNavItems[2], primaryNavItems[3], primaryNavItems[4]];

  return (
    <div className="dashboard-surface public-dashboard-shell min-h-screen bg-[var(--public-shell-bg)] text-foreground">
      <header className="sticky top-0 z-40 border-b border-[var(--public-border)] bg-[var(--public-sidebar-bg)]/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
          <Link href="/public-dashboard" aria-label="Invicta home" className="shrink-0">
            <InvictaLogo className="h-9 w-32 sm:h-10 sm:w-36" />
          </Link>

          <nav aria-label="Main navigation" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
            {primaryNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold transition-colors xl:px-3.5 xl:text-xs",
                    active ? "bg-accent text-accent-foreground" : "text-[var(--public-nav-text)] hover:bg-[var(--public-panel-bg)] hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <ThemeToggle />
            <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--public-border)] px-4 text-xs font-bold text-[var(--public-nav-text)] transition-colors hover:border-accent hover:text-foreground">
              <LogIn size={15} /> Staff Login
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              type="button"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--public-border)] bg-[var(--public-panel-bg)] text-foreground"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav aria-label="More navigation" className="border-t border-[var(--public-border)] bg-[var(--public-sidebar-bg)] px-4 py-3 lg:hidden">
            <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-2 sm:grid-cols-3">
              {[...primaryNavItems, ...moreNavItems].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold",
                    isActivePath(pathname, item.href) ? "border-accent bg-accent text-accent-foreground" : "border-[var(--public-border)] bg-[var(--public-panel-bg)] text-[var(--public-nav-text)]"
                  )}
                >
                  <item.icon size={14} /> {item.label}
                </Link>
              ))}
              <Link href="/login" onClick={() => setMenuOpen(false)} className="flex min-h-10 items-center gap-2 rounded-xl border border-[var(--public-border)] px-3 py-2 text-xs font-bold text-[var(--public-nav-text)]">
                <LogIn size={14} /> Staff Login
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto min-h-[70vh] max-w-[1280px] space-y-8 px-4 py-6 pb-24 sm:space-y-10 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:pb-12">
        {children}
      </main>

      <footer className="border-t border-[var(--public-border)] bg-[var(--public-sidebar-bg)] px-4 py-8 pb-24 sm:px-6 lg:pb-8">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black tracking-widest text-foreground">INVICTA</p>
            <p className="mt-1 text-xs text-muted-foreground">Sports · Competition · Community</p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
            <Link href="/public-dashboard" className="hover:text-foreground">Home</Link>
            <Link href="/matches" className="hover:text-foreground">Matches</Link>
            <Link href="/live-score" className="hover:text-foreground">Live Scores</Link>
            <Link href="/standings" className="hover:text-foreground">Standings</Link>
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
          </nav>
          <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} INVICTA · MSU</p>
        </div>
      </footer>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--public-border)] bg-[var(--public-sidebar-bg)]/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-bold",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon size={17} />
                <span>{item.label === "Live Scores" ? "Live" : item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
