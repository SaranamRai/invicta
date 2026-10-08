"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { getPublicFixtures, getPublicLiveScores, mapMongoFixture } from "@/lib/api";
import { getMatchClockText } from "@/lib/match-clock";
import { MatchData } from "@/lib/types";
import { cn } from "@/lib/utils";

type MatchTrackerContextValue = {
  trackedMatch: MatchData | null;
  setTrackedMatch: (match: MatchData | null) => void;
};

const MatchTrackerContext = createContext<MatchTrackerContextValue | null>(null);

export function useMatchTracker() {
  const context = useContext(MatchTrackerContext);
  if (!context) throw new Error("useMatchTracker must be used inside MatchTrackerProvider");
  return context;
}

export function MatchTrackerProvider({ children }: { children: React.ReactNode }) {
  const [trackedMatch, setTrackedMatchState] = useState<MatchData | null>(null);
  const [now, setNow] = useState(0);
  const setTrackedMatch = useCallback((match: MatchData | null) => setTrackedMatchState(match), []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!trackedMatch) return;
    let active = true;

    const refreshTrackedMatch = async () => {
      try {
        const [fixtures, liveScores] = await Promise.all([getPublicFixtures(), getPublicLiveScores()]);
        if (!active) return;
        const fixture = fixtures.find((item) => item._id === trackedMatch.id);
        if (!fixture) return;
        const liveScore = liveScores.find((item) => item.fixtureId === trackedMatch.id);
        const freshMatch = mapMongoFixture(fixture, liveScore) as MatchData;
        setTrackedMatchState((current) => current?.id === freshMatch.id ? freshMatch : current);
      } catch {
        // Keep the last known score visible if the network is temporarily unavailable.
      }
    };

    void refreshTrackedMatch();
    const interval = window.setInterval(() => {
      if (!document.hidden) void refreshTrackedMatch();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [trackedMatch?.id]);

  return (
    <MatchTrackerContext.Provider value={{ trackedMatch, setTrackedMatch }}>
      {children}
      <AnimatePresence>
        {trackedMatch && (
          <motion.aside
            role="status"
            aria-live="polite"
            aria-label={`Score panel for ${trackedMatch.teamA} versus ${trackedMatch.teamB}`}
            initial={{ opacity: 0, x: 24, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 z-[80] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-accent/40 bg-slate-950/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-xl sm:bottom-6 sm:right-6"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", trackedMatch.status === "Live" ? "animate-pulse bg-red-500" : "bg-accent")} />
                <span className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-accent">
                  {trackedMatch.status} · {trackedMatch.sport}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrackedMatch(null)}
                aria-label="Close score panel"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center">
              <span className="truncate text-xs font-black uppercase sm:text-sm" title={trackedMatch.teamA}>{trackedMatch.teamA}</span>
              <span className="scoreboard-number rounded-lg bg-white/10 px-3 py-1.5 text-lg font-black tabular-nums">
                {trackedMatch.status === "Upcoming" ? "00" : trackedMatch.scoreA ?? 0}
                <span className="px-1 text-accent">:</span>
                {trackedMatch.status === "Upcoming" ? "00" : trackedMatch.scoreB ?? 0}
              </span>
              <span className="truncate text-xs font-black uppercase sm:text-sm" title={trackedMatch.teamB}>{trackedMatch.teamB}</span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <span className="truncate">{trackedMatch.category || "Match"}</span>
              <span className="shrink-0">
                {trackedMatch.status === "Upcoming"
                  ? `${trackedMatch.date || "Date TBD"} · ${trackedMatch.time || "TBD"}`
                  : trackedMatch.status === "Finished" ? "Final" : getMatchClockText(trackedMatch, now)}
              </span>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </MatchTrackerContext.Provider>
  );
}
