"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, HelpCircle, Images, LayoutDashboard, LogIn, Megaphone, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const menuItems = [
  { icon: LayoutDashboard, label: "Home", href: "/public-dashboard" },
  { icon: Trophy, label: "Standings", href: "/standings" },
  { icon: Calendar, label: "Matches", href: "/matches" },
  { icon: Target, label: "Sports", href: "/sports" },
  { icon: Trophy, label: "Results", href: "/results" },
  { icon: Megaphone, label: "News", href: "/announcements" },
  { icon: BookOpen, label: "Rules", href: "/rules" },
  { icon: Images, label: "Gallery", href: "/gallery" },
  { icon: HelpCircle, label: "Help", href: "/contact" },
];


export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sticky top-0 z-40 border-b border-border bg-background/95 px-2 py-2 text-foreground backdrop-blur-xl lg:hidden">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Link href="/public-dashboard" className="flex min-w-0 shrink items-center gap-2">
            <img
              src="/msu-logo-flat.png"
              alt="Medhavi Skills University"
              className="h-7 w-20 max-w-full object-contain sm:h-9 sm:w-24"
            />
            <span className="sport-heading text-sm font-black text-primary sm:text-base">Invicta</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-accent px-2.5 text-[9px] font-black uppercase tracking-widest text-accent-foreground sm:h-10 sm:px-3 sm:text-[10px]"
            >
              <LogIn size={12} className="sm:size-[14px]" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          </div>
        </div>

        <nav className="nav-compact no-scrollbar flex flex-nowrap gap-1 overflow-x-auto pb-0.5">
          {menuItems.slice(0, 6).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-link inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all sm:gap-2 sm:px-3 sm:py-2 sm:text-[10px]",
                  isActive
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                <item.icon size={12} className="sm:size-[14px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-[#020617] text-white lg:block">
        <div className="no-scrollbar flex h-full flex-col overflow-y-auto px-5 py-6">
          <Link href="/public-dashboard" className="mb-7 block">
            <img
              src="/msu-logo-flat.png"
              alt="Medhavi Skills University"
              className="mb-4 h-auto w-full object-contain"
            />
            <div className="border-t border-white/10 pt-4">
              <p className="sport-heading text-xl font-black tracking-tight text-white">Invicta</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-accent">Sports Hub</p>
            </div>
          </Link>

          <nav className="flex flex-1 flex-col gap-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-wide transition-all",
                    isActive
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-white/10 text-slate-300 hover:border-white/30 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon size={19} className={cn(isActive ? "text-accent-foreground" : "text-slate-500 group-hover:text-accent")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <Link
            href="/login"
            className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-950 transition-all hover:bg-accent"
          >
            <LogIn size={16} />
            Staff Login
          </Link>
        </div>
      </aside>
    </>
  );
}
