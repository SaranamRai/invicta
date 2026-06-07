"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, HelpCircle, Images, LayoutDashboard, LogIn, Megaphone, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Home", href: "/" },
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
      <aside className="sticky top-0 z-40 border-b border-border bg-background/95 px-3 py-3 text-foreground backdrop-blur-xl lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <img
              src="/msu-logo-flat.png"
              alt="Medhavi Skills University"
              className="h-9 w-24 object-contain"
            />
            <span className="sport-heading text-base font-black text-primary">Invicta</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-3 text-[10px] font-black uppercase tracking-widest text-accent-foreground"
          >
            <LogIn size={14} />
            Login
          </Link>
        </div>

        <nav className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {menuItems.slice(0, 6).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex min-w-fit items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                  isActive
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-[#020617] text-white lg:block">
        <div className="no-scrollbar flex h-full flex-col overflow-y-auto px-5 py-6">
          <Link href="/" className="mb-7 block">
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
