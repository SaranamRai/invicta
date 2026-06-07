"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, HelpCircle, Images, LayoutDashboard, Megaphone, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Home", href: "/" },
  { icon: Trophy, label: "League Tables", href: "/standings" },
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
    <aside className="relative z-40 w-full overflow-hidden border-b border-white/5 bg-[#020617] text-white transition-transform lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      {/* Background Accent */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
      
      <div className="no-scrollbar relative flex h-full flex-col overflow-y-auto px-4 py-4 lg:py-5">
        <div className="mb-4 flex shrink-0 items-center gap-4 px-2 lg:mb-8 lg:flex-col lg:items-stretch">
          <div className="flex aspect-[425/159] w-40 items-center justify-center self-center sm:w-48 lg:mb-5 lg:w-full">
            <img 
              src="/msu-logo-flat.png" 
              alt="Medhavi Skills University" 
              className="block h-full w-full object-contain" 
            />
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

        <div className="mt-auto hidden pt-8 lg:block" />


      </div>
    </aside>
  );
}
