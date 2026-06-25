/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import {
  Users, Trophy, Calendar, Activity,
  Bell, Play, CheckCircle, Clock, Plus, Zap,
  ArrowRight, Sparkles, BarChart2, ShieldAlert,
  MapPin, Radio, Timer
} from "lucide-react";
import { Team, Fixture } from "@/lib/fixture-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sports } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { getAdminRoleAccounts, RoleAccountPayload } from "@/lib/api";

interface AdminOverviewProps {
  teams: Team[];
  fixtures: Fixture[];
  setActiveTab: (tab: "dashboard" | "teams" | "generate-fixtures" | "schedule" | "tournaments" | "leaderboard" | "rules" | "users" | "approvals") => void;
  canManageSetup?: boolean;
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

function toDateString(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toDateInputValue(date: Date) {
  return toDateString(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function AdminOverview({
  teams,
  fixtures,
  setActiveTab,
  canManageSetup = false,
}: AdminOverviewProps) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(
    toDateInputValue(today)
  );
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [roleAccounts, setRoleAccounts] = useState<RoleAccountPayload[]>([]);
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState("Checking");
  const [pageLoadMs, setPageLoadMs] = useState<number | null>(null);

  // Calculate stats
  const totalTeams = teams.length;
  const totalPlayers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const totalSports = sports.length;

  const upcomingMatches = fixtures.filter(f => f.status === "scheduled");
  const ongoingMatches = fixtures.filter(f => f.status === "live");
  const completedMatches = fixtures.filter(f => f.status === "completed");
  const recentMatchHistory = [...fixtures]
    .filter((fixture) => fixture.status === "completed" || fixture.status === "live")
    .sort((a, b) => `${b.date || ""}${b.time || ""}`.localeCompare(`${a.date || ""}${a.time || ""}`))
    .slice(0, 6);
  const teamsBySport = teams.reduce((acc, team) => {
    const sportName = sports.find((sport) => sport.id === team.sport)?.name || team.sport || "Unassigned";
    acc[sportName] = (acc[sportName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const roleCounts = roleAccounts.reduce((acc, account) => {
    acc[account.role] = (acc[account.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalMatches = fixtures.length;
  const completionRate = totalMatches > 0 ? Math.round((completedMatches.length / totalMatches) * 100) : 0;

  // Generate activities and notifications dynamically based on teams and fixtures
  useEffect(() => {
    const actList: ActivityItem[] = [];
    const notifList: string[] = [];

    // Add recent activities based on teams
    teams.slice(-3).forEach(team => {
      actList.push({
        id: `act-team-${team.id}`,
        type: "team",
        message: `New team "${team.name}" was registered for ${sports.find(s => s.id === team.sport)?.name || team.sport}.`,
        timestamp: "Recently"
      });
    });

    // Add activities for fixtures
    if (fixtures.length > 0) {
      actList.push({
        id: "act-fixtures",
        type: "fixture",
        message: `Generated ${fixtures.length} fixtures for the tournament schedule.`,
        timestamp: "Tournament Setup"
      });
    } else {
      notifList.push("No fixtures have been published yet. Open Generate Fixtures to build the match schedule.");
    }

    // Check completed matches
    if (completedMatches.length > 0) {
      actList.push({
        id: "act-completed",
        type: "match",
        message: `${completedMatches.length} matches completed and scores recorded.`,
        timestamp: "Live Updates"
      });
    }

    setActivities(actList);
    setNotifications(notifList);
  }, [teams, fixtures, completedMatches.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadSystemHealth() {
      try {
        const accounts = await getAdminRoleAccounts();
        if (isMounted) setRoleAccounts(accounts);
      } catch {
        if (isMounted) setRoleAccounts([]);
      }

      const start = Date.now();
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const latency = Date.now() - start;
        if (!isMounted) return;
        setApiLatencyMs(latency);
        setApiStatus(response.ok ? "Online" : `HTTP ${response.status}`);
      } catch {
        if (!isMounted) return;
        setApiLatencyMs(null);
        setApiStatus("Offline");
      }

      if (typeof window !== "undefined") {
        const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        const loadTime = navigation ? Math.round(navigation.loadEventEnd - navigation.startTime) : Math.round(window.performance.now());
        if (isMounted && loadTime > 0) setPageLoadMs(loadTime);
      }
    }

    void loadSystemHealth();
    const interval = window.setInterval(loadSystemHealth, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  // Calendar dates generation
  const getDaysInMonth = () => {
    const days = [];
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    // Padding for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateString = toDateString(calendarYear, calendarMonth, i);
      days.push({
        dayNum: i,
        dateStr: dateString,
        hasMatches: fixtures.some(f => f.date === dateString)
      });
    }

    return days;
  };

  const calendarDays = getDaysInMonth();
  const selectedDateMatches = fixtures.filter(f => f.date === selectedDate);
  const calendarYears = Array.from({ length: 11 }, (_, index) => today.getFullYear() - 5 + index);
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index,
    label: new Date(2026, index, 1).toLocaleString("en-US", { month: "long" }),
  }));

  const handleSelectDate = (dateString: string) => {
    const parsedDate = parseDateInputValue(dateString);

    if (!parsedDate) return;

    setSelectedDate(dateString);
    setCalendarYear(parsedDate.getFullYear());
    setCalendarMonth(parsedDate.getMonth());
  };

  // Sports breakdown for stats graph
  const matchesPerSport = sports.map(sport => {
    const count = fixtures.filter(f => f.sport === sport.id).length;
    return { name: sport.name, count };
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Quick Action Overlay banner */}
      <div className="admin-hero-panel rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="admin-hero-accent flex items-center gap-2">
            <Sparkles size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em] sport-heading">Admin Overview</span>
          </div>
          <h2 className="text-xl font-black uppercase mt-1 text-white tracking-wide">Start here to run the event</h2>
          <p className="text-sm text-slate-300 max-w-xl mt-1">
            First review registered teams, then create fixtures, then use the schedule and standings pages to track match progress.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("teams")}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl bg-accent text-accent-foreground hover:scale-[1.02] active:scale-95 shadow-lg shadow-accent/15 transition-all flex items-center gap-2"
          >
            <Plus size={14} /> Add Team
          </button>
          <button
            onClick={() => setActiveTab("generate-fixtures")}
            className="px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl bg-white border border-white/20 text-slate-950 hover:bg-slate-100 transition-all flex items-center gap-2"
          >
            Generate Fixtures <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Teams", val: totalTeams, icon: Users, color: "text-amber-600 border-amber-200 bg-amber-50" },
          { label: "Total Players", val: totalPlayers, icon: Trophy, color: "text-emerald-600 border-emerald-200 bg-emerald-50" },
          { label: "Total Sports", val: totalSports, icon: Activity, color: "text-sky-600 border-sky-200 bg-sky-50" },
          { label: "Upcoming", val: upcomingMatches.length, icon: Clock, color: "text-blue-600 border-blue-200 bg-blue-50" },
          { label: "Ongoing", val: ongoingMatches.length, icon: Play, color: "text-rose-600 border-rose-200 bg-rose-50" },
          { label: "Completed", val: completedMatches.length, icon: CheckCircle, color: "text-green-600 border-green-200 bg-green-50" }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="bg-card border-border shadow-sm hover:border-slate-300 transition-all">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className={`p-2.5 rounded-xl border w-fit ${stat.color}`}>
                  <Icon size={20} />
                </div>
                <div className="mt-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">{stat.label}</span>
                  <span className="text-3xl font-black text-foreground block mt-1 scoreboard-number">{stat.val}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <Card className="bg-slate-900/60 border-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert size={18} className="text-accent" />
              System Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["admin", "supercoordinator", "coordinator", "volunteer"].map((role) => (
              <div key={role} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{role}</span>
                <span className="scoreboard-number text-xl font-black text-white">{roleCounts[role] || 0}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-accent-foreground"
            >
              Manage System Users
            </button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={18} className="text-accent" />
              Teams Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(teamsBySport).slice(0, 5).map(([sportName, count]) => (
              <div key={sportName} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2">
                <span className="truncate text-xs font-bold text-slate-300">{sportName}</span>
                <span className="text-sm font-black text-accent">{count}</span>
              </div>
            ))}
            {Object.keys(teamsBySport).length === 0 && <p className="py-8 text-center text-xs font-semibold text-slate-500">No teams recorded yet.</p>}
            <button
              type="button"
              onClick={() => setActiveTab("teams")}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white"
            >
              View Teams
            </button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-white/5 text-white xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Timer size={18} className="text-accent" />
              Website Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <PerformanceTile label="API Status" value={apiStatus} tone={apiStatus === "Online" ? "good" : "bad"} />
            <PerformanceTile label="API Latency" value={apiLatencyMs === null ? "N/A" : `${apiLatencyMs} ms`} tone={apiLatencyMs !== null && apiLatencyMs < 500 ? "good" : "warn"} />
            <PerformanceTile label="Page Load" value={pageLoadMs === null ? "N/A" : `${pageLoadMs} ms`} tone={pageLoadMs !== null && pageLoadMs < 2500 ? "good" : "warn"} />
          </CardContent>
        </Card>
      </div>

      {/* ====== LIVE MATCHES RIGHT NOW ====== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <h3 className="text-lg font-black uppercase tracking-widest text-foreground sport-heading">
              Matches Live Now
            </h3>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
              ongoingMatches.length > 0
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "bg-slate-100 border-slate-200 text-slate-500"
            )}>
              {ongoingMatches.length} match{ongoingMatches.length !== 1 ? "es" : ""} live
            </span>
          </div>
          <button
            onClick={() => setActiveTab("schedule" as any)}
            className="text-xs font-black uppercase tracking-widest text-slate-700 hover:text-accent transition-colors flex items-center gap-1 cursor-pointer"
          >
            Open Schedule <ArrowRight size={13} />
          </button>
        </div>

        {ongoingMatches.length === 0 ? (
          <Card className="bg-card border-dashed border-border text-foreground">
            <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <Radio size={26} className="text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">No live matches at the moment</p>
                <p className="text-xs text-slate-500 mt-1">
                  Set a fixture status to <span className="text-red-400 font-bold">Live</span> in the Schedule tab to see it here.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("schedule" as any)}
                className="admin-primary-button mt-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Go to Schedule <ArrowRight size={11} />
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ongoingMatches.map((match) => {
              const teamAName = teams.find(t => t.id === match.teamA)?.name || match.teamA;
              const teamBName = teams.find(t => t.id === match.teamB)?.name || match.teamB;
              const sportLabel = sports.find(s => s.id === match.sport)?.name || match.sport;
              const scoreA = match.scoreA ?? "-";
              const scoreB = match.scoreB ?? "-";
              return (
                <Card
                  key={match.id}
                  className="bg-slate-900/70 border border-red-500/30 text-white relative overflow-hidden hover:border-red-500/60 transition-all shadow-lg shadow-red-500/5"
                >
                  {/* Glowing top strip */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-red-400 to-red-600 animate-pulse" />

                  <CardContent className="pt-5 pb-4 px-5 space-y-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-accent border border-accent/30 bg-accent/10 px-2 py-0.5 rounded">
                        {sportLabel}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                        LIVE
                      </span>
                    </div>

                    {/* Scoreboard */}
                    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-950/70 border border-white/5">
                      <div className="flex-1 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 truncate">{teamAName}</p>
                        <p className="text-3xl font-black text-white scoreboard-number leading-tight mt-0.5">{scoreA}</p>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">VS</span>
                        <Timer size={12} className="text-slate-600" />
                      </div>
                      <div className="flex-1 text-center">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 truncate">{teamBName}</p>
                        <p className="text-3xl font-black text-white scoreboard-number leading-tight mt-0.5">{scoreB}</p>
                      </div>
                    </div>

                    {/* Venue & time */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-600" />
                        {match.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-slate-600" />
                        {match.time}
                      </span>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => setActiveTab("schedule" as any)}
                      className="w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 py-2 hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      <Zap size={11} /> Update Score
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Analytics & Progress Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Match Breakdown & Analytics Bar Chart */}
        <Card className="bg-slate-900/60 border-white/5 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <BarChart2 size={18} className="text-accent" />
              Matches by Sport
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {fixtures.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                Create fixtures to see how matches are distributed across sports.
              </div>
            ) : (
              <div className="space-y-4">
                {matchesPerSport.map((sport, i) => {
                  const maxCount = Math.max(...matchesPerSport.map(s => s.count)) || 1;
                  const percentage = Math.round((sport.count / maxCount) * 100);
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-300">{sport.name}</span>
                        <span className="text-accent">{sport.count} matches</span>
                      </div>
                      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="bg-gradient-to-r from-accent to-amber-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Overall Progress bar */}
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider mb-2">
                <span className="text-slate-400">Tournament Completion</span>
                <span className="text-green-400">{completionRate}% ({completedMatches.length}/{totalMatches})</span>
              </div>
              <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-2"
                  style={{ width: `${completionRate}%` }}
                >
                  {completionRate > 10 && (
                    <span className="text-[9px] font-black text-slate-950 leading-none">{completionRate}%</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications & Recent Activity Panel */}
        <Card className="bg-slate-900/60 border-white/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Bell size={18} className="text-accent" />
              Setup Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {notifications.length === 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
                <CheckCircle className="text-emerald-400 shrink-0" size={18} />
                <div>
                  <p className="text-xs font-bold text-emerald-400">All caught up!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No pending items require your immediate action.</p>
                </div>
              </div>
            )}

            {notifications.map((notif, idx) => (
              <div key={idx} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
                <ShieldAlert className="text-red-400 shrink-0" size={18} />
                <div>
                  <p className="text-xs font-bold text-red-400">Review Required</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">{notif}</p>
                </div>
              </div>
            ))}

            {/* Activities List */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Recent activity</h4>
              {activities.length === 0 ? (
                <p className="text-xs text-slate-500">No activities recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {activities.map(act => (
                    <div key={act.id} className="flex gap-2 items-start text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="font-semibold text-slate-400 min-w-[70px] uppercase tracking-tighter text-[10px] pt-0.5">{act.timestamp}</span>
                      <p className="text-slate-300 flex-1 leading-relaxed">{act.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/60 border-white/5 text-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={18} className="text-accent" />
            Match History
          </CardTitle>
          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className="text-[10px] font-black uppercase tracking-widest text-accent"
          >
            Open Schedule
          </button>
        </CardHeader>
        <CardContent>
          {recentMatchHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm font-semibold text-slate-500">
              Live and completed matches will appear here.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recentMatchHistory.map((match) => {
                const teamAName = teams.find((team) => team.id === match.teamA)?.name || match.teamA;
                const teamBName = teams.find((team) => team.id === match.teamB)?.name || match.teamB;
                return (
                  <div key={match.id} className="rounded-xl border border-white/5 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-accent">{match.sport}</span>
                      <span className={cn(
                        "rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest",
                        match.status === "live" ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"
                      )}>
                        {match.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-black uppercase text-white">{teamAName} vs {teamBName}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{match.date || "Date TBD"} / {match.time || "Time TBD"} / {match.venue || "Venue TBD"}</p>
                    {match.status === "completed" && (
                      <p className="mt-2 font-mono text-lg font-black text-accent">{match.scoreA ?? 0} - {match.scoreB ?? 0}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match Calendar section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Card */}
        <Card className="bg-slate-900/60 border-white/5 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <Calendar size={18} className="text-accent" />
              Match Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 border-b border-white/5 pb-3">
              <select
                value={calendarMonth}
                onChange={(event) => setCalendarMonth(Number(event.target.value))}
                className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-accent"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>

              <select
                value={calendarYear}
                onChange={(event) => setCalendarYear(Number(event.target.value))}
                className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-accent"
              >
                {calendarYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) => handleSelectDate(event.target.value)}
                className="col-span-2 h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-accent"
              />
            </div>

            {/* Days Grid header */}
            <div className="grid grid-cols-7 gap-1 text-[10px] font-black uppercase text-center text-slate-500">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <span key={d}>{d}</span>)}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const isSelected = selectedDate === day.dateStr;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectDate(day.dateStr)}
                    className={`h-9 w-9 text-xs font-bold rounded-lg transition-all flex flex-col items-center justify-center relative ${isSelected
                        ? "bg-accent text-accent-foreground shadow-lg shadow-accent/25 scale-105"
                        : "hover:bg-white/5 text-slate-300"
                      }`}
                  >
                    <span>{day.dayNum}</span>
                    {day.hasMatches && (
                      <span className={`h-1.5 w-1.5 rounded-full absolute bottom-1 ${isSelected ? "bg-accent-foreground" : "bg-accent animate-pulse"
                        }`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-slate-400 flex items-center gap-2 justify-center pt-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span>Days with scheduled matches</span>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Matches List */}
        <Card className="bg-slate-900/60 border-white/5 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-white">
              Matches on {new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" })}
            </CardTitle>
            <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2.5 py-1 rounded-full border border-white/5">
              {selectedDateMatches.length} match{selectedDateMatches.length !== 1 ? "es" : ""}
            </span>
          </CardHeader>
          <CardContent>
            {selectedDateMatches.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No matches scheduled for this date.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {selectedDateMatches.map(match => (
                  <div
                    key={match.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:border-white/10 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-accent border border-accent/20 bg-accent/5 px-2 py-0.5 rounded">
                          {sports.find(s => s.id === match.sport)?.name || match.sport}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{match.time} • {match.venue}</span>
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-2 pt-1">
                        <span>{teams.find(t => t.id === match.teamA)?.name || match.teamA}</span>
                        <span className="text-accent text-xs">VS</span>
                        <span>{teams.find(t => t.id === match.teamB)?.name || match.teamB}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {match.status === "live" ? (
                        <span className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" /> Live
                        </span>
                      ) : match.status === "completed" ? (
                        <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg">
                          Score: {match.scoreA} - {match.scoreB}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                          Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PerformanceTile({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "bad" }) {
  const toneClass = tone === "good"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
    : tone === "warn"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-red-500/20 bg-red-500/10 text-red-300";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}
