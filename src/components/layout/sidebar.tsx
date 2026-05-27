"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Trophy, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Trophy, label: "League Tables", href: "/standings" },
  { icon: Calendar, label: "Match Center", href: "/matches" },
  { icon: Target, label: "Sports", href: "/sports" },
];


export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-[#020617] text-white transition-transform overflow-hidden">
      {/* Background Accent */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
      
      <div className="relative flex h-full flex-col overflow-y-auto px-4 py-3">
        <div className="mb-8 flex flex-col px-4">
          <div className="mb-4 flex h-36 w-full items-center justify-center self-center p-1">
            <img 
              src="/msu-logo-flat.png" 
              alt="Medhavi Skills University" 
              className="h-full w-full object-contain animate-logo-mark" 
            />
          </div>

          <div className="h-[1px] w-full bg-gradient-to-r from-accent/50 to-transparent mb-4" />
          <span className="block text-[10px] font-black uppercase tracking-[0.5em] text-accent/80 px-1">INVICTA TERMINAL</span>

        </div>






        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-300",
                  isActive 
                    ? "bg-accent text-accent-foreground shadow-[0_0_20px_rgba(252,191,77,0.3)] scale-[1.02]" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center">
                  <item.icon size={22} className={cn("mr-4 transition-transform group-hover:scale-110", isActive ? "text-accent-foreground" : "text-slate-500 group-hover:text-accent")} />
                  <span className={cn("text-xs font-black tracking-[0.1em] uppercase sport-heading", isActive ? "text-accent-foreground" : "")}>{item.label}</span>
                </div>
                {isActive && <div className="h-2 w-2 rounded-full bg-accent-foreground animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-8 space-y-4" />


      </div>
    </aside>
  );
}
