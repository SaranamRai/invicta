"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Users, User, ArrowLeft, Trophy, Loader2, Shield, ShieldOff, Calendar, Search, ChevronLeft, ChevronRight, Hash } from "lucide-react";
import Link from "next/link";
import { getPublicSportDetail, SportDetailResponse } from "@/lib/api";
import { GenderMark } from "@/components/gender-mark";

const MEMBERS_PER_PAGE = 12;

function CategorySection({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  const gender = label.startsWith("Male") ? "Male" : label.startsWith("Female") ? "Female" : "";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          {gender ? <GenderMark gender={gender} className="h-5 w-5" /> : <Icon size={16} />}
        </div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-accent">{label}</h3>
      </div>
      {children}
    </div>
  );
}

function TeamCard({
  team,
  expanded,
  onToggle,
}: {
  team: SportDetailResponse["teams"]["male"][number];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="p-5 border border-white/10 hover:border-accent/30 transition-all">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-lg font-black uppercase text-accent">
          {team.teamName.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-black uppercase tracking-wide text-foreground">{team.teamName}</h3>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{team.department || "Department"}</p>
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
              <Users size={12} /> {team.membersCount} member{team.membersCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
              <User size={12} /> {team.captainName || "N/A"}
            </span>
          </div>
          {team.tournamentName && (
            <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-accent">{team.tournamentName}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-secondary/50 text-[10px] font-black uppercase tracking-widest text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        {expanded ? "Hide Players" : "View Players"}
      </button>
      {expanded && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-background/60 p-3">
          {team.members?.length ? (
            <div className="grid gap-2">
              {team.members.map((member, index) => (
                <div key={`${member.registrationNo || member.fullName}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-card/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-foreground">{member.fullName || "Unnamed Player"}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{member.registrationNo || "Member ID N/A"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/15 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-accent">
                    {member.position || member.role || "Player"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm font-semibold text-muted-foreground">No players recorded for this team.</p>
          )}
        </div>
      )}
    </Card>
  );
}

type PublicMember = SportDetailResponse["members"]["male"][number];

function MemberCard({ member }: { member: PublicMember }) {
  const displayRole = member.position || member.role || "Player";
  const photo = member.profilePhoto;
  const initials = member.fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="group p-4 border border-white/5 bg-card/70 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-accent/20 bg-secondary text-primary">
          {photo ? (
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : initials ? (
            <span className="text-sm font-black uppercase tracking-wide">{initials}</span>
          ) : (
            <User size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="truncate text-sm font-black text-foreground">{member.fullName || "Unnamed Member"}</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-accent">{displayRole}</p>
          </div>

          <div className="grid gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Hash size={11} className="shrink-0 text-slate-500" />
              <span className="truncate">{member.registrationNo || "Member ID N/A"}</span>
            </span>
            <span className="truncate">{member.teamName || member.department || "Team/Club N/A"}</span>
            <span className="rounded-full border border-white/10 bg-secondary/50 px-2 py-0.5 text-[9px] w-fit">
              {member.category || "Sport Category"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MembersListView({
  members,
  sportName,
}: {
  members: PublicMember[];
  sportName: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredMembers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return members;

    return members.filter((member) =>
      [
        member.fullName,
        member.registrationNo,
        member.teamName,
        member.department,
        member.category,
        member.position,
        member.role,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value))
    );
  }, [members, query]);

  useEffect(() => {
    setPage(1);
  }, [query, members.length]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * MEMBERS_PER_PAGE;
  const visibleMembers = filteredMembers.slice(pageStart, pageStart + MEMBERS_PER_PAGE);

  if (members.length === 0) {
    return (
      <div className="min-h-[300px] rounded-[2.5rem] bg-card/30 border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-8 sm:p-16">
        <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
          <User size={40} className="text-slate-500" />
        </div>
        <h3 className="text-2xl font-black sport-heading text-foreground uppercase">No Members Registered</h3>
        <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-muted-foreground">
          No members are currently registered for this sport.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Members</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            View-only list of registered {sportName} participants.
          </p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members by name"
            className="h-11 w-full rounded-xl border border-white/10 bg-background/80 pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
          />
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No members match your search.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleMembers.map((member, index) => (
              <MemberCard key={`${member.category}-${member.registrationNo || member.fullName}-${pageStart + index}`} member={member} />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/30 p-4 text-xs font-bold text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {pageStart + 1}-{Math.min(pageStart + visibleMembers.length, filteredMembers.length)} of {filteredMembers.length} member{filteredMembers.length === 1 ? "" : "s"}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage === 1}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase tracking-widest text-foreground transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <span className="px-2 text-[10px] font-black uppercase tracking-widest">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase tracking-widest text-foreground transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FixtureCard({ fixture }: { fixture: SportDetailResponse["fixtures"]["male"][number] }) {
  const f = fixture as Record<string, unknown>;
  return (
    <Card className="p-5 border border-white/10 hover:border-white/20 transition-all">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/15 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-accent">
              {String(f.status || "upcoming")}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {String(f.date || "Date TBD")} / {String(f.time || "Time TBD")}
            </span>
          </div>
          <h3 className="text-xl font-black uppercase tracking-wide text-foreground">
            {String(f.teamA || f.teamAName || "Team A")} <span className="text-accent">VS</span> {String(f.teamB || f.teamBName || "Team B")}
          </h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {String(f.venue || "Venue TBD")}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function SportDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const [data, setData] = useState<SportDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState("Teams");
  const [teamCategory, setTeamCategory] = useState<"Male" | "Female">("Male");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    try {
      const result = await getPublicSportDetail(params.id);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    setLoading(true);
    fetchDetail();
    const interval = window.setInterval(fetchDetail, 15000);
    return () => window.clearInterval(interval);
  }, [fetchDetail]);

  if (loading) return <div className="flex min-h-72 items-center justify-center p-20"><Loader2 className="animate-spin" size={32} /></div>;
  if (!data) return <div className="p-20 text-center font-black">Sport Not Found</div>;

  const { sport, stats, teams, members, fixtures } = data;
  const sportName = sport.sportName || sport.name || "";
  const tournamentOptions = Array.from(
    new Map(
      [...teams.male, ...teams.female, ...members.male, ...members.female]
        .filter((item) => item.tournamentId || item.tournamentName)
        .map((item) => [item.tournamentId || item.tournamentName || "unknown", {
          id: item.tournamentId || item.tournamentName || "unknown",
          name: item.tournamentName || "Tournament",
        }])
    ).values()
  );
  const activeTournamentId = selectedTournamentId || tournamentOptions[0]?.id || "";
  const tournamentMatches = (item: { tournamentId?: string; tournamentName?: string }) =>
    !activeTournamentId || item.tournamentId === activeTournamentId || (!item.tournamentId && item.tournamentName === activeTournamentId);
  const filteredMaleTeams = teams.male.filter(tournamentMatches);
  const filteredFemaleTeams = teams.female.filter(tournamentMatches);
  const visibleTeams = teamCategory === "Male" ? filteredMaleTeams : filteredFemaleTeams;
  const allMembers = [...members.male, ...members.female].filter(tournamentMatches);
  const filteredMaleFixtures = fixtures.male.filter((fixture) => tournamentMatches(fixture as { tournamentId?: string; tournamentName?: string }));
  const filteredFemaleFixtures = fixtures.female.filter((fixture) => tournamentMatches(fixture as { tournamentId?: string; tournamentName?: string }));

  const hasMaleTeams = filteredMaleTeams.length > 0;
  const hasFemaleTeams = filteredFemaleTeams.length > 0;
  const hasAnyTeams = hasMaleTeams || hasFemaleTeams;

  const hasMaleMembers = members.male.length > 0;
  const hasFemaleMembers = members.female.length > 0;
  const hasAnyMembers = hasMaleMembers || hasFemaleMembers;

  const hasMaleFixtures = filteredMaleFixtures.length > 0;
  const hasFemaleFixtures = filteredFemaleFixtures.length > 0;
  const hasAnyFixtures = hasMaleFixtures || hasFemaleFixtures;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-8">
        <div className="flex items-center gap-6">
          <Link href="/sports" className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary uppercase">{sportName}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
              View registered teams, player names, and fixtures for {sportName}.
            </p>
          </div>
        </div>

        <div className="flex gap-4 p-1 bg-secondary/50 rounded-2xl">
          {["Teams", "Members", "Fixtures"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {tournamentOptions.length > 0 && (
        <section className="rounded-3xl border border-border bg-card/70 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Tournament</p>
            <h2 className="mt-1 text-xl font-black sport-heading text-foreground">Select Tournament</h2>
          </div>
          <select
            value={activeTournamentId}
            onChange={(event) => {
              setSelectedTournamentId(event.target.value);
              setExpandedTeamId(null);
            }}
            className="mt-4 h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-black text-foreground outline-none transition-colors focus:border-accent sm:mt-0 sm:max-w-sm"
          >
            {tournamentOptions.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
            ))}
          </select>
        </section>
      )}

      {/* Stats Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
              <Trophy size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Teams</p>
              <p className="text-xl font-black sport-heading">{stats.totalTeams}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Members</p>
              <p className="text-xl font-black sport-heading">{stats.totalMembers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Shield size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Male Teams</p>
              <p className="text-xl font-black sport-heading">{stats.maleTeams}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
              <ShieldOff size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Female Teams</p>
              <p className="text-xl font-black sport-heading">{stats.femaleTeams}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Male Members</p>
              <p className="text-xl font-black sport-heading">{stats.maleMembers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Female Members</p>
              <p className="text-xl font-black sport-heading">{stats.femaleMembers}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      {activeTab === "Teams" ? (
        <div className="space-y-10">
          {!hasAnyTeams ? (
            <div className="min-h-[300px] rounded-[2.5rem] bg-card/30 border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-16">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
                <Users size={40} className="text-slate-500" />
              </div>
              <h3 className="text-2xl font-black sport-heading text-foreground uppercase">No Teams Registered</h3>
              <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-muted-foreground">
                Registered {sportName} teams will appear here automatically.
              </p>
            </div>
          ) : (
            <>
              <div className="flex w-full max-w-sm gap-2 rounded-2xl border border-white/10 bg-secondary/50 p-1">
                {(["Male", "Female"] as const).map((categoryItem) => (
                  <button
                    key={categoryItem}
                    type="button"
                    onClick={() => {
                      setTeamCategory(categoryItem);
                      setExpandedTeamId(null);
                    }}
                    className={`h-11 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      teamCategory === categoryItem ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {categoryItem}
                  </button>
                ))}
              </div>

              <CategorySection label={`${teamCategory} Teams`} icon={teamCategory === "Male" ? Shield : ShieldOff}>
                {visibleTeams.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleTeams.map((team) => (
                      <TeamCard
                        key={team._id}
                        team={team}
                        expanded={expandedTeamId === team._id}
                        onToggle={() => setExpandedTeamId((current) => current === team._id ? null : team._id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground italic py-6 text-center border border-dashed border-white/10 rounded-xl">
                    No {teamCategory} teams registered yet.
                  </p>
                )}
              </CategorySection>
            </>
          )}
        </div>
      ) : activeTab === "Members" ? (
        <MembersListView members={allMembers} sportName={sportName} />
      ) : (
        <div className="space-y-10">
          {!hasAnyFixtures ? (
            <div className="min-h-[300px] rounded-[2.5rem] bg-card/30 border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-16">
              <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6">
                <Calendar size={40} className="text-slate-500" />
              </div>
              <h3 className="text-2xl font-black sport-heading text-foreground uppercase">No Fixtures Scheduled</h3>
              <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-muted-foreground">
                {sportName} fixtures will appear here once scheduled.
              </p>
            </div>
          ) : (
            <>
              {/* Male Fixtures */}
              <CategorySection label="Male Fixtures" icon={Shield}>
                {hasMaleFixtures ? (
                  <div className="space-y-3">
                    {filteredMaleFixtures.map((fixture) => (
                      <FixtureCard key={(fixture as Record<string, unknown>)._id as string || Math.random().toString()} fixture={fixture} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground italic py-6 text-center border border-dashed border-white/10 rounded-xl">
                    No Male fixtures scheduled yet.
                  </p>
                )}
              </CategorySection>

              {/* Female Fixtures */}
              <CategorySection label="Female Fixtures" icon={ShieldOff}>
                {hasFemaleFixtures ? (
                  <div className="space-y-3">
                    {filteredFemaleFixtures.map((fixture) => (
                      <FixtureCard key={(fixture as Record<string, unknown>)._id as string || Math.random().toString()} fixture={fixture} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground italic py-6 text-center border border-dashed border-white/10 rounded-xl">
                    No Female fixtures scheduled yet.
                  </p>
                )}
              </CategorySection>
            </>
          )}
        </div>
      )}
    </div>
  );
}
