"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, CalendarDays, MapPin, Megaphone, Radio, Trophy, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Team } from "@/lib/fixture-generator";
import {
  getPublicAnnouncements,
  getPublicFixtures,
  getPublicLiveScores,
  getPublicTeams,
  getPublicTournaments,
  mapMongoAnnouncement,
  mapMongoFixture,
  mapMongoTeam,
  TournamentPayload,
} from "@/lib/api";
import { InvictaLogo } from "@/components/invicta-logo";
import { buildStandings, getAvailableSports } from "@/lib/live-data";
import { getMatchClockText, getMatchPeriod } from "@/lib/match-clock";
import { MatchData, NotificationData } from "@/lib/types";
import { cn } from "@/lib/utils";

const toDateKey = (value?: string) => value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";

export default function PublicDashboard() {
  const [matchesData, setMatchesData] = useState<MatchData[]>([]);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [announcements, setAnnouncements] = useState<NotificationData[]>([]);
  const [now, setNow] = useState(0);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicData() {
      try {
        const [fixtures, liveScores, teams, publicTournaments, publicAnnouncements] = await Promise.all([
          getPublicFixtures(),
          getPublicLiveScores(),
          getPublicTeams(),
          getPublicTournaments(),
          getPublicAnnouncements(),
        ]);
        if (!isMounted) return;

        const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
        setMatchesData(
          fixtures
            .map((fixture) => mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData)
            .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
        );
        setTeamsData(teams.map((team) => mapMongoTeam(team) as Team));
        setTournaments(publicTournaments);
        setAnnouncements(publicAnnouncements.map(mapMongoAnnouncement));
      } catch {
        // Keep the latest successfully loaded public data visible during brief API interruptions.
      }
    }

    void loadPublicData();
    const interval = window.setInterval(() => {
      if (!document.hidden) void loadPublicData();
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const registrationOpen = tournaments.some((tournament) => {
    const endTime = new Date(tournament.endDate).setHours(23, 59, 59, 999);
    return Boolean(tournament.registrationOpen) && !Number.isNaN(endTime) && Date.now() <= endTime;
  });

  const currentTournament = useMemo(() => {
    const timestamp = now || Date.now();
    const active = tournaments.find((tournament) => {
      const start = new Date(tournament.startDate).setHours(0, 0, 0, 0);
      const end = new Date(tournament.endDate).setHours(23, 59, 59, 999);
      return !Number.isNaN(start) && !Number.isNaN(end) && start <= timestamp && timestamp <= end;
    });
    return active || [...tournaments].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate))[0] || null;
  }, [now, tournaments]);

  const liveMatches = matchesData.filter((match) => match.status === "Live");
  const upcomingMatches = matchesData
    .filter((match) => match.status === "Upcoming")
    .sort((a, b) => {
      const dateA = toDateKey(a.date);
      const dateB = toDateKey(b.date);
      return `${dateA}T${a.time || "23:59"}`.localeCompare(`${dateB}T${b.time || "23:59"}`);
    });
  const completedMatches = matchesData.filter((match) => match.status === "Finished");
  const sports = getAvailableSports(teamsData, matchesData);
  const activeTeams = teamsData.length || new Set(matchesData.flatMap((match) => [match.teamA, match.teamB])).size;
  const standingsSport = sports[0];
  const standings = buildStandings(matchesData, teamsData, standingsSport?.id).slice(0, 5);
  const latestAnnouncements = [...announcements].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
  const featuredTeams = teamsData.slice(0, 8);

  const formatMatchDate = (match: MatchData) => {
    const dateKey = toDateKey(match.date);
    if (!dateKey) return match.date || "Date to be announced";
    const date = new Date(`${dateKey}T${match.time || "12:00"}`);
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  const tournamentStatus = currentTournament
    ? currentTournament.status === "ongoing" ? "In progress" : registrationOpen ? "Registration open" : "Upcoming"
    : "Tournament details soon";

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="relative isolate overflow-hidden rounded-3xl bg-[#0b1220] text-white shadow-xl">
        <div className="absolute inset-0 -z-20 bg-[url('/landingpage.jpeg')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b1220] via-[#0b1220]/90 to-[#0b1220]/45" />
        <div className="absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-12">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Official MSU Sports Tournament
            </div>
            <div className="mb-4 flex items-center gap-4">
              <span className="text-3xl font-black tracking-tight sm:text-4xl">MSU</span>
              <InvictaLogo className="h-10 w-36 sm:h-14 sm:w-52" />
            </div>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Where competition <span className="text-blue-300">comes alive.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
              Follow matches, live scores, teams and tournament standings — all in one place.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:min-w-48 lg:flex-col">
            <Link href="/matches" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition-colors hover:bg-blue-500">
              View Matches <ArrowRight size={16} />
            </Link>
            <Link href="/live-score" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-bold text-white transition-colors hover:bg-white/15">
              <Radio size={16} /> Live Scores
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Tournament status" className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] lg:items-center">
          <div className="flex items-center gap-3 border-b border-border pb-4 sm:col-span-2 lg:col-span-1 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Trophy size={21} /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tournament</p>
              <h2 className="truncate text-base font-bold text-foreground">{currentTournament?.name || "INVICTA"}</h2>
            </div>
          </div>
          <StatusMetric label="Status" value={tournamentStatus} status={currentTournament?.status === "ongoing" ? "live" : "normal"} />
          <StatusMetric label="Matches" value={matchesData.length.toString()} />
          <StatusMetric label="Teams" value={activeTeams.toString()} />
          <StatusMetric label="Completed" value={completedMatches.length.toString()} />
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading title="Live Now" subtitle="Follow the action as it happens." actionLabel="All live scores" actionHref="/live-score" />
        {liveMatches.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {liveMatches.slice(0, 4).map((match) => (
              <Card key={match.id} className="relative overflow-hidden border border-emerald-500/20 bg-card p-4 shadow-sm sm:p-5">
                <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{match.sportName || match.sport} · {match.type}</span>
                </div>
                <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                  <span className="truncate text-sm font-bold text-foreground sm:text-base">{match.teamA}</span>
                  <span className="scoreboard-number text-3xl font-extrabold tabular-nums text-foreground sm:text-4xl">
                    {match.scoreA ?? 0}<span className="px-2 text-muted-foreground">–</span>{match.scoreB ?? 0}
                  </span>
                  <span className="truncate text-right text-sm font-bold text-foreground sm:text-base">{match.teamB}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs font-medium text-muted-foreground">{getMatchPeriod(match)} · {getMatchClockText(match, now)}</span>
                  <Link href="/matches" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-600 dark:text-blue-300">
                    View Match <ArrowRight size={14} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyPanel icon={Radio} title="No matches are live right now" text="Check the upcoming fixtures to see what’s next." actionLabel="View upcoming matches" actionHref="/matches" />
        )}
      </section>

      <section className="space-y-5">
        <SectionHeading title="Upcoming Matches" subtitle="See what’s next on the tournament schedule." actionLabel="Full schedule" actionHref="/matches" />
        {upcomingMatches.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcomingMatches.slice(0, 3).map((match) => (
              <Card key={match.id} className="flex h-full flex-col border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">{match.type || "Scheduled match"}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{match.sportName || match.sport}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Upcoming</span>
                </div>
                <div className="my-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center">
                  <span className="break-words text-sm font-bold text-foreground">{match.teamA}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">vs</span>
                  <span className="break-words text-sm font-bold text-foreground">{match.teamB}</span>
                </div>
                <div className="mt-auto space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2"><CalendarDays size={14} className="text-blue-600 dark:text-blue-300" /> {formatMatchDate(match)}{match.time ? ` · ${match.time}` : ""}</p>
                  <p className="flex items-center gap-2"><MapPin size={14} className="text-blue-600 dark:text-blue-300" /> <span className="truncate">{match.venue || "Venue to be announced"}</span></p>
                </div>
                <Link href="/matches" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-600 dark:text-blue-300">
                  Match details <ArrowRight size={14} />
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyPanel icon={CalendarDays} title="No upcoming fixtures yet" text="Published matches will appear here when the schedule is ready." actionLabel="Browse matches" actionHref="/matches" />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="min-w-0 space-y-4">
          <SectionHeading title="Tournament Standings" subtitle={standingsSport ? `${standingsSport.name} · Top teams` : "League leaders across the tournament."} actionLabel="Full standings" actionHref="/standings" />
          <Card className="overflow-hidden border border-border bg-card p-0 shadow-sm">
            {standings.length ? (
              <ol className="divide-y divide-border">
                {standings.map((row) => (
                  <li key={`${row.sport}:${row.team}`} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:px-5">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold", row.rank === 1 ? "bg-blue-600 text-white" : "bg-secondary text-muted-foreground")}>{row.rank}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{row.team}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{row.played} matches · {row.won} wins</p>
                    </div>
                    <p className="text-right text-sm font-extrabold text-foreground">{row.pts}<span className="ml-1 text-[10px] font-medium text-muted-foreground">pts</span></p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Standings will appear after matches are completed.</p>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <SectionHeading title="Latest Updates" subtitle="News from the tournament desk." actionLabel="All updates" actionHref="/announcements" />
          {latestAnnouncements.length ? (
            <div className="space-y-3">
              {latestAnnouncements.map((announcement) => (
                <Link key={announcement.id} href={announcement.href || "/announcements"} className="group block rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-blue-300">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Megaphone size={17} /></span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300">Tournament update</p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-bold text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300">{announcement.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{announcement.message}</p>
                      <p className="mt-2 text-[10px] font-medium text-muted-foreground">{new Date(announcement.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel icon={Megaphone} title="No new updates yet" text="Tournament notices will appear here when published." actionLabel="View news" actionHref="/announcements" compact />
          )}
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading title="Meet the Teams" subtitle="The departments bringing the tournament to life." actionLabel="Browse teams" actionHref="/teams" />
        {featuredTeams.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {featuredTeams.map((team) => (
              <Link key={team.id} href="/teams" className="group rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:p-5">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-lg font-extrabold uppercase text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{team.name.slice(0, 1)}</span>
                <h3 className="mt-3 truncate text-sm font-bold text-foreground">{team.name}</h3>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{team.sportName || team.sport} · {team.members.length} players</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">View team <ArrowRight size={13} /></span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyPanel icon={Users} title="Teams will appear here" text="Teams will show once they are registered for the tournament." actionLabel="Browse sports" actionHref="/sports" />
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-blue-900 dark:text-blue-200"><Users size={19} /></span>
          <div>
            <h2 className="text-base font-bold text-foreground">{registrationOpen ? "Ready to compete?" : "Explore the tournament"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{registrationOpen ? "Team registration is open for an active tournament." : "Follow fixtures, standings and tournament news in one place."}</p>
          </div>
        </div>
        <Link href={registrationOpen ? "/public-register" : "/sports"} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition-colors hover:bg-blue-500">
          {registrationOpen ? "Register a team" : "Explore sports"} <ArrowRight size={15} />
        </Link>
      </section>

      <div className="sr-only" aria-live="polite">{liveMatches.length} matches currently live</div>
    </div>
  );
}

function StatusMetric({ label, value, status }: { label: string; value: string; status?: "live" | "normal" }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 truncate text-sm font-bold text-foreground">
        {status === "live" && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />}
        {value}
      </p>
    </div>
  );
}

function SectionHeading({ title, subtitle, actionLabel, actionHref }: { title: string; subtitle: string; actionLabel: string; actionHref: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
      </div>
      <Link href={actionHref} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-600 dark:text-blue-300">
        {actionLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function EmptyPanel({ icon: Icon, title, text, actionLabel, actionHref, compact = false }: { icon: typeof Activity; title: string; text: string; actionLabel: string; actionHref: string; compact?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-dashed border-border bg-card text-center", compact ? "p-5" : "p-7 sm:p-9")}>
      <Icon size={compact ? 22 : 28} className="mx-auto text-muted-foreground" />
      <h3 className="mt-3 text-sm font-bold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{text}</p>
      <Link href={actionHref} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-600 dark:text-blue-300">
        {actionLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}
