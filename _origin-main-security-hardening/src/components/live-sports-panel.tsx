"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Activity,
  X,
  Radio,
  Minimize2,
  Calendar,
  MapPin,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MatchData } from "@/lib/types";
import { getMatchClockText, getMatchPeriod } from "@/lib/match-clock";
import { getPublicFixtures, getPublicLiveScores, mapMongoFixture } from "@/lib/api";

type LiveSportsPanelProps = {
  initialExpanded?: boolean;
  onClose?: () => void;
  positionClassName?: string;
  showMinimizedButton?: boolean;
};

function SportIcon({ name, className }: { name: string; className?: string }) {
  const normalized = name.toLowerCase();
  if (normalized.includes("football") || normalized.includes("soccer")) {
    return <span className={cn("text-lg", className)}>⚽</span>;
  }
  if (normalized.includes("cricket")) {
    return <span className={cn("text-lg", className)}>🏏</span>;
  }
  if (normalized.includes("basketball")) {
    return <span className={cn("text-lg", className)}>🏀</span>;
  }
  if (normalized.includes("badminton")) {
    return <span className={cn("text-lg", className)}>🏸</span>;
  }
  if (normalized.includes("volleyball")) {
    return <span className={cn("text-lg", className)}>🏐</span>;
  }
  return <Trophy className={cn("h-4 w-4 text-yellow-500", className)} />;
}

export function LiveSportsPanel({
  initialExpanded = true,
  onClose,
  positionClassName = "fixed top-24 right-5 sm:right-8 lg:right-10",
  showMinimizedButton = true,
}: LiveSportsPanelProps = {}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [highlightedTeam, setHighlightedTeam] = useState<{ [matchId: string]: "A" | "B" | "both" | null }>({});
  const [now, setNow] = useState(() => Date.now());
  const prevScoresRef = useRef<{ [matchId: string]: { scoreA: number; scoreB: number } }>({});

  const loadMatches = async () => {
    try {
      const [fixtures, liveScores] = await Promise.all([
        getPublicFixtures(),
        getPublicLiveScores(),
      ]);

      const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
      const mappedMatches = fixtures.map((fixture) => 
        mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData
      );

      // Detect score increases for highlight animations
      const nextHighlights: typeof highlightedTeam = {};
      mappedMatches.forEach((match) => {
        const prev = prevScoresRef.current[match.id];
        if (prev) {
          let side: "A" | "B" | "both" | null = null;
          if (match.scoreA > prev.scoreA && match.scoreB > prev.scoreB) {
            side = "both";
          } else if (match.scoreA > prev.scoreA) {
            side = "A";
          } else if (match.scoreB > prev.scoreB) {
            side = "B";
          }

          if (side) {
            nextHighlights[match.id] = side;
            // Clear highlight after 2.5s
            setTimeout(() => {
              setHighlightedTeam((prevMap) => ({
                ...prevMap,
                [match.id]: null,
              }));
            }, 2500);
          }
        }
        // Save current scores for next comparison
        prevScoresRef.current[match.id] = {
          scoreA: match.scoreA ?? 0,
          scoreB: match.scoreB ?? 0,
        };
      });

      if (Object.keys(nextHighlights).length > 0) {
        setHighlightedTeam((prevMap) => ({
          ...prevMap,
          ...nextHighlights,
        }));
      }

      setMatches(mappedMatches);
    } catch (err) {
      console.error("Failed to load live panel matches:", err);
    }
  };

  useEffect(() => {
    loadMatches();
    const refreshInterval = window.setInterval(loadMatches, 15000);
    const clockInterval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
    };
  }, []);

  const liveMatches = matches.filter((m) => m.status === "Live");
  const hasLiveMatches = liveMatches.length > 0;
  const upcomingMatches = matches
    .filter((m) => m.status === "Upcoming")
    .slice(0, 2);

  return (
    <>
      <div
        data-testid="live-score-widget"
        className={cn(positionClassName, "z-40 w-[320px] max-w-[calc(100vw-2.5rem)] font-sans")}
      >
        <AnimatePresence mode="popLayout">
          {isExpanded ? (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-border bg-card/85 backdrop-blur-xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col max-h-[480px] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className={cn(
                      "absolute inline-flex h-full w-full rounded-full opacity-75",
                      hasLiveMatches ? "animate-ping bg-green-500" : "bg-muted-foreground"
                    )} />
                    <span className={cn(
                      "relative inline-flex rounded-full h-2 w-2",
                      hasLiveMatches ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                    🏆 VIEW LIVE MATCHES
                    {hasLiveMatches && (
                      <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        {liveMatches.length} Active
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (onClose) {
                      onClose();
                    } else {
                      setIsExpanded(false);
                    }
                  }}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={onClose ? "Close Live Panel" : "Minimize Live Panel"}
                >
                  {onClose ? <X size={13} /> : <Minimize2 size={13} />}
                </button>
              </div>

              {/* Scrollable Match List */}
              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-0.5">
                {hasLiveMatches ? liveMatches.map((match) => {
                    const highlight = highlightedTeam[match.id];
                    return (
                      <div
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className="group p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 cursor-pointer transition-all hover:scale-[1.01] hover:border-accent/40"
                      >
                        {/* Sport & Time */}
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          <div className="flex items-center gap-1.5">
                            <SportIcon name={match.sport} />
                            <span className="text-foreground/80 font-black">{match.sportName || match.sport}</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-500 font-extrabold animate-pulse">
                            <Clock size={11} />
                            <span>{getMatchClockText(match, now)}</span>
                          </div>
                        </div>

                        {/* Teams & Score Row */}
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          {/* Team A */}
                          <div className="text-right truncate font-bold text-xs uppercase tracking-wide text-foreground">
                            {match.teamA}
                          </div>
                          
                          {/* Score Pill */}
                          <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-lg font-black text-sm text-foreground">
                            <span className={cn(
                              "transition-all duration-300", 
                              highlight === "A" || highlight === "both" ? "text-accent scale-125" : ""
                            )}>
                              {match.scoreA ?? 0}
                            </span>
                            <span className="text-muted-foreground/50">:</span>
                            <span className={cn(
                              "transition-all duration-300", 
                              highlight === "B" || highlight === "both" ? "text-accent scale-125" : ""
                            )}>
                              {match.scoreB ?? 0}
                            </span>
                          </div>

                          {/* Team B */}
                          <div className="text-left truncate font-bold text-xs uppercase tracking-wide text-foreground">
                            {match.teamB}
                          </div>
                        </div>

                        {/* Match Status / Period */}
                        <div className="mt-2 text-center text-[9px] font-black uppercase text-accent tracking-[0.2em]">
                          {getMatchPeriod(match)}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-dashed border-border py-4 text-center">
                        <Radio size={22} className="mx-auto mb-2 text-muted-foreground/60" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          No live matches
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground/60">Showing next matches instead</p>
                      </div>

                      {upcomingMatches.length > 0 ? (
                        <div className="space-y-2">
                          <div className="mb-1 ml-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Upcoming matches
                          </div>
                          {upcomingMatches.map((match) => (
                            <div
                              key={match.id}
                              onClick={() => setSelectedMatch(match)}
                              className="cursor-pointer rounded-lg border border-border bg-secondary/20 p-2.5 transition-all hover:border-accent/30 hover:bg-secondary/40"
                            >
                              <div className="mb-1.5 flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <SportIcon name={match.sport} className="h-3 w-3" />
                                  <span>{match.sportName || match.sport}</span>
                                </div>
                                <span className="font-extrabold uppercase tracking-wide text-blue-500">Next</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-foreground">
                                <span className="max-w-[100px] truncate">{match.teamA}</span>
                                <span className="text-[10px] font-semibold lowercase text-muted-foreground/45">vs</span>
                                <span className="max-w-[100px] truncate text-right">{match.teamB}</span>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock size={10} />
                                  <span>{match.time || "TBD"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar size={10} />
                                  <span>{match.date || "TBD"}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border bg-secondary/20 p-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Fixtures will appear here after scheduling
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {/* View All Matches Button */}
              <Link
                href="/matches"
                className="mt-3 block text-center shrink-0 rounded-xl bg-accent px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-accent-foreground shadow-lg shadow-accent/15 transition-all hover:scale-[1.01] active:scale-95 hover:bg-accent/90"
              >
                View All Matches
              </Link>
            </motion.div>
          ) : showMinimizedButton ? (
            /* Minimized Icon Widget */
            <motion.button
              key="minimized"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setIsExpanded(true)}
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-full border bg-card transition-transform hover:scale-105 active:scale-95",
                hasLiveMatches
                  ? "border-green-400/50 shadow-[0_0_28px_rgba(34,197,94,0.35)]"
                  : "border-border shadow-lg"
              )}
              aria-label="Expand Live Panel"
            >
              {hasLiveMatches && <span className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />}
              <Activity className={cn("relative h-5 w-5", hasLiveMatches ? "animate-pulse text-green-500" : "text-muted-foreground")} />
              <span className={cn(
                "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-black text-white shadow-md",
                hasLiveMatches ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
              )}>
                {liveMatches.length}
              </span>
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Match Detail Modal overlay */}
      <AnimatePresence>
        {selectedMatch && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 overflow-hidden max-h-[85vh] relative flex flex-col shadow-2xl font-sans"
            >
              {/* Modal Close */}
              <button
                onClick={() => setSelectedMatch(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close details"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="border-b border-border pb-4 mb-4 flex items-center gap-2">
                <SportIcon name={selectedMatch.sport} className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                  {selectedMatch.sportName || selectedMatch.sport} • Match Details
                </h3>
              </div>

              {/* Match Score Display */}
              <div className="bg-secondary/40 border border-border rounded-2xl p-5 mb-5 flex flex-col items-center gap-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 w-full">
                  <div className="text-right font-black uppercase text-base text-foreground tracking-wide truncate">
                    {selectedMatch.teamA}
                  </div>
                  <div className="bg-background border-2 border-border px-4 py-2.5 rounded-xl font-black text-2xl text-foreground">
                    {selectedMatch.status === "Upcoming" ? "0" : selectedMatch.scoreA ?? 0}
                    <span className="text-muted-foreground/45 mx-2">:</span>
                    {selectedMatch.status === "Upcoming" ? "0" : selectedMatch.scoreB ?? 0}
                  </div>
                  <div className="text-left font-black uppercase text-base text-foreground tracking-wide truncate">
                    {selectedMatch.teamB}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 text-[10px] font-black uppercase tracking-widest text-accent">
                  <span className="bg-accent/15 px-2.5 py-0.5 rounded-full">{selectedMatch.status}</span>
                  {selectedMatch.status === "Live" && (
                    <span className="text-green-500 flex items-center gap-1">
                      <Clock size={11} />
                      {getMatchClockText(selectedMatch, now)}
                    </span>
                  )}
                  <span>({getMatchPeriod(selectedMatch)})</span>
                </div>
              </div>

              {/* Detailed info Grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-secondary/20 border border-border/70 p-3 rounded-xl">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Calendar size={11} /> Date
                  </div>
                  <div className="text-xs font-black uppercase text-foreground">
                    {selectedMatch.date || "TBD"}
                  </div>
                </div>
                <div className="bg-secondary/20 border border-border/70 p-3 rounded-xl">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Clock size={11} /> Time
                  </div>
                  <div className="text-xs font-black uppercase text-foreground">
                    {selectedMatch.time || "TBD"}
                  </div>
                </div>
                <div className="bg-secondary/20 border border-border/70 p-3 rounded-xl col-span-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-1">
                    <MapPin size={11} /> Venue
                  </div>
                  <div className="text-xs font-black uppercase text-foreground">
                    {selectedMatch.venue || "TBD"}
                  </div>
                </div>
              </div>

              {/* Live Updates Timeline */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/75 pb-1.5 mb-2">
                  Live Commentary & Updates
                </h4>
                {selectedMatch.announcements && selectedMatch.announcements.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMatch.announcements.map((ann, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-secondary/35 border border-border text-sm font-medium text-foreground">
                        {ann}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground/60 text-xs italic">
                    No commentary or live updates posted yet for this match.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
