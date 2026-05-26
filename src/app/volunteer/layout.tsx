"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { LayoutDashboard, Calendar, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/volunteer", icon: LayoutDashboard },
  { name: "Matches", href: "/volunteer/matches", icon: Calendar },
];

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.email?.toLowerCase() === "volunteer@gmail.com") {
        setLoading(false);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white/5 border-r border-white/10 flex flex-col">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-4">
            <span className="text-[20px] font-bold tracking-[0.4em] text-white uppercase font-serif italic">Invicta</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mt-2">Volunteer Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all",
                  isActive
                    ? "bg-accent/20 text-accent border border-accent/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => {
              auth.signOut();
              router.push("/login");
            }}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8 md:p-12 relative">
        {/* Subtle Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-[0.02] blur-[20px] pointer-events-none select-none">
           <img src="/msu-logo.png" alt="" className="w-full h-full object-contain" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
