/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { Calendar, Clock, MapPin, Trophy, Edit3, X, Save, StopCircle, CheckCircle2, Filter, ListChecks, Timer, UsersRound } from "lucide-react";
import { Fixture } from "@/lib/fixture-generator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { sports } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface FixtureViewerProps {
  fixtures: Fixture[];
  teams: Record<string, string>;
  onDeleteFixture?: (fixtureId: string) => void;
  onUpdateFixture?: (fixture: Fixture) => void;
}

export function FixtureViewer({
  fixtures,
  teams,
  onDeleteFixture,
  onUpdateFixture,
}: FixtureViewerProps) {
  const [filterTournament, setFilterTournament] = useState<string>("");
  const [filterSport, setFilterSport] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Edit Modal State
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [status, setStatus] = useState<"scheduled" | "live" | "completed">("scheduled");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [venue, setVenue] = useState<string>("");

  const filteredFixtures = fixtures.filter((fixture) => {
    if (filterTournament && (fixture.tournamentId || fixture.tournamentName || "no-tournament") !== filterTournament) return false;
    if (filterSport && (fixture.sportId || fixture.sportName || fixture.sport) !== filterSport) return false;
    if (filterDate && fixture.date !== filterDate) return false;
    if (filterCategory && (fixture.category || "Male") !== filterCategory) return false;
    if (filterStatus && fixture.status !== filterStatus) return false;
    return true;
  });

  const uniqueDates = [...new Set(fixtures.map((f) => f.date).filter(Boolean))].sort();
  const tournamentOptions = Array.from(
    new Map(fixtures.map((fixture) => [
      fixture.tournamentId || fixture.tournamentName || "no-tournament",
      fixture.tournamentName || "No tournament recorded",
    ])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));
  const sportOptions = Array.from(
    new Map(fixtures.map((fixture) => [
      fixture.sportId || fixture.sportName || fixture.sport,
      fixture.sportName || sports.find((sport) => sport.id === fixture.sport)?.name || fixture.sport || "Sport",
    ])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));
  const venueCount = new Set(filteredFixtures.map((fixture) => fixture.venue).filter(Boolean)).size;
  const liveCount = filteredFixtures.filter((fixture) => fixture.status === "live").length;
  const completedCount = filteredFixtures.filter((fixture) => fixture.status === "completed").length;
  const upcomingCount = filteredFixtures.filter((fixture) => fixture.status === "scheduled").length;
  const assignedVolunteerCount = filteredFixtures.filter((fixture) => Boolean(fixture.assignedVolunteer)).length;

  const groupedByDate = filteredFixtures.reduce(
    (acc, fixture) => {
      if (!acc[fixture.date]) {
        acc[fixture.date] = [];
      }
      acc[fixture.date].push(fixture);
      return acc;
    },
    {} as Record<string, Fixture[]>
  );

  const openEditModal = (fixture: Fixture) => {
    setEditingFixture(fixture);
    setScoreA(fixture.scoreA || 0);
    setScoreB(fixture.scoreB || 0);
    setStatus(fixture.status);
    setDate(fixture.date);
    setTime(fixture.time);
    setEndTime(fixture.endTime || "");
    setVenue(fixture.venue);
  };

  // One-click end match: marks as completed with current time as endTime
  const handleEndMatch = (fixture: Fixture) => {
    if (!onUpdateFixture) return;
    if (!confirm(`End match "${teams[fixture.teamA] || fixture.teamA} vs ${teams[fixture.teamB] || fixture.teamB}"? This will mark it as Completed.`)) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    onUpdateFixture({
      ...fixture,
      status: "completed",
      endTime: hhmm,
      endedAt: now.toISOString(),
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFixture || !onUpdateFixture) return;

    const updated: Fixture = {
      ...editingFixture,
      status,
      scoreA: status !== "scheduled" ? scoreA : undefined,
      scoreB: status !== "scheduled" ? scoreB : undefined,
      date,
      time,
      endTime: endTime || undefined,
      // auto-stamp endedAt when admin marks as completed for the first time
      endedAt:
        status === "completed" && !editingFixture.endedAt
          ? new Date().toISOString()
          : editingFixture.endedAt,
      venue,
    };

    onUpdateFixture(updated);
    setEditingFixture(null);
    alert("Match updated and scores recorded successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black sport-heading text-white">
            Tournament Match Schedule
          </h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-400">
            Filter fixtures by tournament, sport, category, date, and match status. Each card shows the timing, teams, venue, score, match duration, rest gap, and assignment details admins need during operations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFilterTournament("");
            setFilterSport("");
            setFilterDate("");
            setFilterCategory("");
            setFilterStatus("");
          }}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 px-4 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-accent hover:text-accent"
        >
          Clear Filters
        </button>
      </div>

      {/* Filters */}
      <Card className="border-white/5 bg-slate-900/60 text-white">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
            <Filter size={14} />
            Schedule Filters
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect label="Tournament" value={filterTournament} onChange={setFilterTournament}>
              <option value="" className="bg-slate-950 text-white">All Tournaments</option>
              {tournamentOptions.map(([id, name]) => (
                <option key={id} value={id} className="bg-slate-950 text-white">{name}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Sport" value={filterSport} onChange={setFilterSport}>
              <option value="" className="bg-slate-950 text-white">All Sports</option>
              {sportOptions.map(([id, name]) => (
                <option key={id} value={id} className="bg-slate-950 text-white">{name}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Category" value={filterCategory} onChange={setFilterCategory}>
              <option value="" className="bg-slate-950 text-white">All Categories</option>
              <option value="Male" className="bg-slate-950 text-white">Male</option>
              <option value="Female" className="bg-slate-950 text-white">Female</option>
            </FilterSelect>
            <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus}>
              <option value="" className="bg-slate-950 text-white">All Statuses</option>
              <option value="scheduled" className="bg-slate-950 text-white">Scheduled</option>
              <option value="live" className="bg-slate-950 text-white">Live</option>
              <option value="completed" className="bg-slate-950 text-white">Completed</option>
            </FilterSelect>
            <FilterSelect label="Date" value={filterDate} onChange={setFilterDate}>
              <option value="" className="bg-slate-950 text-white">All Dates</option>
              {uniqueDates.map((date) => (
                <option key={date} value={date} className="bg-slate-950 text-white">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </option>
              ))}
            </FilterSelect>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ScheduleStat icon={ListChecks} label="Shown Matches" value={filteredFixtures.length} />
        <ScheduleStat icon={Clock} label="Scheduled" value={upcomingCount} />
        <ScheduleStat icon={Timer} label="Live" value={liveCount} tone="live" />
        <ScheduleStat icon={CheckCircle2} label="Completed" value={completedCount} tone="done" />
        <ScheduleStat icon={MapPin} label="Venues Used" value={venueCount} />
        <ScheduleStat icon={UsersRound} label="Assigned" value={`${assignedVolunteerCount}/${filteredFixtures.length}`} />
      </div>

      <div className="hidden">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
            Filter by Sport
          </label>
          <select
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="" className="bg-slate-950 text-white">All Sports</option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id} className="bg-slate-950 text-white">
                {sport.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
            Filter by Date
          </label>
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white focus:outline-none focus:border-accent cursor-pointer"
          >
            <option value="" className="bg-slate-950 text-white">All Dates</option>
            {uniqueDates.map((date) => (
              <option key={date} value={date} className="bg-slate-950 text-white">
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Match Update Modal */}
      {editingFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <Card className="w-full max-w-lg bg-slate-900 border border-accent/40 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Edit3 size={18} className="text-accent" />
                Update Match details
              </CardTitle>
              <button 
                onClick={() => setEditingFixture(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* Visual Teams matchup */}
                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 text-center">
                  <span className="text-[9px] font-black uppercase text-accent tracking-[0.2em]">Match Matchup</span>
                  <div className="flex justify-between items-center mt-2 text-white font-bold text-sm">
                    <span className="truncate max-w-[40%]">{teams[editingFixture.teamA] || editingFixture.teamA}</span>
                    <span className="text-accent font-black italic">VS</span>
                    <span className="truncate max-w-[40%]">{teams[editingFixture.teamB] || editingFixture.teamB}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">Match Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="scheduled" className="bg-slate-950 text-white">Scheduled</option>
                      <option value="live" className="bg-slate-950 text-red-400">Live</option>
                      <option value="completed" className="bg-slate-950 text-green-400">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">Venue</label>
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">Start Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/80 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                      End Time <span className="text-slate-500 normal-case tracking-normal font-normal text-[9px]">(optional — leave blank if not ended yet)</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="flex-1 rounded-xl bg-slate-950/80 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          setEndTime(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
                          setStatus("completed");
                        }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-wider hover:bg-red-500/30 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <StopCircle size={13} /> End Now
                      </button>
                    </div>
                  </div>
                </div>

                {/* Score Input block (Only shown if Live or Completed) */}
                {status !== "scheduled" && (
                  <div className="p-4 bg-slate-950/60 border border-white/5 rounded-xl space-y-3">
                    <span className="text-[10px] font-black uppercase text-accent tracking-[0.2em] block">Match Scores</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 mb-1 truncate">{teams[editingFixture.teamA] || editingFixture.teamA} Score</label>
                        <input
                          type="number"
                          min="0"
                          value={scoreA}
                          onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-white text-center text-lg font-black"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 mb-1 truncate">{teams[editingFixture.teamB] || editingFixture.teamB} Score</label>
                        <input
                          type="number"
                          min="0"
                          value={scoreB}
                          onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-white text-center text-lg font-black"
                        />
                      </div>
                    </div>
                    {status === "completed" && (
                      <div className="flex gap-2 items-center text-[10px] text-green-400 font-bold bg-green-500/5 border border-green-500/10 p-2 rounded-lg justify-center">
                        <Trophy size={12} />
                        <span>
                          {scoreA > scoreB ? `${teams[editingFixture.teamA] || editingFixture.teamA} Wins!` :
                           scoreB > scoreA ? `${teams[editingFixture.teamB] || editingFixture.teamB} Wins!` :
                           "Match is a Draw!"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingFixture(null)}
                    className="px-5 py-2.5 rounded-lg bg-slate-800 text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg bg-accent text-accent-foreground font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 flex items-center gap-1 shadow-lg shadow-accent/15"
                  >
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fixtures by Date */}
      <div className="space-y-8">
        {Object.entries(groupedByDate).length === 0 ? (
          <Card className="bg-slate-900/60 border-dashed border-white/10 text-white animate-fadeIn">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy size={48} className="text-slate-600 mb-4" />
              <p className="text-slate-400 font-semibold">No fixtures generated</p>
              <p className="text-slate-500 text-sm">
                Generate fixtures from the fixture generator
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedByDate).map(([date, dateFixtures]) => (
            <div key={date} className="space-y-3 animate-fadeIn">
              <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
                <Calendar className="text-accent" size={20} />
                <h3 className="text-lg font-bold text-white">
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <span className="ml-auto text-sm text-slate-400">
                  {dateFixtures.length} match{dateFixtures.length !== 1 ? "es" : ""}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dateFixtures.map((fixture) => (
                  <Card key={fixture.id} className="bg-slate-900/60 border-white/5 text-white hover:border-accent transition-colors">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Match Info */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                            {fixture.sportName || sports.find((s) => s.id === fixture.sport)?.name || fixture.sport}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold px-2 py-1 rounded",
                              fixture.status === "scheduled"
                                ? "bg-blue-500/20 text-blue-400"
                                : fixture.status === "live"
                                  ? "bg-red-500/20 text-red-400 animate-pulse"
                                  : "bg-green-500/20 text-green-400"
                            )}
                          >
                            {fixture.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <InfoPill label="Tournament" value={fixture.tournamentName || "Not recorded"} />
                          <InfoPill label="Category" value={fixture.category || "Male"} />
                        </div>

                        {/* Teams & Scores */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                            <span className="text-sm font-bold text-white truncate max-w-[70%]">
                              {teams[fixture.teamA] || fixture.teamA}
                            </span>
                            {fixture.status !== "scheduled" && (
                              <span className="font-black text-white scoreboard-number text-sm">{fixture.scoreA}</span>
                            )}
                          </div>
                          
                          <div className="text-center text-slate-400 font-bold text-[10px] tracking-widest uppercase">VS</div>
                          
                          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                            <span className="text-sm font-bold text-white truncate max-w-[70%]">
                              {teams[fixture.teamB] || fixture.teamB}
                            </span>
                            {fixture.status !== "scheduled" && (
                              <span className="font-black text-white scoreboard-number text-sm">{fixture.scoreB}</span>
                            )}
                          </div>
                        </div>

                        {/* Winner Banner if completed */}
                        {fixture.status === "completed" && fixture.scoreA !== undefined && fixture.scoreB !== undefined && (
                          <div className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 uppercase tracking-wider">
                            <Trophy size={11} />
                            <span>
                              Winner: {
                                fixture.scoreA > fixture.scoreB ? (teams[fixture.teamA] || fixture.teamA) :
                                fixture.scoreB > fixture.scoreA ? (teams[fixture.teamB] || fixture.teamB) : "Draw"
                              }
                            </span>
                          </div>
                        )}

                        {/* Time & Venue */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock size={14} />
                            <span className="text-xs">
                              {fixture.time}
                              {fixture.endTime && (
                                <span className="ml-1 text-slate-500">→ {fixture.endTime}</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock size={14} />
                            <span className="text-xs">
                              Full time {Math.round((fixture.fullMatchSeconds || 0) / 60) || 90} min
                              <span className="ml-1 text-slate-500">/ Gap {fixture.matchGapMinutes || 0} min</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <MapPin size={14} />
                            <span className="text-xs">{fixture.venue}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <UsersRound size={14} />
                            <span className="text-xs">
                              {fixture.assignedVolunteer ? `Volunteer assigned (${fixture.assignedVolunteer})` : "No volunteer assigned"}
                            </span>
                          </div>
                          {fixture.endedAt && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={13} className="text-green-500" />
                              <span className="text-[10px] text-green-400 font-bold">
                                Ended {new Date(fixture.endedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons inside card */}
                        <div className="flex gap-2 pt-2 border-t border-white/5 flex-wrap">
                          {/* One-click End Match — only on live fixtures */}
                          {fixture.status === "live" && onUpdateFixture && (
                            <button
                              onClick={() => handleEndMatch(fixture)}
                              className="flex-1 flex items-center justify-center gap-1 text-xs font-black px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all cursor-pointer uppercase tracking-wider"
                            >
                              <StopCircle size={13} /> End Match
                            </button>
                          )}
                          {onUpdateFixture && (
                            <button
                              onClick={() => openEditModal(fixture)}
                              className="flex-1 flex items-center justify-center gap-1 text-xs font-bold px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white hover:bg-slate-700 transition-all cursor-pointer"
                            >
                              <Edit3 size={13} /> Update
                            </button>
                          )}
                          {onDeleteFixture && (
                            <button
                              onClick={() => {
                                if (confirm("Are you sure you want to remove this match?")) {
                                  onDeleteFixture(fixture.id);
                                }
                              }}
                              className="text-xs font-bold px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black uppercase tracking-widest text-white outline-none transition-colors focus:border-accent"
      >
        {children}
      </select>
    </label>
  );
}

function ScheduleStat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: "default" | "live" | "done";
}) {
  const toneClass = tone === "live"
    ? "border-red-500/20 bg-red-500/10 text-red-300"
    : tone === "done"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : "border-white/5 bg-slate-900/60 text-white";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <Icon size={18} className="text-accent" />
      <p className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black scoreboard-number">{value}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 truncate text-[11px] font-black uppercase tracking-wide text-slate-300">{value}</p>
    </div>
  );
}
