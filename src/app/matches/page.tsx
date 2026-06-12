"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, MapPin, Clock, ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchData, LiveFeedPost } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { getMatchClockText, getMatchPeriod } from "@/lib/match-clock";
import { getPublicFixtures, getPublicLiveFeeds, getPublicLiveScores, getPublicTournaments, mapMongoFixture, TournamentPayload } from "@/lib/api";

const tabs = ["All Matches", "Live", "Paused", "Upcoming", "Finished"];

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState("All Matches");
  const [matchesData, setMatchesData] = useState<MatchData[]>([]);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [liveFeeds, setLiveFeeds] = useState<LiveFeedPost[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  React.useEffect(() => {
    let isMounted = true;

    async function loadMatches() {
      const [fixtures, liveScores, feeds, publicTournaments] = await Promise.all([
        getPublicFixtures(),
        getPublicLiveScores(),
        getPublicLiveFeeds(),
        getPublicTournaments(),
      ]);

      if (!isMounted) return;

      const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
      setTournaments(publicTournaments);
      setSelectedTournamentId((current) => current || publicTournaments[0]?._id || "");
      setMatchesData(
        fixtures
          .map((fixture) => mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData)
          .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
      );
      setLiveFeeds(
        feeds
          .map((feed) => ({
            id: feed._id,
            matchId: typeof feed.fixtureId === "string" ? feed.fixtureId : feed.fixtureId?._id || feed.fixtureId?.id || "",
            matchTitle: typeof feed.fixtureId === "string" ? "Match Update" : feed.fixtureId?.name || feed.fixtureId?.teamName || "Match Update",
            content: feed.message,
            timestamp: feed.createdAt ? Date.parse(feed.createdAt) : Date.now(),
            volunteerEmail: "Volunteer",
          }) as LiveFeedPost)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      );
    }

    void loadMatches();
    const interval = window.setInterval(loadMatches, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const tournamentFilteredMatches = selectedTournamentId
    ? matchesData.filter((match) => match.tournamentId === selectedTournamentId)
    : matchesData;

  const filteredMatches = tournamentFilteredMatches.filter(match => {
    if (activeTab === "All Matches") return true;
    return match.status === activeTab;
  });

  const formatMonth = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

  const formatFullDate = (date: Date) =>
    date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary">Matches & Live Scores</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
            See every published fixture, follow live scores during a match, and read updates posted by volunteers. Selected date: {formatFullDate(selectedDate)}.
          </p>
        </div>

        <div className="flex flex-col items-end gap-4 relative">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { const now = new Date(); setCurrentDate(now); setSelectedDate(now); }}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all border border-border"
            >
              Today
            </button>
            <div className="flex items-center gap-3 rounded-2xl bg-card border-2 border-border p-2">
              <button
                onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
              >
                <ChevronLeft size={20} />
              </button>

              <div
                className="flex items-center gap-3 px-4 py-1 cursor-pointer group"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              >
                <CalendarIcon size={18} className="text-accent group-hover:scale-110 transition-transform" />
                <span className="font-black sport-heading tracking-wide min-w-[120px] text-center group-hover:text-accent transition-colors">
                  {formatMonth(currentDate)}
                </span>
              </div>

              <button
                onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Calendar Picker */}
          <AnimatePresence>
            {isCalendarOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-24 right-0 z-50 w-[360px] rounded-[2.5rem] bg-[#020617] border-2 border-white/10 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
              >
                <div className="space-y-8">
                  <div className="flex items-center justify-between gap-4">
                    <select
                      value={currentDate.getMonth()}
                      onChange={(e) => { const d = new Date(currentDate); d.setMonth(parseInt(e.target.value)); setCurrentDate(d); }}
                      className="flex-1 bg-white/5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent"
                    >
                      {months.map((m, i) => <option key={m} value={i} className="bg-[#020617]">{m}</option>)}
                    </select>
                    <select
                      value={currentDate.getFullYear()}
                      onChange={(e) => { const d = new Date(currentDate); d.setFullYear(parseInt(e.target.value)); setCurrentDate(d); }}
                      className="flex-1 bg-white/5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent"
                    >
                      {years.map(y => <option key={y} value={y} className="bg-[#020617]">{y}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-[8px] font-black uppercase tracking-tighter text-slate-500 py-2">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: days }).map((_, i) => {
                      const dayNumber = i + 1;
                      const isSelected = selectedDate.getDate() === dayNumber && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
                      const isToday = new Date().getDate() === dayNumber && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                      return (
                        <button
                          key={dayNumber}
                          onClick={() => { const d = new Date(currentDate); d.setDate(dayNumber); setSelectedDate(d); setIsCalendarOpen(false); }}
                          className={cn(
                            "h-10 w-10 rounded-xl text-xs font-black transition-all flex items-center justify-center relative group",
                            isSelected ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20" :
                            isToday ? "bg-accent/10 text-accent border border-accent/20" :
                            "hover:bg-white/10 text-slate-400"
                          )}
                        >
                          {dayNumber}
                          {isToday && !isSelected && <div className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Tournament</p>
          <h2 className="mt-1 text-xl font-black sport-heading text-foreground">Select Tournament</h2>
        </div>
        <select
          value={selectedTournamentId}
          onChange={(event) => setSelectedTournamentId(event.target.value)}
          className="mt-4 h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground outline-none transition-colors focus:border-accent sm:mt-0 sm:max-w-sm"
        >
          {tournaments.length === 0 ? (
            <option value="">No tournaments available</option>
          ) : (
            tournaments.map((tournament) => (
              <option key={tournament._id} value={tournament._id}>{tournament.name}</option>
            ))
          )}
        </select>
      </section>

      {/* Navigation Tabs */}
      <div className="flex gap-4 p-1 bg-secondary/50 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-primary hover:bg-white/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Two-column layout: Matches (left) + Live Feed (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

        {/* ── Match List ── */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="popLayout">
            {filteredMatches.length > 0 ? filteredMatches.map((match, i) => (
              <motion.div
                key={match.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card variant={match.status === "Live" ? "scoreboard" : "default"} className="group relative overflow-hidden p-0 border-2">
                  {match.status === "Live" && (
                    <div className="absolute left-0 top-0 h-full w-2 bg-accent" />
                  )}
                  <div className="grid grid-cols-1 xl:grid-cols-[180px_minmax(0,1fr)_132px]">
                    {/* Status & Info */}
                    <div className={cn(
                      "flex flex-col justify-center border-b p-5 sm:p-6 xl:border-b-0 xl:border-r",
                      match.status === "Live" ? "bg-white/5 border-white/10" : "bg-secondary/30 border-border"
                    )}>
                      <div className="space-y-4">
                        <div className={cn(
                          "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest",
                          match.status === "Live" ? "bg-accent/20 text-accent" :
                          match.status === "Paused" ? "bg-amber-500/10 text-amber-400" :
                          match.status === "Upcoming" ? "bg-blue-500/10 text-blue-500" :
                          "bg-slate-500/10 text-slate-500"
                        )}>
                          {match.status === "Live" && <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
                          {match.status === "Live" ? "ON AIR" : match.status}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest opacity-60">
                            <Clock size={14} className="text-accent" />
                            {match.status === "Upcoming" ? match.time || "TBD" : getMatchClockText(match, now)}
                          </div>
                          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest opacity-60">
                            <MapPin size={14} className="text-accent" />
                            {match.venue || "Venue TBD"}
                          </div>
                        </div>
                      </div>
                      {match.announcements && match.announcements.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Live Update</div>
                          <div className="text-xs text-slate-300 italic">{match.announcements[0]}</div>
                        </div>
                      )}
                    </div>

                    {/* Teams & Score */}
                    <div className="min-w-0 p-5 sm:p-6 xl:p-7">
                      <div className="flex min-w-0 flex-wrap items-center justify-center gap-5">
                        {/* Team A */}
                        <div className="group/team order-1 flex min-w-0 flex-1 basis-[calc(50%-0.75rem)] items-center justify-start gap-4 text-left">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl shadow-inner transition-transform group-hover/team:scale-110">
                            🏆
                          </div>
                          <div className="min-w-0">
                            <span className="sport-heading block truncate text-2xl font-black uppercase tracking-wide text-white lg:text-3xl">{match.teamA}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="order-2 flex w-full shrink-0 flex-col items-center gap-2">
                          <div className={cn(
                            "flex items-center gap-4 rounded-2xl border-2 px-6 py-4 shadow-2xl transition-all",
                            match.status === "Live" || match.status === "Paused" ? "bg-black/60 border-accent/40" : "bg-secondary border-border"
                          )}>
                            <span className={cn("scoreboard-number text-4xl font-black leading-none sm:text-5xl", match.status === "Upcoming" ? "opacity-20" : "text-white")}>
                              {match.status === "Upcoming" ? "00" : (match.scoreA ?? 0).toString().padStart(2, "0")}
                            </span>
                            <span className="text-3xl font-black italic text-accent opacity-50">:</span>
                            <span className={cn("scoreboard-number text-4xl font-black leading-none sm:text-5xl", match.status === "Upcoming" ? "opacity-20" : "text-white")}>
                              {match.status === "Upcoming" ? "00" : (match.scoreB ?? 0).toString().padStart(2, "0")}
                            </span>
                          </div>
                          <span className="text-[10px] font-black uppercase text-accent tracking-[0.4em] sport-heading">{match.sport}</span>
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">{getMatchPeriod(match)}</span>
                        </div>

                        {/* Team B */}
                        <div className="group/team order-1 flex min-w-0 flex-1 basis-[calc(50%-0.75rem)] items-center justify-end gap-4 text-right">
                          <div className="min-w-0">
                            <span className="sport-heading block truncate text-2xl font-black uppercase tracking-wide text-white lg:text-3xl">{match.teamB}</span>
                          </div>
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl shadow-inner transition-transform group-hover/team:scale-110">
                            🥈
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center border-t border-white/10 bg-white/5 p-5 xl:border-l xl:border-t-0">
                      <button
                        type="button"
                        onClick={() => setSelectedMatchId((current) => current === match.id ? null : match.id)}
                        className="w-full rounded-xl bg-accent px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-accent-foreground shadow-xl shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95"
                      >
                        {selectedMatchId === match.id ? "Hide Match" : "View Match"}
                      </button>
                    </div>
                  </div>
                </Card>
                {selectedMatchId === match.id && (
                  <Card className="mt-4 border-2 p-5">
                    <div className="grid gap-4 md:grid-cols-4">
                      <DetailItem label="Date" value={match.date || "TBD"} />
                      <DetailItem label="Time" value={match.time || "TBD"} />
                      <DetailItem label="Venue" value={match.venue || "Venue TBD"} />
                      <DetailItem label="Status" value={match.status} />
                    </div>
                    <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
                      <p className="sport-heading text-lg font-black uppercase text-foreground">
                        {match.teamA} {match.scoreA ?? 0} - {match.scoreB ?? 0} {match.teamB}
                      </p>
                      <p className="mt-1 text-xs font-black uppercase tracking-widest text-accent">
                        {match.sport} / {getMatchPeriod(match)}
                      </p>
                    </div>
                    {match.announcements && match.announcements.length > 0 && (
                      <div className="mt-5 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Match Updates</p>
                        {match.announcements.map((announcement, index) => (
                          <p key={`${match.id}-announcement-${index}`} className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
                            {announcement}
                          </p>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </motion.div>
            )) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-32 rounded-[2.5rem] bg-card/30 border-2 border-dashed border-white/10 text-center"
              >
                <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center mb-8">
                  <CalendarIcon size={48} className="text-slate-600" />
                </div>
                <h3 className="text-3xl font-black sport-heading text-white uppercase">No Matches Published</h3>
                <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500">
                  Once the organizing team adds fixtures, they will appear here with date, time, venue, teams, and scores.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Global Live Feed (sticky right column) ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
              </span>
              <h2 className="text-xl font-black tracking-wider uppercase sport-heading">Volunteer Updates</h2>
            </div>

            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {liveFeeds.length > 0 ? liveFeeds.map((feed) => (
                  <motion.div
                    key={feed.id}
                    initial={{ opacity: 0, y: -16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="bg-card border-border p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Radio size={12} className="text-accent shrink-0 mt-0.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-accent leading-tight">
                            {feed.matchTitle}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap shrink-0">
                          {formatDistanceToNow(feed.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-200 leading-relaxed">{feed.content}</p>
                      {feed.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-white/10">
                          <img src={feed.imageUrl} alt="Live feed" className="w-full h-auto object-cover" />
                        </div>
                      )}
                    </Card>
                  </motion.div>
                )) : (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                    <Radio size={32} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      No updates posted yet
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-600">Short match notes and photos from volunteers will appear here.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-black uppercase text-foreground">{value}</p>
    </div>
  );
}
