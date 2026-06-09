"use client";

import React, { useEffect, useState } from "react";
import { MatchData } from "@/lib/types";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAssignedMatches } from "@/lib/services/mongo-service";
import { getRoleAccount } from "@/lib/role-auth";
import { sports as sportCatalog } from "@/lib/mock-data";

function normalizeSportValue(value?: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function getSportDisplayName(sportId?: string, sportName?: string) {
  const name = sportName?.trim();
  if (name) return name;

  const normalizedSport = normalizeSportValue(sportId);
  const sport = sportCatalog.find((item) => item.id === normalizedSport || normalizeSportValue(item.name) === normalizedSport);
  return sport?.name || sportId || "Assigned sport";
}

export default function MatchesSelectionPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Live" | "Upcoming" | "Finished">("All");
  const account = getRoleAccount();
  const assignedSport = normalizeSportValue(account?.assignedSport);

  useEffect(() => {
    let isMounted = true;

    async function loadMatches() {
      const matchesData = await getAssignedMatches();
      if (!isMounted) return;
      setMatches(matchesData.sort((a, b) => b.lastUpdated - a.lastUpdated));
    }

    void loadMatches();
    const interval = window.setInterval(loadMatches, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [assignedSport]);

  const filteredMatches = matches.filter(match => {
    const matchesSearch = match.teamA.toLowerCase().includes(search.toLowerCase()) || 
                          match.teamB.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" || match.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase sport-heading">All Matches</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-400">
            Find the match you are responsible for, then open it to update the clock, score, announcements, and match events.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-1">
          {(["All", "Live", "Upcoming", "Finished"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f ? "bg-accent text-accent-foreground" : "text-slate-400 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by team name..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-12 text-sm font-bold tracking-tight focus:outline-none focus:border-accent text-white placeholder:text-slate-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMatches.map(match => (
          <Link key={match.id} href={`/volunteer/matches/${match.id}`}>
            <Card className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors cursor-pointer relative overflow-hidden group">
              {match.status === "Live" && (
                <div className="absolute left-0 top-0 h-full w-1 bg-accent" />
              )}
              
              <div className="flex justify-between items-center mb-6">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                  match.status === "Live" ? "text-accent" :
                  match.status === "Upcoming" ? "text-blue-500" :
                  "text-slate-500"
                )}>
                  {match.status === "Live" && <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
                  {match.status}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {getSportDisplayName(match.sport, match.sportName || account?.assignedSportName)}
                </span>
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
      </div>
    </div>
  );
}
