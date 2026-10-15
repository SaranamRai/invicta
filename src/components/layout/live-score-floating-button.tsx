"use client";

import { usePathname } from "next/navigation";
import { X, Radio, Clock, MapPin, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

import { getPublicFixtures, getPublicLiveFeeds, getPublicLiveScores, mapMongoFixture } from "@/lib/api";
import { MatchData } from "@/lib/types";

export function LiveScoreFloatingButton() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [latestVolunteerUpdate, setLatestVolunteerUpdate] = useState("");

  useEffect(() => {
    const storedMatchId = window.localStorage.getItem("invicta-selected-match");
    const restoreTimer = window.setTimeout(() => {
      if (storedMatchId) setSelectedMatchId(storedMatchId);
    }, 0);
    const handleSelected = (event: Event) => {
      const matchId = (event as CustomEvent<string>).detail;
      setSelectedMatchId(matchId || null);
    };
    const handleCleared = () => {
      window.localStorage.removeItem("invicta-selected-match");
      setSelectedMatchId(null);
      setSelectedMatch(null);
      setLatestVolunteerUpdate("");
    };
    window.addEventListener("invicta-match-selected", handleSelected);
    window.addEventListener("invicta-match-cleared", handleCleared);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("invicta-match-selected", handleSelected);
      window.removeEventListener("invicta-match-cleared", handleCleared);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSelectedMatch = async () => {
      if (!selectedMatchId) return;
      try {
        const [fixtures, liveScores, feeds] = await Promise.all([getPublicFixtures(), getPublicLiveScores(), getPublicLiveFeeds()]);
        if (!mounted) return;
        const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
        const fixture = fixtures.find((item) => item._id === selectedMatchId);
        const nextMatch = fixture ? mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData : null;
        if (nextMatch?.status === "Finished") {
          window.localStorage.removeItem("invicta-selected-match");
          setSelectedMatchId(null);
          setSelectedMatch(null);
          setLatestVolunteerUpdate("");
        } else {
          setSelectedMatch(nextMatch);
          const latestFeed = feeds
            .filter((feed) => (typeof feed.fixtureId === "string" ? feed.fixtureId : feed.fixtureId?._id || feed.fixtureId?.id) === selectedMatchId)
            .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))[0];
          setLatestVolunteerUpdate(latestFeed?.message || "");
        }
      } catch (error) {
        console.error("Failed to load selected match score:", error);
      }
    };
    void loadSelectedMatch();
    const refresh = window.setInterval(loadSelectedMatch, 1000);
    return () => {
      mounted = false;
      window.clearInterval(refresh);
    };
  }, [selectedMatchId]);

  if (pathname === "/login" || pathname.startsWith("/admin")) return null;
  const showLauncher = pathname !== "/public-dashboard";

  return (
    <>
      {selectedMatch && (
        <div className="fixed bottom-4 left-4 z-[60] w-[min(19rem,calc(100vw-2rem))] rounded-xl border-2 border-[#d4a72c] bg-[#050505] p-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.55)] sm:bottom-6 sm:left-6">
          <div className="flex items-center gap-2 border-b border-[#d4a72c]/40 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#d4a72c]" />
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#f0c75e]">
                {selectedMatch.status === "Live" ? "Live Match" : "Following Match"}
              </span>
            </div>
          </div>
          {latestVolunteerUpdate && (
            <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-2">
              <p className="mb-1 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[#f0c75e]">
                <MessageCircle size={11} /> Volunteer update
              </p>
              <p className="line-clamp-2 text-[11px] font-medium leading-relaxed text-white/85">{latestVolunteerUpdate}</p>
            </div>
          )}
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
            <span className="truncate text-right text-[11px] font-black uppercase text-white">{selectedMatch.teamA}</span>
            <span className="rounded-lg border border-[#d4a72c]/50 bg-white/10 px-2.5 py-1 text-base font-black text-[#f0c75e]">
              {selectedMatch.scoreA} : {selectedMatch.scoreB}
            </span>
            <span className="truncate text-[11px] font-black uppercase text-white">{selectedMatch.teamB}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-widest text-white/60">
            <span className="inline-flex items-center gap-1"><Clock size={11} className="text-[#d4a72c]" /> {selectedMatch.status === "Live" ? selectedMatch.timer || "Live" : selectedMatch.status}</span>
            <span className="inline-flex max-w-[10rem] items-center gap-1 truncate"><MapPin size={11} className="text-[#d4a72c]" /> {selectedMatch.venue || "Venue TBD"}</span>
          </div>
          <div className="mt-2">
            <Link href="/matches" className="block rounded-lg border border-[#d4a72c]/60 px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-widest text-[#f0c75e] transition-colors hover:bg-[#d4a72c] hover:text-black">
              Open Match
            </Link>
          </div>
        </div>
      )}
      {showLauncher && isOpen && (
        <div className="fixed bottom-20 right-4 z-[60] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-2xl sm:bottom-24 sm:right-6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Live scores</p>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close live scores"><X size={15} /></button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Select a match from the Matches page to keep its score here while browsing.</p>
          <Link href="/matches" className="mt-3 block rounded-xl bg-accent px-3 py-2 text-center text-[9px] font-black uppercase tracking-widest text-accent-foreground">View matches</Link>
        </div>
      )}
      {showLauncher && (
        <button
          type="button"
          data-testid="live-score-toggle"
          onClick={() => setIsOpen((value) => !value)}
          className="fixed bottom-4 right-4 z-50 inline-flex h-12 items-center gap-2 rounded-full border border-accent/40 bg-[#020617] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-2xl shadow-slate-950/25 transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-4 focus:ring-accent/20 sm:bottom-6 sm:right-6 sm:px-5"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close live score widget" : "Open live score widget"}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          {isOpen ? <X size={15} /> : <Radio size={15} />}
          Live Score
        </button>
      )}
    </>
  );
}
