"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, HelpCircle, Images, LayoutDashboard, Megaphone, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
<<<<<<< HEAD
=======
import { ThemeToggle } from "@/components/theme-toggle";
import { InvictaLogo } from "@/components/invicta-logo";
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)

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
<<<<<<< HEAD
    <aside className="relative z-40 w-full overflow-hidden border-b border-white/5 bg-[#020617] text-white transition-transform lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      {/* Background Accent */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
      
      <div className="relative flex h-full flex-col overflow-y-auto px-4 py-4 lg:py-5">
        <div className="mb-4 flex shrink-0 items-center gap-4 px-2 lg:mb-8 lg:flex-col lg:items-stretch">
          <div className="flex aspect-[425/159] w-40 items-center justify-center self-center sm:w-48 lg:mb-5 lg:w-full">
            <img 
              src="/msu-logo-flat.png" 
              alt="Medhavi Skills University" 
              className="block h-full w-full object-contain" 
            />
=======
    <>
      <aside className="sticky top-0 z-40 border-b border-border bg-background/95 px-2 py-2 text-foreground backdrop-blur-xl lg:hidden">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Link href="/public-dashboard" className="flex min-w-0 shrink items-center gap-2">
            <InvictaLogo className="h-10 w-40 sm:h-12 sm:w-48" />
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
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)
          </div>

          <div className="hidden h-[1px] w-full bg-gradient-to-r from-accent/50 to-transparent lg:mb-4 lg:block" />
          <span className="block min-w-0 text-[10px] font-black uppercase tracking-[0.22em] text-accent/80 lg:px-1">INVICTA SPORTS HUB</span>

        </div>






        <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-1 lg:flex-col lg:space-y-2 lg:overflow-visible lg:pb-0">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex min-w-fit items-center justify-between rounded-xl border px-4 py-3 transition-all duration-300 lg:min-w-0 lg:py-3.5",
                  isActive 
                    ? "border-white bg-accent text-accent-foreground shadow-[0_0_20px_rgba(252,191,77,0.3)] scale-[1.02]" 
                    : "border-white/10 text-slate-400 hover:border-white/30 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center">
                  <item.icon size={22} className={cn("mr-3 transition-transform group-hover:scale-110 lg:mr-4", isActive ? "text-accent-foreground" : "text-slate-500 group-hover:text-accent")} />
                  <span className={cn("text-xs font-black tracking-[0.1em] uppercase sport-heading", isActive ? "text-accent-foreground" : "")}>{item.label}</span>
                </div>
                {isActive && <div className="h-2 w-2 rounded-full bg-accent-foreground animate-pulse" />}
              </Link>
            );
          })}
        </nav>

<<<<<<< HEAD
        <div className="mt-auto hidden pt-8 lg:block" />
=======
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-[#020617] text-white lg:block">
        <div className="no-scrollbar flex h-full flex-col overflow-y-auto px-5 py-6">
          <Link href="/public-dashboard" className="mb-7 block">
            <InvictaLogo className="mx-auto mb-4 h-16 w-full" />
            <div className="border-t border-white/10 pt-4">
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-accent">Sports Hub</p>
            </div>
          </Link>
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)


      </div>
    </aside>
  );
}
