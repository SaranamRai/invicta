"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, MapPin, Clock, ChevronLeft, ChevronRight, Radio, Download, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchData, LiveFeedPost } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { getMatchClockText, getMatchPeriod } from "@/lib/match-clock";
import { getPublicFixtures, getPublicLiveFeeds, getPublicLiveScores, getPublicTournaments, mapMongoFixture, TournamentPayload } from "@/lib/api";
import { useMatchTracker } from "@/components/layout/match-tracker";

const tabs = ["All Matches", "Live", "Paused", "Upcoming", "Finished"];

function getWinnerSide(match: MatchData): "A" | "B" | "" {
  if (match.status !== "Finished") return "";
  if (match.winner === "A" || match.winner === "B") return match.winner;
  if (match.scoreA === match.scoreB) return "";
  return match.scoreA > match.scoreB ? "A" : "B";
}

const getDateKey = (value?: string | Date | null): string => {
  if (!value) return "";

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : getDateKey(parsed);
};

export default function MatchesPage() {
  const { setTrackedMatch } = useMatchTracker();
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [matchesData, setMatchesData] = useState<MatchData[]>([]);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [liveFeeds, setLiveFeeds] = useState<LiveFeedPost[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [downloadTournamentId, setDownloadTournamentId] = useState("");
  const [downloadSport, setDownloadSport] = useState("All Sports");
  const [downloadCategory, setDownloadCategory] = useState<"Both" | "Male" | "Female">("Both");
  const [downloadFixtures, setDownloadFixtures] = useState<MatchData[]>([]);
  const [isLoadingDownloadFixtures, setIsLoadingDownloadFixtures] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  React.useEffect(() => {
    let isMounted = true;

    async function loadMatches() {
      const [fixtures, liveScores, feeds, publicTournaments] = await Promise.all([
        getPublicFixtures({
          tournamentId: selectedTournamentId || undefined,
          category: selectedCategory === "All" ? undefined : selectedCategory,
        }),
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
    const interval = window.setInterval(() => {
      if (!document.hidden) void loadMatches();
    }, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [selectedTournamentId, selectedCategory]);

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!isDownloadOpen) return;

    let isMounted = true;
    setDownloadFixtures([]);
    setIsLoadingDownloadFixtures(true);
    getPublicFixtures({ tournamentId: downloadTournamentId || undefined })
      .then((fixtures) => {
        if (isMounted) setDownloadFixtures(fixtures.map((fixture) => mapMongoFixture(fixture) as MatchData));
      })
      .catch(() => {
        if (isMounted) setDownloadFixtures([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDownloadFixtures(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isDownloadOpen, downloadTournamentId]);

  const tournamentFilteredMatches = selectedTournamentId
    ? matchesData.filter((match) => match.tournamentId === selectedTournamentId)
    : matchesData;

  const matchCountByDate = React.useMemo(() => {
    return tournamentFilteredMatches.reduce<Record<string, number>>((counts, match) => {
      const dateKey = getDateKey(match.date);
      if (!dateKey) return counts;
      counts[dateKey] = (counts[dateKey] || 0) + 1;
      return counts;
    }, {});
  }, [tournamentFilteredMatches]);

  const sportOptions = React.useMemo(() => {
    const sports = tournamentFilteredMatches
      .map((match) => match.sport)
      .filter((sport): sport is string => Boolean(sport));
    return ["All Sports", ...Array.from(new Set(sports)).sort((a, b) => a.localeCompare(b))];
  }, [tournamentFilteredMatches]);

  const filteredMatches = tournamentFilteredMatches.filter(match => {
    if (selectedSport !== "All Sports" && match.sport !== selectedSport) return false;
    if (selectedCategory !== "All" && match.category !== selectedCategory) return false;
    if (isDateFilterActive && getDateKey(match.date) !== getDateKey(selectedDate)) return false;
    if (activeTab === "All Matches") return true;
    return match.status === activeTab;
  }).sort((a, b) => {
    if (activeTab !== "Upcoming") return 0;
    const aDate = getDateKey(a.date);
    const bDate = getDateKey(b.date);
    if (!aDate) return bDate ? 1 : 0;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  });

  const selectedMatch = selectedMatchId
    ? matchesData.find((match) => match.id === selectedMatchId) || null
    : null;

  const selectedMatchFeeds = selectedMatchId
    ? liveFeeds.filter((feed) => feed.matchId === selectedMatchId)
    : [];

  const downloadSportOptions = [
    "All Sports",
    ...Array.from(new Set(downloadFixtures.map((match) => match.sport).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
  ];

  const filteredDownloadFixtures = downloadFixtures
    .filter((match) => downloadSport === "All Sports" || match.sport === downloadSport)
    .filter((match) => downloadCategory === "Both" || match.category === downloadCategory)
    .sort((a, b) => (getDateKey(a.date) || "9999-99-99").localeCompare(getDateKey(b.date) || "9999-99-99"));

  const downloadFixtureCsv = () => {
    const selectedTournament = tournaments.find((tournament) => tournament._id === downloadTournamentId);
    const rows = [
      ["Tournament", "Sport", "Category", "Date", "Time", "Match", "Team A", "Team B", "Venue", "Status"],
      ...filteredDownloadFixtures.map((match) => [
        match.tournamentName || selectedTournament?.name || "",
        match.sport || "",
        match.category || "",
        formatMatchDate(match.date),
        match.time || "TBD",
        `${match.teamA} vs ${match.teamB}`,
        match.teamA,
        match.teamB,
        match.venue || "Venue TBD",
        match.status,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n")}`;
    const fileUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `invicta-fixtures-${(selectedTournament?.name || "tournament").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(fileUrl);
    setIsDownloadOpen(false);
  };

  const formatMonth = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

  const formatFullDate = (date: Date) =>
    date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const formatMatchDate = (value?: string | null) => {
    const dateKey = getDateKey(value);
    if (!dateKey) return value || "Date TBD";
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

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
    <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-6 xl:space-y-7">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter sport-heading text-primary sm:text-3xl xl:text-4xl">Matches & Live Scores</h1>
          <p className="mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-muted-foreground sm:text-sm">
            See every published fixture, follow live scores during a match, and read updates posted by volunteers. {activeTab === "Upcoming" ? "Upcoming matches are ordered by date." : `Selected date: ${formatFullDate(selectedDate)}.`}
          </p>
        </div>

        <div className="relative flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const now = new Date(); setCurrentDate(now); setSelectedDate(now); setIsDateFilterActive(true); }}
              className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:bg-white/10"
            >
              Today
            </button>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
              <button
                onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
              >
                <ChevronLeft size={20} />
              </button>

              <div
                className="group flex cursor-pointer items-center gap-2 px-2 py-1"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              >
                <CalendarIcon size={18} className="text-accent group-hover:scale-110 transition-transform" />
                <span className="min-w-[110px] text-center text-xs font-black tracking-wide transition-colors group-hover:text-accent sm:text-sm">
                  {formatMonth(currentDate)}
                </span>
              </div>

              <button
                onClick={() => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
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
                className="absolute right-0 top-16 z-50 w-[320px] rounded-3xl border border-white/10 bg-[#020617] p-5 shadow-[0_30px_70px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
              >
                <div className="space-y-5">
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
                      const calendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
                      const dateKey = getDateKey(calendarDate);
                      const matchCount = matchCountByDate[dateKey] || 0;
                      const hasMatches = matchCount > 0;
                      const isSelected = getDateKey(selectedDate) === dateKey;
                      const isToday = getDateKey(new Date()) === dateKey;
                      return (
                        <button
                          key={dayNumber}
                          onClick={() => { const d = new Date(currentDate); d.setDate(dayNumber); setSelectedDate(d); setIsDateFilterActive(true); setIsCalendarOpen(false); }}
                          title={hasMatches ? `${matchCount} scheduled match${matchCount === 1 ? "" : "es"}` : undefined}
                          aria-label={`${formatFullDate(calendarDate)}${hasMatches ? `, ${matchCount} scheduled match${matchCount === 1 ? "" : "es"}` : ""}`}
                          className={cn(
                            "h-10 w-10 rounded-xl text-xs font-black transition-all flex items-center justify-center relative group",
                            isSelected ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20" :
                            hasMatches ? "border border-accent/50 bg-accent/15 text-accent shadow-sm shadow-accent/10 hover:bg-accent/25" :
                            isToday ? "bg-accent/10 text-accent border border-accent/20" :
                            "hover:bg-white/10 text-slate-400"
                          )}
                        >
                          {dayNumber}
                          {hasMatches && (
                            <span
                              className={cn(
                                "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black leading-none shadow",
                                isSelected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                              )}
                            >
                              {matchCount}
                            </span>
                          )}
                          {isToday && !isSelected && !hasMatches && <div className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />}
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

      <section className="rounded-2xl border border-border bg-card/70 p-3 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Tournament</p>
          <h2 className="mt-0.5 text-base font-black sport-heading text-foreground sm:text-lg">Select Tournament</h2>
        </div>
        <select
          value={selectedTournamentId}
          onChange={(event) => {
            setSelectedTournamentId(event.target.value);
            setSelectedSport("All Sports");
            setSelectedMatchId(null);
          }}
          className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-black text-foreground outline-none transition-colors focus:border-accent sm:mt-0 sm:max-w-sm"
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
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] 2xl:flex 2xl:flex-wrap 2xl:items-end 2xl:justify-between">
        <div className="col-span-full flex w-full max-w-full flex-wrap gap-1 rounded-xl bg-secondary/50 p-1 sm:w-fit sm:gap-1 xl:col-span-3 2xl:col-span-1 2xl:w-fit">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-lg px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.1em] transition-all sm:px-3 sm:text-[10px] sm:tracking-[0.14em] xl:px-4",
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-primary hover:bg-white/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <label className="flex w-full min-w-0 flex-col gap-2 sm:max-w-none 2xl:w-64 2xl:max-w-64">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Sport</span>
          <select
            value={selectedSport}
            onChange={(event) => {
              setSelectedSport(event.target.value);
              setSelectedMatchId(null);
            }}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-black text-foreground outline-none transition-colors focus:border-accent"
          >
            {sportOptions.map((sport) => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
        </label>
        <label className="flex w-full min-w-0 flex-col gap-2 sm:max-w-none 2xl:w-64 2xl:max-w-64">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Category</span>
          <select
            value={selectedCategory}
            onChange={(event) => { setSelectedCategory(event.target.value); setSelectedMatchId(null); }}
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-black text-foreground outline-none transition-colors focus:border-accent"
          >
            <option value="All">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Mixed">Mixed</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setDownloadTournamentId(selectedTournamentId);
            setDownloadSport("All Sports");
            setDownloadCategory("Both");
            setIsDownloadOpen(true);
          }}
          className="col-span-full inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-black uppercase tracking-wider text-accent-foreground shadow-md transition-colors hover:brightness-105 xl:col-span-1 xl:justify-self-end xl:w-auto 2xl:ml-auto"
        >
          <Download size={15} />
          Download Fixtures
        </button>
      </div>

      {/* Two-column layout: Matches (left) + Live Feed (right) */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(260px,0.9fr)] xl:gap-8">

        {/* ── Match List ── */}
        <div className="min-w-0 space-y-4 xl:col-span-1">
          <div className="matches-scroll-box dashboard-scroll-box flex flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-secondary/20 p-2 sm:gap-4 sm:p-3">
          <AnimatePresence mode="popLayout">
            {filteredMatches.length > 0 ? filteredMatches.map((match, i) => {
              const winnerSide = getWinnerSide(match);
              return (
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
                  <div className="grid grid-cols-1 xl:grid-cols-[156px_minmax(0,1fr)_112px]">
                    {/* Status & Info */}
                    <div className={cn(
                      "flex flex-col justify-center border-b p-3 sm:p-4 xl:border-b-0 xl:border-r",
                      match.status === "Live" ? "bg-white/5 border-white/10" : "bg-secondary/30 border-border"
                    )}>
                      <div className="space-y-3">
                        <div className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest",
                          match.status === "Live" ? "bg-accent/20 text-accent" :
                          match.status === "Paused" ? "bg-amber-500/10 text-amber-400" :
                          match.status === "Upcoming" ? "bg-blue-500/10 text-blue-500" :
                          "bg-slate-500/10 text-slate-500"
                        )}>
                          {match.status === "Live" && <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
                          {match.status === "Live" ? "ON AIR" : match.status}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide opacity-75">
                            <CalendarIcon size={13} className="shrink-0 text-accent" />
                            {formatMatchDate(match.date)}
                          </div>
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
                    <div className="min-w-0 p-3 sm:p-4 xl:p-5">
                      <div className="flex min-w-0 flex-wrap items-center justify-center gap-3">
                        {/* Team A */}
                        <div className="order-1 flex min-w-0 flex-1 basis-[calc(50%-0.75rem)] items-center justify-center gap-2 text-center">
                          <span className="sport-heading min-w-0 break-words text-base font-black uppercase tracking-wide text-white sm:text-xl lg:text-2xl">{match.teamA}</span>
                          {winnerSide && <span aria-label={winnerSide === "A" ? "Winning team" : "Losing team"} className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black", winnerSide === "A" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>{winnerSide === "A" ? "W" : "L"}</span>}
                        </div>

                        {/* Score */}
                        <div className="order-2 flex w-full shrink-0 flex-col items-center gap-2">
                          <div className={cn(
                            "flex items-center gap-3 rounded-xl border px-4 py-2.5 shadow-lg transition-all",
                            match.status === "Live" || match.status === "Paused" ? "bg-black/60 border-accent/40" : "bg-secondary border-border"
                          )}>
                            <span className={cn("scoreboard-number text-3xl font-black leading-none sm:text-4xl", match.status === "Upcoming" ? "opacity-20" : "text-white")}>
                              {match.status === "Upcoming" ? "00" : (match.scoreA ?? 0).toString().padStart(2, "0")}
                            </span>
                            <span className="text-2xl font-black italic text-accent opacity-50">:</span>
                            <span className={cn("scoreboard-number text-3xl font-black leading-none sm:text-4xl", match.status === "Upcoming" ? "opacity-20" : "text-white")}>
                              {match.status === "Upcoming" ? "00" : (match.scoreB ?? 0).toString().padStart(2, "0")}
                            </span>
                          </div>
                          <span className="text-[9px] font-black uppercase text-accent tracking-[0.25em] sport-heading">{match.sport} · {match.category || "Unclassified"}</span>
                        </div>

                        {/* Team B */}
                        <div className="order-1 flex min-w-0 flex-1 basis-[calc(50%-0.75rem)] items-center justify-center gap-2 text-center">
                          {winnerSide && <span aria-label={winnerSide === "B" ? "Winning team" : "Losing team"} className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black", winnerSide === "B" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>{winnerSide === "B" ? "W" : "L"}</span>}
                          <span className="sport-heading min-w-0 break-words text-base font-black uppercase tracking-wide text-white sm:text-xl lg:text-2xl">{match.teamB}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center border-t border-white/10 bg-white/5 p-3 xl:border-l xl:border-t-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedMatchId === match.id) {
                            setSelectedMatchId(null);
                            setTrackedMatch(null);
                          } else {
                            setSelectedMatchId(match.id);
                            setTrackedMatch(match);
                          }
                        }}
                        className="w-full rounded-lg bg-accent px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-accent-foreground shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95"
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
                    {match.disciplinaryEvents && match.disciplinaryEvents.length > 0 && (
                      <div className="mt-5 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Player Cards</p>
                        {match.disciplinaryEvents.map((card) => (
                          <div key={card.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span aria-label={card.cardType} className={cn("h-4 w-3 shrink-0 rounded-sm", card.cardType === "Yellow Card" ? "bg-yellow-400" : "bg-red-500")} />
                              <div className="min-w-0">
                                <p className="break-words text-sm font-black uppercase text-foreground">{card.playerName}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{card.teamName} · {card.cardType}</p>
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] font-black text-muted-foreground">{card.matchTime}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </motion.div>
              );
            }) : (
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
        </div>

        {/* ── Global Live Feed (sticky right column) ── */}
        <div className="min-w-0 xl:col-span-1">
          <div className="sticky top-8 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
              </span>
              <h2 className="text-xl font-black tracking-wider uppercase sport-heading">Volunteer Updates</h2>
            </div>
            {selectedMatch && (
              <div className="rounded-2xl border border-border bg-card px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Selected Match</p>
                <p className="mt-1 text-sm font-black uppercase text-foreground">{selectedMatch.teamA} vs {selectedMatch.teamB}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-accent">{selectedMatch.sport}</p>
              </div>
            )}

            <div className="dashboard-scroll-box space-y-4 overflow-y-auto overscroll-contain pr-1">
              <AnimatePresence initial={false}>
                {!selectedMatchId ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                    <Radio size={32} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Select a match
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-600">Open a match to see only its volunteer updates.</p>
                  </div>
                ) : selectedMatchFeeds.length > 0 ? selectedMatchFeeds.map((feed) => (
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
                      No updates for this match
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-600">Volunteer notes and photos for the opened match will appear here.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

      {isDownloadOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsDownloadOpen(false);
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="download-fixtures-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="download-fixtures-title" className="text-xl font-black text-foreground">Download Fixtures</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose which fixtures to include in the CSV.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDownloadOpen(false)}
                aria-label="Close download options"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Tournament</span>
                <select
                  value={downloadTournamentId}
                  onChange={(event) => {
                    setDownloadTournamentId(event.target.value);
                    setDownloadSport("All Sports");
                  }}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-accent"
                >
                  <option value="">All Tournaments</option>
                  {tournaments.map((tournament) => (
                    <option key={tournament._id} value={tournament._id}>{tournament.name}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Sport</span>
                <select
                  value={downloadSport}
                  onChange={(event) => setDownloadSport(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-accent"
                >
                  {downloadSportOptions.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Category</span>
                <select
                  value={downloadCategory}
                  onChange={(event) => setDownloadCategory(event.target.value as typeof downloadCategory)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-accent"
                >
                  <option value="Both">Both (all categories)</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </label>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              {isLoadingDownloadFixtures ? "Loading fixtures…" : `${filteredDownloadFixtures.length} fixture${filteredDownloadFixtures.length === 1 ? "" : "s"} selected`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDownloadOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={downloadFixtureCsv}
                disabled={isLoadingDownloadFixtures || filteredDownloadFixtures.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-black uppercase tracking-wide text-accent-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={14} />
                Download CSV
              </button>
            </div>
          </motion.div>
        </div>
      )}
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
