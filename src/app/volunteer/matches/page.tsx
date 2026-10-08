"use client";

import React, { useEffect, useState } from "react";
import { MatchData } from "@/lib/types";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAssignedMatches } from "@/lib/services/mongo-service";
import { getRoleAccount } from "@/lib/role-auth";
import { GenderMark } from "@/components/gender-mark";

export default function MatchesSelectionPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Live" | "Paused" | "Upcoming" | "Finished">("All");
  const [category, setCategory] = useState("All");
  const [date, setDate] = useState("");
  const assignedSport = getRoleAccount()?.assignedSport?.trim().toLowerCase() || "";

  useEffect(() => {
    let isMounted = true;

    async function loadMatches() {
      const matchesData = await getAssignedMatches();
      if (!isMounted) return;
      setMatches(matchesData.sort((a, b) => b.lastUpdated - a.lastUpdated));
    }

    void loadMatches();
    const interval = window.setInterval(loadMatches, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [assignedSport]);

  const filteredMatches = matches.filter(match => {
    const matchesSearch = match.teamA.toLowerCase().includes(search.toLowerCase()) || 
                          match.teamB.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || match.status === filter;
    const matchesCategory = category === "All" || match.category === category;
    const matchesDate = !date || String(match.date || "").slice(0, 10) === date;
    return matchesSearch && matchesFilter && matchesCategory && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase sport-heading sm:text-3xl">All Matches</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-400">
            Find the match you are responsible for, then open it to update the clock, score, announcements, and match events.
          </p>
        </div>

        <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1 sm:gap-2">
          {(["All", "Live", "Paused", "Upcoming", "Finished"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-all sm:px-4 sm:tracking-widest",
                filter === f ? "bg-accent text-accent-foreground" : "text-slate-400 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by team name..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-12 text-sm font-bold tracking-tight focus:outline-none focus:border-accent text-white placeholder:text-slate-500 transition-colors"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["All", "Male", "Female"] as const).map(value => (
          <button key={value} onClick={() => setCategory(value)} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold", category === value ? "bg-accent text-accent-foreground" : "bg-white/5 text-slate-300")}>
            {value !== "All" && <GenderMark gender={value} className="h-4 w-4" />}{value}
          </button>
        ))}
        <label htmlFor="assigned-match-date" className="sr-only">Filter assigned matches by date</label>
        <input id="assigned-match-date" type="date" value={date} onChange={event => setDate(event.target.value)} className="min-h-10 max-w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
        {date && <button onClick={() => setDate("")} className="min-h-10 rounded-xl px-3 text-xs font-bold text-slate-300">Clear date</button>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredMatches.map(match => (
          <Link key={match.id} href={`/volunteer/matches/${match.id}`}>
            <Card className="bg-white/5 border-white/10 p-3 transition-colors hover:bg-white/10 sm:p-4">
              {match.status === "Live" && (
                <div className="absolute left-0 top-0 h-full w-1 bg-accent" />
              )}
              
              <div className="flex justify-between items-center mb-6">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                  match.status === "Live" ? "text-accent" :
                  match.status === "Paused" ? "text-amber-400" :
                  match.status === "Upcoming" ? "text-blue-500" :
                  "text-slate-500"
                )}>
                  {match.status === "Live" && <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
                  {match.status}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{match.category && <GenderMark gender={match.category} className="h-4 w-4" />}{match.sport}</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-white">{match.teamA}</span>
                  <span className="text-xl font-black text-white">{match.scoreA}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-white">{match.teamB}</span>
                  <span className="text-xl font-black text-white">{match.scoreB}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-accent transition-colors">
                  Open Match Controls &rarr;
                </span>
              </div>
            </Card>
          </Link>
        ))}
        {!filteredMatches.length && <div className="col-span-full rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm font-semibold text-slate-400">{matches.length ? "No assigned matches match these filters." : "No matches are currently assigned to you."}</div>}
      </div>
    </div>
  );
}
