"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Calendar,
  ClipboardList,
  Radio,
  Trophy,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
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
import { buildStandings, getAvailableSports } from "@/lib/live-data";
import { getMatchClockText, getMatchPeriod } from "@/lib/match-clock";
import { MatchData } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Home() {
  const [matchesData, setMatchesData] = useState<MatchData[]>([]);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [now, setNow] = useState(0);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [openTournament, setOpenTournament] = useState<TournamentPayload | null>(null);
  const [nextTournament, setNextTournament] = useState<TournamentPayload | null>(null);

  const updateRegistrationWindow = (nextTournaments: TournamentPayload[]) => {
    const nowTime = Date.now();
    const normalized = nextTournaments
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

    const activeTournament = normalized.find(
      (tournament) => nowTime >= tournament.startTime && nowTime <= tournament.endTime
    ) || null;

    const upcomingTournament = normalized
      .filter((tournament) => tournament.startTime > nowTime)
      .sort((a, b) => a.startTime - b.startTime)[0] || null;

    setRegistrationOpen(Boolean(activeTournament));
    setOpenTournament(activeTournament);
    setNextTournament(upcomingTournament);
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  useEffect(() => {
    if (tournaments.length > 0) {
      updateRegistrationWindow(tournaments);
    }
  }, [tournaments, now]);

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

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl bg-[#020617] text-white shadow-2xl sm:rounded-[2.5rem]">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82)),url('/msu-logo-flat.png')] bg-[length:auto,620px_auto] bg-[position:center,right_2rem_center] bg-no-repeat" />
        <div className="relative flex flex-col items-start gap-10 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:p-20">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-accent">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Official MSU Sports Event Hub
            </div>
            <h1 className="sport-heading text-4xl font-black tracking-tighter text-white sm:text-6xl lg:text-8xl">
              MSU <span className="text-accent italic">INVICTA.</span>
            </h1>
            <p className="max-w-2xl text-sm font-semibold leading-relaxed text-slate-300 sm:text-lg">
              A simple place for departments to register teams, for visitors to follow match scores, and for everyone to see which teams are leading.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
            <Link href="/sports" className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-accent text-accent-foreground shadow-2xl shadow-accent/20 transition-all hover:scale-[1.02] active:scale-95 sm:h-16">
              <span className="sport-heading relative z-10 text-xs font-black uppercase tracking-[0.2em]">View Sports</span>
              <div className="absolute inset-0 translate-x-[-100%] bg-white/20 transition-transform group-hover:translate-x-0" />
            </Link>
            <Link href="/matches" className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:border-accent hover:text-accent sm:h-16">
              View Live Matches
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/40 py-4 backdrop-blur-md">
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

      <div className="grid gap-4 md:grid-cols-3">
        {visitorActions.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-4 rounded-2xl border-2 border-border bg-card p-5 transition-all hover:border-accent hover:shadow-lg"
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

      <section className="rounded-2xl border-2 border-border bg-card p-6 shadow-sm md:p-10">
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
                href="/register"
                className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-accent text-sm font-black uppercase tracking-[0.2em] text-accent-foreground transition-all hover:bg-accent/90"
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
                className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-slate-400 text-sm font-black uppercase tracking-[0.2em] text-white opacity-70"
              >
                Registration Closed
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="space-y-8 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-accent" />
              <h2 className="sport-heading text-2xl font-black">Live Scores</h2>
            </div>
            <Link href="/matches" className="flex items-center text-xs font-black uppercase tracking-widest text-primary transition-colors hover:text-accent">
              All Matches <ArrowUpRight size={16} className="ml-1" />
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
                <Card variant={match.status === "Live" ? "scoreboard" : "default"} className="group relative overflow-hidden border-2">
                  {match.status === "Live" && (
                    <div className="absolute left-0 top-0 h-full w-2 bg-accent shadow-[0_0_15px_rgba(252,191,77,0.5)]" />
                  )}
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4 sm:gap-6">
                      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white p-2 shadow-inner transition-transform group-hover:scale-110">
                        <img
                          src={match.sport === "Basketball" ? "/basketball_team_logo_1778666861312.png" : "/football_team_logo_1778666910952.png"}
                          alt={match.sport}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center gap-3">
                          <span className="sport-heading text-[10px] font-black uppercase tracking-[0.2em] text-accent">{match.type}</span>
                          {match.status === "Live" && (
                            <span className="flex animate-pulse items-center gap-2 rounded-full border border-accent/30 bg-accent/20 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-accent">
                              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                              On Air {getMatchClockText(match, now)}
                            </span>
                          )}
                        </div>
                        <p className="sport-heading text-lg font-black tracking-wide sm:text-2xl">
                          <span className="opacity-80 transition-opacity group-hover:opacity-100">{match.teamA}</span>
                          <span className="mx-3 text-accent italic">VS</span>
                          <span className="opacity-80 transition-opacity group-hover:opacity-100">{match.teamB}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-full items-center justify-center gap-4 rounded-2xl border border-white/5 bg-black/40 p-4 shadow-2xl sm:min-w-[180px] sm:p-5">
                      <span className="scoreboard-number text-4xl font-black leading-none tracking-tighter sm:text-5xl">{(match.scoreA ?? 0).toString().padStart(2, "0")}</span>
                      <div className="h-10 w-0.5 bg-white/20" />
                      <span className="scoreboard-number text-4xl font-black leading-none tracking-tighter sm:text-5xl">{(match.scoreB ?? 0).toString().padStart(2, "0")}</span>
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
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-card/30 p-8 text-center sm:rounded-[2.5rem] sm:p-20">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
                  <Activity size={40} className="text-slate-600" />
                </div>
                <h3 className="sport-heading text-2xl font-black text-white">No Matches Published Yet</h3>
                <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-500">When the organizing team publishes fixtures, match cards and live scores will appear here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 rounded-full bg-primary" />
              <h2 className="sport-heading text-2xl font-black">League Tables</h2>
            </div>
            <Link href="/standings" className="text-xs font-black uppercase tracking-widest text-primary hover:text-accent">Full Table</Link>
          </div>

          <Card className="overflow-hidden border-2 p-0">
            {standings.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-secondary-foreground">
                  <tr>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">Rank</th>
                    <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest">DEPARTMENT</th>
                    <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-widest">Played</th>
                    <th className="px-5 py-4 text-right text-[10px] font-black uppercase tracking-widest">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {standings.map((team) => (
                    <tr key={`${team.sport}:${team.team}`} className="group transition-all hover:bg-secondary/50">
                      <td className="sport-heading px-5 py-5 text-lg font-black">{team.rank}</td>
                      <td className="px-5 py-5 text-sm font-bold tracking-wide transition-colors group-hover:text-primary">{team.team}</td>
                      <td className="px-5 py-5 text-center font-bold text-muted-foreground">{team.played}</td>
                      <td className="sport-heading px-5 py-5 text-right text-lg font-black text-primary">{team.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center">
                <Trophy size={48} className="mx-auto mb-4 text-slate-700 opacity-20" />
                <p className="text-sm font-semibold text-slate-500">League tables will appear after teams are registered and matches are completed.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
