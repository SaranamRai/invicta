"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Users, 
  Activity, 
  Calendar,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { standings, sports } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { MatchData } from "@/lib/types";
import { getMatchClockText, getMatchPeriod } from "@/lib/match-clock";


export default function Home() {
  const [matchesData, setMatchesData] = useState<MatchData[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const qMatches = query(collection(db, "matches"));
    const unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchData));
      setMatchesData(data.sort((a, b) => b.lastUpdated - a.lastUpdated));
    });

    return () => unsubscribeMatches();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const activeTeams = new Set(matchesData.flatMap(match => [match.teamA, match.teamB])).size;
  const liveMatches = matchesData.filter(match => match.status === "Live").length;
  const upcomingMatches = matchesData.filter(match => match.status === "Upcoming").length;

  const stats = [
    { label: "Active Teams", value: activeTeams.toString(), icon: Users, color: "text-accent", bg: "bg-white/5" },
    { label: "Live Matches", value: liveMatches.toString(), icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Upcoming Events", value: upcomingMatches.toString(), icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Sports Disciplines", value: sports.length.toString(), icon: Trophy, color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-[#020617] text-white shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-transparent opacity-50" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-accent/10 blur-[100px]" />
        
        <div className="relative flex flex-col items-start p-12 lg:flex-row lg:items-center lg:justify-between lg:p-20">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-accent border border-accent/30">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" /> Live Arena Updates
            </div>
            <h1 className="text-6xl font-black tracking-tighter sport-heading lg:text-8xl text-white">
              MSU <span className="text-accent italic">INVICTA.</span>
            </h1>
            <p className="text-lg font-medium text-slate-400 max-w-md uppercase tracking-wider leading-relaxed">
              Official Inter-Department Sport Management Platform of Medhavi Skills University.
            </p>

          </div>

          <div className="mt-12 lg:mt-0">
            <Link href="/matches" className="group relative flex h-20 w-64 items-center justify-center overflow-hidden rounded-2xl bg-accent text-accent-foreground transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-accent/20">
              <span className="relative z-10 text-xs font-black uppercase tracking-[0.3em] sport-heading">Enter The Arena</span>
              <div className="absolute inset-0 translate-x-[-100%] bg-white/20 transition-transform group-hover:translate-x-0" />
            </Link>
          </div>
        </div>

        {/* Live Ticker */}
        <div className="border-t border-white/10 bg-black/40 py-4 backdrop-blur-md">
          <div className="flex animate-marquee whitespace-nowrap gap-20">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-20">
                <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" /> WELCOME TO MSU INVICTA • THE INTER-DEPARTMENT ARENA IS NOW LIVE
                </span>
                <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> AWAITING MATCH UPDATES FROM VOLUNTEERS
                </span>
                <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> OFFICIAL SPORTS MANAGEMENT PORTAL
                </span>

              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Row */}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="group relative overflow-hidden border-2 hover:border-accent transition-all">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon size={80} />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                  <h3 className="mt-1 text-4xl font-black sport-heading">{stat.value}</h3>
                </div>
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", stat.bg)}>
                  <stat.icon className={stat.color} size={24} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-10 lg:grid-cols-3">
        {/* Live Matches */}
        <div className="space-y-8 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-accent rounded-full" />
              <h2 className="text-2xl font-black sport-heading">Live Scoreboard</h2>
            </div>
            <Link href="/matches" className="flex items-center text-xs font-black uppercase tracking-widest text-primary hover:text-accent transition-colors">
              Match Center <ArrowUpRight size={16} className="ml-1" />
            </Link>
          </div>
          
          <div className="grid gap-6">
            {matchesData.length > 0 ? matchesData.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <Card variant={match.status === "Live" ? "scoreboard" : "default"} className="relative overflow-hidden group border-2">
                  {match.status === "Live" && (
                    <div className="absolute top-0 left-0 h-full w-2 bg-accent shadow-[0_0_15px_rgba(252,191,77,0.5)]" />
                  )}
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-6">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-inner border border-white/10 group-hover:scale-110 transition-transform">
                        <img 
                          src={match.sport === "Basketball" ? "/basketball_team_logo_1778666861312.png" : "/football_team_logo_1778666910952.png"} 
                          alt={match.sport}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent sport-heading">{match.type}</span>
                          {match.status === "Live" && (
                          <span className="flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-[9px] font-black text-accent uppercase tracking-widest animate-pulse border border-accent/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> ON AIR {getMatchClockText(match, now)}
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-black sport-heading tracking-wide">
                          <span className="opacity-80 group-hover:opacity-100 transition-opacity">{match.teamA}</span>
                          <span className="mx-3 text-accent italic">VS</span>
                          <span className="opacity-80 group-hover:opacity-100 transition-opacity">{match.teamB}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 bg-black/40 rounded-2xl p-5 min-w-[180px] border border-white/5 shadow-2xl">
                      <div className="text-center">
                        <span className="text-5xl font-black scoreboard-number leading-none tracking-tighter">{(match.scoreA ?? 0).toString().padStart(2, '0')}</span>
                      </div>
                      <div className="h-10 w-0.5 bg-white/20" />
                      <div className="text-center">
                        <span className="text-5xl font-black scoreboard-number leading-none tracking-tighter">{(match.scoreB ?? 0).toString().padStart(2, '0')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
                      {getMatchPeriod(match)}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-black text-accent">
                      {getMatchClockText(match, now)}
                    </span>
                    {match.scoreEvents?.[0] && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Last point: {match.scoreEvents[0].teamName} at {match.scoreEvents[0].matchTime}
                      </span>
                    )}
                  </div>
                </Card>
              </motion.div>
            )) : (
              <div className="flex flex-col items-center justify-center p-20 rounded-[2.5rem] bg-card/30 border-2 border-dashed border-white/10 text-center">
                <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <Activity size={40} className="text-slate-600" />
                </div>
                <h3 className="text-2xl font-black sport-heading text-white">ARENA DATA PENDING</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Volunteer updates will appear here once matches are published.</p>
              </div>
            )}
          </div>

        </div>

        {/* Quick Standings */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-primary rounded-full" />
              <h2 className="text-2xl font-black sport-heading">League Table</h2>
            </div>
            <button className="text-xs font-black uppercase tracking-widest text-primary hover:text-accent">Full Stats</button>
          </div>
          
          <Card className="p-0 overflow-hidden border-2">
            {standings.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-secondary-foreground">
                  <tr>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">POS</th>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">DEPARTMENT</th>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-center">P</th>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-right">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {standings.map((team) => (
                    <tr key={team.team} className="transition-all hover:bg-secondary/50 group">
                      <td className="px-5 py-5 font-black sport-heading text-lg">{team.rank}</td>
                      <td className="px-5 py-5 font-bold text-sm tracking-wide group-hover:text-primary transition-colors">{team.team}</td>
                      <td className="px-5 py-5 text-center text-muted-foreground font-bold">{team.played}</td>
                      <td className="px-5 py-5 text-right font-black text-lg sport-heading text-primary">{team.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center">
                <Trophy size={48} className="mx-auto text-slate-700 opacity-20 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Standings await season start</p>
              </div>
            )}
          </Card>


          {/* Ad/Promo Section */}

        </div>
      </div>
    </div>
  );
}
