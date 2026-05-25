"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Trophy, 
  Calendar, 
  Users, 
  Settings, 
  ChevronRight,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Trophy, label: "League Tables", href: "/standings" },
  { icon: Calendar, label: "Match Center", href: "/matches" },
  { icon: Target, label: "Sports", href: "/sports" },
];


export function Sidebar() {
  const pathname = usePathname();
  const [user] = useAuthState(auth);


  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-[#020617] text-white transition-transform overflow-hidden">
      {/* Background Accent */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
      
      <div className="relative flex h-full flex-col overflow-y-auto px-4 py-8">
        <div className="mb-12 flex flex-col px-4 group">
          <div className="h-32 w-full mb-6 self-center bg-white p-6 rounded-[2rem] shadow-[0_10px_40px_rgba(255,255,255,0.1)] border border-white/10 group-hover:scale-[1.02] transition-transform duration-500">
            <img 
              src="/msu-logo.png" 
              alt="Medhavi Skills University" 
              className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
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

        <div className="mt-auto pt-8 space-y-4">
          {!user && (
            <Link 
              href="/register"
              className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-accent text-accent-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-accent/10"
            >
              <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] sport-heading">Join The League</span>
              <div className="absolute inset-0 translate-x-[-100%] bg-white/20 transition-transform group-hover:translate-x-0" />
            </Link>
          )}


        </div>


      </div>
    </aside>
  );
}


