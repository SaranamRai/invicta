"use client";

import React, { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ActivityLog, MatchData } from "@/lib/types";
import { Activity, Clock, Trophy, AlertCircle, Play, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { updateMatchDetails, logActivity } from "@/lib/services/firebase-service";
import { cn } from "@/lib/utils";
import { formatMatchClock, getMatchClockText, getMatchElapsedSeconds } from "@/lib/match-clock";

export default function VolunteerDashboard() {
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [selectedSport, setSelectedSport] = useState("All");
  const [startingId, setStartingId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    // Listen to recent activity
    const qLogs = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"), limit(5));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setRecentLogs(logs);
    });

    // Listen to live matches
    const qMatches = query(collection(db, "matches"));
    const unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchData));
      setMatches(matchesData.sort((a, b) => b.lastUpdated - a.lastUpdated));
    });

    return () => {
      unsubscribeLogs();
      unsubscribeMatches();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const sports = ["All", ...Array.from(new Set(matches.map(match => match.sport)))];
  const filteredMatches = matches.filter(match => selectedSport === "All" || match.sport === selectedSport);
  const activeMatches = matches.filter(match => match.status === "Live");
  const nextMatch = matches.find(match => match.status === "Upcoming");

  const startMatch = async (match: MatchData) => {
    setStartingId(match.id);
    try {
      const email = auth.currentUser?.email || "volunteer@gmail.com";
      const currentNow = new Date().getTime();
      const shouldStartFromBeginning = match.status === "Upcoming" || !match.startedAt;
      const elapsedSeconds = shouldStartFromBeginning ? 0 : getMatchElapsedSeconds(match, now || currentNow);

      await updateMatchDetails(match.id, {
        status: "Live",
        startedAt: shouldStartFromBeginning ? currentNow : match.startedAt || currentNow,
        timerStartedAt: currentNow,
        elapsedSeconds,
        timer: shouldStartFromBeginning ? "00:00" : formatMatchClock(elapsedSeconds),
        clockRunning: true,
        period: match.period === "Half Time" ? "Second Half" : shouldStartFromBeginning ? "First Half" : match.period || "First Half",
      });
      await logActivity(match.id, `Started ${match.teamA} vs ${match.teamB}`, email);
    } finally {
      setStartingId(null);
    }
  };

  const adjustScore = async (match: MatchData, team: "A" | "B", amount: number) => {
    try {
      const email = auth.currentUser?.email || "volunteer@gmail.com";
      const currentNow = new Date().getTime();
      const nextScoreA = team === "A" ? Math.max(0, match.scoreA + amount) : match.scoreA;
      const nextScoreB = team === "B" ? Math.max(0, match.scoreB + amount) : match.scoreB;
      const teamName = team === "A" ? match.teamA : match.teamB;

      await updateMatchDetails(match.id, {
        scoreA: nextScoreA,
        scoreB: nextScoreB,
        lastUpdated: currentNow
      });

      await logActivity(
        match.id,
        `Quick Score Update: ${teamName} ${amount > 0 ? "+" : ""}${amount}. Score: ${nextScoreA}-${nextScoreB}`,
        email
      );
    } catch (error) {
      console.error("Failed to update score:", error);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase sport-heading">Dashboard Overview</h1>
        <p className="text-muted-foreground font-medium mt-2 uppercase tracking-widest text-xs">
          Manage live events and track updates
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Live Matches</p>
            <p className="text-3xl font-black text-foreground">{activeMatches.length}</p>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Updates Today</p>
            <p className="text-3xl font-black text-foreground">{recentLogs.length * 5}+</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next Event</p>
            <p className="text-xl font-black text-foreground mt-1">{nextMatch?.time || "TBD"}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-foreground">Sports Match Control</h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select a sport, start the clock, then update points in the control panel.</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-border bg-secondary/50 p-1">
              {sports.map(sport => (
                <button
                  key={sport}
                  onClick={() => setSelectedSport(sport)}
                  className={cn(
                    "whitespace-nowrap rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedSport === sport ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredMatches.length > 0 ? filteredMatches.map(match => {
              const isRunning = match.status === "Live" && match.clockRunning;
              const isFinished = match.status === "Finished" || match.period === "Full Time";

              return (
                <Card key={match.id} className="p-6 relative overflow-hidden">
                  {isRunning && <div className="absolute left-0 top-0 h-full w-1 bg-accent" />}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{match.sport} / {match.type}</span>
                      <h3 className="mt-2 text-lg font-black uppercase tracking-wide text-foreground">{match.teamA} vs {match.teamB}</h3>
                    </div>
                    <span className={cn(
                      "rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest",
                      isFinished ? "bg-red-500/10 text-red-400" :
                      isRunning ? "bg-accent/20 text-accent" :
                      match.status === "Upcoming" ? "bg-blue-500/10 text-blue-400" :
                      "bg-slate-500/10 text-slate-400"
                    )}>
                      {isFinished ? "Finished" : isRunning ? "Running" : match.status}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-[1.2fr_1fr_1.2fr] items-center gap-4 rounded-2xl bg-secondary/60 p-4">
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{match.teamA}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => adjustScore(match, "A", -1)}
                          disabled={isFinished}
                          className="h-7 w-7 rounded-lg bg-card border border-border hover:border-accent flex items-center justify-center text-xs font-black text-foreground transition-all disabled:opacity-20"
                        >
                          -
                        </button>
                        <span className="text-2xl font-black text-foreground w-8 text-center">{match.scoreA}</span>
                        <button
                          onClick={() => adjustScore(match, "A", 1)}
                          disabled={isFinished}
                          className="h-7 w-7 rounded-lg bg-accent hover:scale-105 flex items-center justify-center text-xs font-black text-accent-foreground transition-all disabled:opacity-20"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-xl font-black text-accent">{getMatchClockText(match, now)}</p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{match.period || "First Half"}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{match.teamB}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => adjustScore(match, "B", -1)}
                          disabled={isFinished}
                          className="h-7 w-7 rounded-lg bg-card border border-border hover:border-accent flex items-center justify-center text-xs font-black text-foreground transition-all disabled:opacity-20"
                        >
                          -
                        </button>
                        <span className="text-2xl font-black text-foreground w-8 text-center">{match.scoreB}</span>
                        <button
                          onClick={() => adjustScore(match, "B", 1)}
                          disabled={isFinished}
                          className="h-7 w-7 rounded-lg bg-accent hover:scale-105 flex items-center justify-center text-xs font-black text-accent-foreground transition-all disabled:opacity-20"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {!isFinished && (
                      <button
                        onClick={() => startMatch(match)}
                        disabled={startingId === match.id || isRunning}
                        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Play size={16} />
                        {isRunning ? "Clock Running" : match.status === "Live" ? "Resume Clock" : "Start Match"}
                      </button>
                    )}
                    <Link
                      href={`/volunteer/matches/${match.id}`}
                      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-[10px] font-black uppercase tracking-widest text-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      <ListChecks size={16} />
                      Control Panel
                    </Link>
                  </div>
                </Card>
              );
            }) : (
              <div className="col-span-full text-center p-10 border border-dashed border-border rounded-2xl">
                <AlertCircle size={32} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No matches for this sport</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase tracking-wider text-foreground border-b border-border pb-4">
            Recent Activity
          </h2>
          
          <div className="space-y-4">
            {recentLogs.length > 0 ? recentLogs.map(log => (
              <Card key={log.id} className="p-4 flex gap-4 items-start">
                <div className="mt-1 h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <Activity size={14} />
                </div>
                <div>
                  <p className="text-sm text-foreground">{log.action}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                    {formatDistanceToNow(log.timestamp, { addSuffix: true })} • {log.volunteerEmail}
                  </p>
                </div>
              </Card>
            )) : (
              <div className="text-center p-10 border border-dashed border-border rounded-2xl">
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
