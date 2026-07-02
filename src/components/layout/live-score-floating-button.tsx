"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio } from "lucide-react";

export function LiveScoreFloatingButton() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/admin") || pathname.startsWith("/coordinator-dashboard") || pathname.startsWith("/super-coordinator") || pathname.startsWith("/volunteer")) {
    return null;
  }

  return (
    <Link
      href="/live-score"
      className="fixed bottom-4 right-4 z-50 inline-flex h-12 items-center gap-2 rounded-full border border-accent/40 bg-[#020617] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-2xl shadow-slate-950/25 transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-4 focus:ring-accent/20 sm:bottom-6 sm:right-6 sm:h-13 sm:px-5"
      aria-label="Open live score"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      <Radio size={15} />
      Live Score
    </Link>
  );
}
