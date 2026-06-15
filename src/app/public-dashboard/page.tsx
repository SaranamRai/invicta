"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  ClipboardList,
  Home,
  LogIn,
  Radio,
  Trophy,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { SportMark } from "@/components/sport-mark";
import { Team } from "@/lib/fixture-generator";
import {
  getPublicFixtures,
  getPublicLiveScores,
  getPublicTeams,
  getPublicTournaments,
  mapMongoFixture,
  mapMongoTeam,
  TournamentPayload,
} from "@/lib/api";
import { getStoredSession } from "@/lib/api";
import { InvictaLogo } from "@/components/invicta-logo";
import { buildStandings, getAvailableSports } from "@/lib/live-data";
import { getMatchClockText, getMatchPeriod } from "@/lib/match-clock";
import { MatchData } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PublicDashboard() {
  const [matchesData, setMatchesData] = useState<MatchData[]>([]);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [now, setNow] = useState(0);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);

  const { registrationOpen, openTournament, nextTournament } = useMemo(() => {
    const normalized = tournaments
      .map((tournament) => ({
        ...tournament,
        startTime: new Date(tournament.startDate).setHours(0, 0, 0, 0),
        endTime: new Date(tournament.endDate).setHours(23, 59, 59, 999),
      }))
      .filter((tournament) =>
        tournament.registrationOpen &&
        !Number.isNaN(tournament.startTime) &&
        !Number.isNaN(tournament.endTime)
      );

    const validOpenTournaments = normalized.filter((tournament) => now <= tournament.endTime);
    const activeTournament = validOpenTournaments
      .sort((a, b) => a.startTime - b.startTime)[0] || null;

    const upcomingTournament = validOpenTournaments
      .filter((tournament) => tournament.startTime > now)
      .sort((a, b) => a.startTime - b.startTime)[0] || null;

    return {
      registrationOpen: Boolean(activeTournament),
      openTournament: activeTournament,
      nextTournament: upcomingTournament,
    };
  }, [now, tournaments]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadPublicData() {
      const [fixtures, liveScores, teams, tournaments] = await Promise.all([
        getPublicFixtures(),
        getPublicLiveScores(),
        getPublicTeams(),
        getPublicTournaments(),
      ]);

      if (!isMounted) return;

      const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
      setMatchesData(
        fixtures
          .map((fixture) => mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData)
          .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
      );
      setTeamsData(teams.map((team) => mapMongoTeam(team) as Team));
      setTournaments(tournaments);
    };

    void loadPublicData();
    const interval = window.setInterval(loadPublicData, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const activeTeams = teamsData.length || new Set(matchesData.flatMap((match) => [match.teamA, match.teamB])).size;
  const liveMatches = matchesData.filter((match) => match.status === "Live").length;
  const upcomingMatches = matchesData.filter((match) => match.status === "Upcoming").length;
  const sports = getAvailableSports(teamsData, matchesData);
  const standings = buildStandings(matchesData, teamsData).slice(0, 5);

  const stats = [
    { label: "Registered Teams", value: activeTeams.toString(), icon: Users, color: "text-accent", bg: "bg-white/5" },
    { label: "Live Matches", value: liveMatches.toString(), icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Matches Scheduled", value: upcomingMatches.toString(), icon: Calendar, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Sports Available", value: sports.length.toString(), icon: Trophy, color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  const visitorActions = [
    { label: "View Sports", text: "See which sports are part of MSU Invicta and browse registered teams.", href: "/sports", icon: ClipboardList },
    { label: "Follow Matches", text: "Students and visitors can see schedules, live scores, and match updates.", href: "/matches", icon: Radio },
    { label: "Check League Tables", text: "Completed results update the league table automatically.", href: "/standings", icon: Trophy },
  ];

  const isLoggedIn = typeof window !== "undefined" && Boolean(getStoredSession());

  const easyPaths = [
    { label: "Visitors", text: "Watch matches, standings, results, rules, and announcements.", href: "/matches", icon: Radio },
    { label: "Teams", text: "Register only when the tournament registration window is open.", href: registrationOpen ? (isLoggedIn ? "/register" : "/public-register") : "/", icon: ClipboardList },
    { label: "Staff", text: "Use role login for supercoordinator, coordinator, volunteer, or admin dashboards.", href: "/login", icon: LogIn },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-xl bg-[#020617] text-white shadow-xl sm:rounded-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82)),url('/msu-logo-flat.png')] bg-[length:auto,620px_auto] bg-[position:center,right_2rem_center] bg-no-repeat" />
        <div className="relative flex flex-col items-start gap-5 p-4 sm:gap-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-12">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-accent/30 bg-accent/20 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-accent sm:text-[10px] sm:tracking-widest">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Official MSU Sports Event Hub
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-5">
              <span className="sport-heading text-4xl font-black uppercase tracking-wide text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
                MSU
              </span>
              <InvictaLogo className="h-12 w-44 sm:h-20 sm:w-80 lg:h-24 lg:w-96" />
            </div>
            <p className="max-w-2xl text-sm font-semibold leading-relaxed text-slate-300 sm:text-lg">
              A simple place for departments to register teams, for visitors to follow match scores, and for everyone to see which teams are leading.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
            <Link href="/sports" className="group relative flex h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-accent px-3 text-accent-foreground shadow-xl shadow-accent/20 transition-all hover:scale-[1.01] active:scale-95 sm:h-14">
              <span className="sport-heading relative z-10 text-[10px] font-black uppercase tracking-wide sm:text-xs sm:tracking-[0.2em]">View Sports</span>
              <div className="absolute inset-0 hidden translate-x-[-100%] bg-white/20 transition-transform group-hover:translate-x-0 sm:block" />
            </Link>
            <Link href="/matches" className="flex h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 text-[10px] font-black uppercase tracking-wide text-white transition-all hover:border-accent hover:text-accent sm:h-14 sm:text-xs sm:tracking-[0.2em]">
              View Live Matches
            </Link>
            <Link href="/" className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-[9px] font-black uppercase tracking-wide text-slate-300 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white sm:text-[10px] sm:tracking-[0.18em]">
              <Home size={14} className="text-accent" />
              Landing Page
            </Link>
          </div>
        </div>

        <div className="hidden border-t border-white/10 bg-black/40 py-4 backdrop-blur-md sm:block">
          <div className="flex animate-marquee whitespace-nowrap gap-20">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-20">
                <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  View MSU Invicta sports and department teams
                </span>
                <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Track live scores as volunteers update them
                </span>
                <span className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  League tables are calculated from completed matches
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="group relative overflow-hidden border-2 transition-all hover:border-accent">
              <div className="absolute right-0 top-0 p-2 opacity-5 transition-opacity group-hover:opacity-10">
                <stat.icon size={80} />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                  <h3 className="sport-heading mt-1 text-4xl font-black">{stat.value}</h3>
                </div>
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", stat.bg)}>
                  <stat.icon className={stat.color} size={24} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {visitorActions.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-accent hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <item.icon size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-foreground">{item.label}</h2>
              <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="min-w-0 space-y-5 lg:col-span-2 lg:space-y-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-primary" />
              <h2 className="sport-heading text-2xl font-black">League Tables</h2>
            </div>
            <Link href="/standings" className="text-xs font-black uppercase tracking-widest text-primary hover:text-accent">Full Table</Link>
          </div>

          <Card className="overflow-hidden border-2 p-0">
            {standings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[520px] w-full text-left text-sm">
                  <thead className="bg-secondary text-secondary-foreground">
                    <tr>
                      <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide sm:px-5 sm:py-4 sm:tracking-widest">Rank</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide sm:px-5 sm:py-4 sm:tracking-widest">DEPARTMENT</th>
                      <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wide sm:px-5 sm:py-4 sm:tracking-widest">Played</th>
                      <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wide sm:px-5 sm:py-4 sm:tracking-widest">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {standings.map((team) => (
                      <tr key={`${team.sport}:${team.team}`} className="group transition-all hover:bg-secondary/50">
                        <td className="sport-heading px-3 py-4 text-lg font-black sm:px-5 sm:py-5">{team.rank}</td>
                        <td className="px-3 py-4 text-sm font-bold tracking-wide transition-colors group-hover:text-primary sm:px-5 sm:py-5">{team.team}</td>
                        <td className="px-3 py-4 text-center font-bold text-muted-foreground sm:px-5 sm:py-5">{team.played}</td>
                        <td className="sport-heading px-3 py-4 text-right text-lg font-black text-primary sm:px-5 sm:py-5">{team.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center">
                <Trophy size={48} className="mx-auto mb-4 text-slate-700 opacity-20" />
                <p className="text-sm font-semibold text-slate-500">League tables will appear after teams are registered and matches are completed.</p>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-5 lg:space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-accent" />
              <h2 className="sport-heading text-xl font-black sm:text-2xl lg:text-xl">Live Scores</h2>
            </div>
            <Link href="/matches" className="flex items-center text-xs font-black uppercase tracking-widest text-primary transition-colors hover:text-accent">
              All Matches <ArrowUpRight size={16} className="ml-1" />
            </Link>
          </div>

          <div className="grid gap-4">
            {matchesData.length > 0 ? matchesData.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <Card variant={match.status === "Live" ? "scoreboard" : "default"} className="group relative overflow-hidden border-2 p-4">
                  {match.status === "Live" && (
                    <div className="absolute left-0 top-0 h-full w-1.5 bg-accent shadow-[0_0_15px_rgba(252,191,77,0.5)]" />
                  )}
                  <div className="flex flex-col gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white p-2 shadow-inner transition-transform group-hover:scale-105">
                        <SportMark name={match.sportName || match.sport} className="h-full w-full text-slate-950" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="sport-heading text-[9px] font-black uppercase tracking-[0.18em] text-accent">{match.type}</span>
                          {match.status === "Live" && (
                            <span className="flex animate-pulse items-center gap-1.5 rounded-full border border-accent/30 bg-accent/20 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-accent">
                              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                              On Air {getMatchClockText(match, now)}
                            </span>
                          )}
                        </div>
                        <p className="sport-heading truncate text-base font-black tracking-wide">
                          <span className="opacity-80 transition-opacity group-hover:opacity-100">{match.teamA}</span>
                          <span className="mx-2 text-accent italic">VS</span>
                          <span className="opacity-80 transition-opacity group-hover:opacity-100">{match.teamB}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 rounded-xl border border-white/5 bg-black/40 p-3 shadow-xl">
                      <span className="scoreboard-number text-3xl font-black leading-none tracking-tighter">{(match.scoreA ?? 0).toString().padStart(2, "0")}</span>
                      <div className="h-8 w-0.5 bg-white/20" />
                      <span className="scoreboard-number text-3xl font-black leading-none tracking-tighter">{(match.scoreB ?? 0).toString().padStart(2, "0")}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-slate-300">
                      {getMatchPeriod(match)}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] font-black text-accent">
                      {getMatchClockText(match, now)}
                    </span>
                    {match.scoreEvents?.[0] && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Last point: {match.scoreEvents[0].teamName} at {match.scoreEvents[0].matchTime}
                      </span>
                    )}
                  </div>
                </Card>
              </motion.div>
            )) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-card/30 p-8 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <Activity size={32} className="text-slate-600" />
                </div>
                <h3 className="sport-heading text-xl font-black text-white">No Matches Published Yet</h3>
                <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500">When the organizing team publishes fixtures, match cards and live scores will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <div className="mb-5">
          <h2 className="sport-heading text-xl font-black tracking-tight text-foreground">Start Here</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Pick the path that matches what you need to do.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {easyPaths.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex min-h-28 items-start gap-4 rounded-xl border border-border bg-secondary/50 p-4 transition-all hover:border-accent hover:bg-accent/10",
                item.label === "Teams" && !registrationOpen ? "pointer-events-none opacity-60" : ""
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-accent">
                <item.icon size={19} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">{item.label}</h3>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-8">
        <div className="mb-8 flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent">
              <Users size={24} />
            </div>
            <h2 className="sport-heading text-2xl font-black tracking-tight text-foreground">Public Team Registration</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">
              Registration opens only when the admin enables the registration portal and the current date falls within an active tournament window.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {registrationOpen && openTournament ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Registration is open from {formatDate(openTournament.startDate)} to {formatDate(openTournament.endDate)}.
              </p>
              <Link
                href={isLoggedIn ? "/register" : "/public-register"}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-xs font-black uppercase tracking-wide text-accent-foreground transition-all hover:bg-accent/90 sm:h-14 sm:text-sm sm:tracking-[0.2em]"
              >
                Open Registration
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-red-200 bg-red-500/10 p-4 text-sm font-medium text-red-700">
                Registration is currently closed. You can only register while the admin portal is enabled and the date is within the tournament window.
              </div>
              {nextTournament ? (
                <p className="text-sm text-muted-foreground">
                  Next registration window: {formatDate(nextTournament.startDate)} to {formatDate(nextTournament.endDate)}.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming registration window is configured yet.</p>
              )}
              <button
                type="button"
                disabled
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-slate-400 px-4 text-xs font-black uppercase tracking-wide text-white opacity-70 sm:h-14 sm:text-sm sm:tracking-[0.2em]"
              >
                Registration Closed
              </button>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
