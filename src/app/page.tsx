"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
<<<<<<< HEAD
import { motion } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";
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
import { db } from "@/lib/firebase";
import { Team } from "@/lib/fixture-generator";
import { buildStandings, getAvailableSports } from "@/lib/live-data";
import { getMatchClockText, getMatchPeriod } from "@/lib/match-clock";
import { MatchData } from "@/lib/types";
import { cn } from "@/lib/utils";
=======
import { ArrowRight, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LiveSportsPanel } from "@/components/live-sports-panel";
import { InvictaLogo } from "@/components/invicta-logo";

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/#contact" },
];
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)

export default function Home() {
  const [matchesData, setMatchesData] = useState<MatchData[]>([]);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const unsubscribeMatches = onSnapshot(collection(db, "matches"), (snapshot) => {
      const nextMatches = snapshot.docs
        .map((matchDoc) => ({ id: matchDoc.id, ...matchDoc.data() } as MatchData))
        .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));

      setMatchesData(nextMatches);
    });

    const unsubscribeTeams = onSnapshot(collection(db, "teams"), (snapshot) => {
      const nextTeams = snapshot.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() } as Team));
      setTeamsData(nextTeams);
    });

    return () => {
      unsubscribeMatches();
      unsubscribeTeams();
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
    { label: "Check Standings", text: "Completed results update the league table automatically.", href: "/standings", icon: Trophy },
  ];

  return (
<<<<<<< HEAD
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
=======
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M10 11h20v26H10zM30 11h8v26h-8M30 24h8M14 37l-3 5M26 37l3 5" {...common} />
      <circle cx="38" cy="16" r="3" {...common} />
    </svg>
  );
}

const sports = [
  "Cricket",
  "Badminton",
  "Football",
  "Volleyball",
  "Arm Wrestling",
  "Table Tennis",
];

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <LiveSportsPanel />
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-5 py-5 sm:justify-between sm:px-8 lg:px-10">
          <Link href="/" aria-label="Invicta home">
            <InvictaLogo className="h-12 w-44 sm:h-14 sm:w-56" />
          </Link>

          <nav className="flex items-center gap-4 sm:gap-8">
            {navLinks.map((link, index) => (
              <a
                key={link.label}
                href={link.href}
                className={`relative whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.16em] transition-colors hover:text-[#f4c35a] sm:text-xs sm:tracking-[0.24em] ${index === 0 ? "text-[#f4c35a]" : "text-foreground/80"}`}
              >
                {link.label}
                {index === 0 && <span className="absolute -bottom-2 left-1/2 h-px w-6 -translate-x-1/2 bg-[#f4c35a]" />}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="relative flex min-h-screen items-center overflow-hidden pb-16 pt-28">
          <div className="absolute inset-0 bg-[url('/badminton-bg.png')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--landing-overlay-98)_0%,var(--landing-overlay-90)_36%,var(--landing-overlay-48)_68%,var(--landing-overlay-42)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--landing-overlay-bottom)_0%,transparent_45%,var(--landing-overlay-top)_100%)]" />
          <div className="landing-hero-glow absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[#d99d2b]/10 blur-3xl" />

          <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-4xl">
              <p className="mb-5 text-[10px] font-black uppercase tracking-[0.38em] text-[#f4c35a] sm:text-xs">
                Medhavi Skills University Sports
              </p>
              <h1 className="landing-display text-[3.25rem] font-black italic leading-[0.82] tracking-[-0.035em] sm:text-8xl lg:text-[8.5rem]">
                <span className="block">BUILT FOR</span>
                <span className="landing-gold-text block">CHAMPIONS</span>
              </h1>
              <p className="mt-8 max-w-lg text-sm font-semibold uppercase leading-7 tracking-[0.2em] text-foreground/60 sm:text-base">
                Passion in every game.
                <br />
                Performance that defines you.
              </p>

              <Link
                href="/public-dashboard"
                className="landing-slant group mt-10 inline-flex items-center gap-3 bg-[#e5ad3b] px-9 py-4 text-xs font-black uppercase tracking-[0.22em] text-black transition-all hover:bg-[#f7cf70]"
              >
                Explore Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>

        <section id="sports" className="border-y border-border bg-background px-5 py-20 sm:px-8 transition-colors duration-300">
          <div className="mx-auto max-w-6xl">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-[#f4c35a]">Invicta Sports</p>
            <h2 className="landing-display mt-3 text-center text-3xl font-black uppercase tracking-[0.13em] sm:text-4xl">
              One Spirit. Every Game.
            </h2>

            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {sports.map((sport) => (
                <Link key={sport} href="/sports" className="group flex flex-col items-center gap-4">
                  <div className="landing-sport-card landing-slant grid aspect-square w-full place-items-center border border-landing-card-border bg-gradient-to-br from-landing-card-bg to-transparent transition-all group-hover:border-[#f4c35a]/80 group-hover:bg-[#f4c35a]/10">
                    <span className="h-14 w-14 text-[#e5ad3b] transition-transform duration-300 group-hover:scale-110">
                      <SportMark name={sport} />
                    </span>
                  </div>
                  <span className="text-center text-[9px] font-black uppercase tracking-[0.18em] text-foreground/50 transition-colors group-hover:text-[#f4c35a]">
                    {sport}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-landing-footer-bg border-t border-landing-footer-border px-5 py-14 sm:px-8 transition-colors duration-300">
        <div className="mx-auto grid max-w-7xl gap-10 border-b border-landing-footer-border pb-12 md:grid-cols-3 md:items-start">
          <div>
            <InvictaLogo className="h-14 w-52" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-foreground/50">
              The official public sports experience for MSU Invicta.
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)
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

<<<<<<< HEAD
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
                  Standings are calculated from completed matches
                </span>
              </div>
            ))}
          </div>
=======
        <div className="mx-auto mt-6 flex max-w-7xl flex-col justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/35 sm:flex-row">
          <span>© 2026 Invicta. All rights reserved.</span>
          <span className="text-accent/50 font-black">Managed & Powered by SoCSE</span>
          <span>Medhavi Skills University</span>
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)
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
              <h2 className="sport-heading text-2xl font-black">Team Standings</h2>
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
                <p className="text-sm font-semibold text-slate-500">Standings will appear after teams are registered and matches are completed.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
