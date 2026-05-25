"use client";

import Link from "next/link";
import { Bell, Search, User, LogOut } from "lucide-react";

import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";

export function Header() {
  const [user] = useAuthState(auth);

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-black sport-heading tracking-tighter text-primary">INVICTA</h2>
        <div className="h-6 w-px bg-border mx-2" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {user ? `Terminal Active: ${user.displayName || user.email}` : "Guest Terminal"}
        </span>
      </div>





      <div className="flex items-center gap-6">
        
        <div className="flex items-center gap-4 border-l border-border pl-6">
          {!user ? (
            <Link 
              href="/register"
              className="hidden sm:flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-accent-foreground shadow-lg shadow-accent/10 hover:scale-105 active:scale-95 transition-all"
            >
              Join Arena
            </Link>
          ) : (
            <button 
              onClick={() => signOut(auth)}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
            >
              <LogOut size={14} /> Exit Terminal
            </button>
          )}
          
          <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border bg-card transition-all hover:border-accent hover:text-accent group">
            <Bell size={18} />
            {user && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent animate-pulse" />}
          </button>
          
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-accent bg-accent/10 text-accent">
            <User size={18} />
          </div>
        </div>
      </div>
    </header>
  );
}

