"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, Search, Shield, ShieldOff, Trophy, User, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Team } from "@/lib/fixture-generator";
import { getVolunteerTeams, getTeamApprovedRegistrations, TeamRegistrationPayload } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getRoleAccount } from "@/lib/role-auth";

const allSportsLabel = "All Sports";

function normalizeSportValue(value?: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function getSportDisplayName(sportId?: string, sportName?: string) {
  const name = sportName?.trim();
  if (name) return name;
  return sportId || "Assigned sport";
}

function formatDate(value?: number) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CategorySection({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Icon size={14} />
        </div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent">{label}</h3>
      </div>
      {children}
    </div>
  );
}

export default function VolunteerTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedSport, setSelectedSport] = useState(allSportsLabel);
  const [activeTab, setActiveTab] = useState<"Teams" | "Members">("Teams");
  const [searchQuery, setSearchQuery] = useState("");
  const account = getRoleAccount();
  const assignedSport = normalizeSportValue(account?.assignedSport);
  const assignedSportName = getSportDisplayName(assignedSport, account?.assignedSportName);

  useEffect(() => {
    let isMounted = true;

    async function loadTeams() {
      const volunteerTeams = await getVolunteerTeams().catch(() => []);
      if (!isMounted) return;
      setTeams(
        volunteerTeams
          .map((team) => team as Team)
          .filter((team) => !assignedSport || team.sport === assignedSport)
          .sort((a, b) => `${a.sport}${a.name}`.localeCompare(`${b.sport}${b.name}`))
      );
    }

    void loadTeams();
    const interval = window.setInterval(loadTeams, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [assignedSport]);

  const sportOptions = useMemo(() => {
    const registeredSports = assignedSport ? [assignedSport] : [...new Set(teams.map((t) => t.sport))];
    return assignedSport ? registeredSports : [allSportsLabel, ...registeredSports];
  }, [assignedSport, teams]);

  const effectiveSelectedSport = assignedSport || selectedSport;

  const teamCountBySport = useMemo(() => {
    return teams.reduce((counts, team) => {
      counts[team.sport] = (counts[team.sport] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }, [teams]);

  const filteredTeams = teams.filter((team) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSport = effectiveSelectedSport === allSportsLabel || team.sport === effectiveSelectedSport;
    const matchesSearch =
      !query ||
      team.name.toLowerCase().includes(query) ||
      (team.department || "").toLowerCase().includes(query) ||
      (team.coachCaptain || "").toLowerCase().includes(query) ||
      (team.members || []).some((member) => String(member).toLowerCase().includes(query));

    return matchesSport && matchesSearch;
  });

  const maleTeams = filteredTeams.filter((t) => (t.category || "Male") === "Male");
  const femaleTeams = filteredTeams.filter((t) => (t.category || "Male") === "Female");

  const allMembers = filteredTeams.flatMap((team) =>
    (team.members || []).map((member, index) => ({
      member: String(member),
      teamName: team.name,
      department: team.department || team.name,
      sport: team.sport,
      sportName: team.sportName,
      category: team.category || "Male",
      registeredAt: team.playerRegisteredAt?.[index] || team.registeredAt,
    }))
  );

  const maleMembers = allMembers.filter((m) => m.category === "Male");
  const femaleMembers = allMembers.filter((m) => m.category === "Female");

  const totalMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const maleTeamsCount = teams.filter((t) => (t.category || "Male") === "Male").length;
  const femaleTeamsCount = teams.filter((t) => (t.category || "Male") === "Female").length;
  const maleMembersCount = teams.filter((t) => (t.category || "Male") === "Male").reduce((s, t) => s + (t.members?.length || 0), 0);
  const femaleMembersCount = teams.filter((t) => (t.category || "Male") === "Female").reduce((s, t) => s + (t.members?.length || 0), 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-foreground sport-heading">
            Teams & Members
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
            Look up registered teams, captains, contact numbers, and player names before or during a match.
          </p>
        </div>

        <div className="flex rounded-2xl border border-border bg-secondary/50 p-1">
          {["Teams", "Members"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "Teams" | "Members")}
              className={cn(
                "h-10 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Teams</p>
              <p className="text-xl font-black text-foreground">{teams.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
              <UsersRound size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Members</p>
              <p className="text-xl font-black text-foreground">{totalMembers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <Shield size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Male Teams</p>
              <p className="text-xl font-black text-foreground">{maleTeamsCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400">
              <ShieldOff size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Female Teams</p>
              <p className="text-xl font-black text-foreground">{femaleTeamsCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <User size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Male Members</p>
              <p className="text-xl font-black text-foreground">{maleMembersCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400">
              <User size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Female Members</p>
              <p className="text-xl font-black text-foreground">{femaleMembersCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 text-muted-foreground" size={16} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by team, department, captain, or member"
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
          />
        </div>

        <div className="relative w-full lg:w-72">
          <select
            value={selectedSport}
            onChange={(event) => setSelectedSport(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl border-2 border-accent bg-accent px-4 pr-11 text-[10px] font-black uppercase tracking-widest text-accent-foreground outline-none transition-all hover:brightness-95 focus:ring-2 focus:ring-accent/30"
          >
            {sportOptions.map((sport) => (
              <option key={sport} value={sport} className="bg-background text-foreground">
                {sport === allSportsLabel ? sport : `${sport === assignedSport ? assignedSportName : getSportDisplayName(sport)} (${teamCountBySport[sport] || 0})`}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-accent-foreground"
          />
        </div>
      </div>

      {activeTab === "Teams" ? (
        filteredTeams.length > 0 ? (
          <div className="space-y-8">
            <CategorySection label="Male Teams" icon={Shield}>
              {maleTeams.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {maleTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground italic py-4 text-center border border-dashed border-white/10 rounded-xl">
                  No Male teams found.
                </p>
              )}
            </CategorySection>

            <CategorySection label="Female Teams" icon={ShieldOff}>
              {femaleTeams.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {femaleTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground italic py-4 text-center border border-dashed border-white/10 rounded-xl">
                  No Female teams found.
                </p>
              )}
            </CategorySection>
          </div>
        ) : (
          <EmptyState label="No teams found" />
        )
      ) : allMembers.length > 0 ? (
        <div className="space-y-8">
          <CategorySection label="Male Members" icon={Shield}>
            {maleMembers.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {maleMembers.map((item, index) => (
                  <MemberCard key={`male-${item.teamName}-${item.member}-${index}`} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground italic py-4 text-center border border-dashed border-white/10 rounded-xl">
                No Male members found.
              </p>
            )}
          </CategorySection>

          <CategorySection label="Female Members" icon={ShieldOff}>
            {femaleMembers.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {femaleMembers.map((item, index) => (
                  <MemberCard key={`female-${item.teamName}-${item.member}-${index}`} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground italic py-4 text-center border border-dashed border-white/10 rounded-xl">
                No Female members found.
              </p>
            )}
          </CategorySection>
        </div>
      ) : (
        <EmptyState label="No members found" />
      )}
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-lg font-black uppercase text-accent">
          {team.name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black uppercase tracking-wide text-foreground">{team.name}</h2>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {getSportDisplayName(team.sport, team.sportName)} / {team.department || "Department"}
              </p>
            </div>
            <span className="w-fit rounded-full bg-secondary px-3 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {team.members?.length || 0} members
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-xs font-bold text-muted-foreground sm:grid-cols-2">
            <p>Captain: <span className="text-foreground">{team.coachCaptain || "Not listed"}</span></p>
            <p>Phone: <span className="text-foreground">{team.contactNumber || "Not listed"}</span></p>
            <p className="flex items-center gap-1.5">
              <Calendar size={13} />
              Registered: <span className="text-foreground">{formatDate(team.registeredAt)}</span>
            </p>
            {team.category && (
              <p>Category: <span className="text-foreground">{team.category}</span></p>
            )}
          </div>

          {team.members?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {team.members.slice(0, 6).map((member, index) => (
                <span key={`${team.id}-${member}-${index}`} className="rounded-lg bg-secondary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                  {String(member)}
                </span>
              ))}
              {team.members.length > 6 && (
                <span className="rounded-lg bg-accent/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-accent">
                  +{team.members.length - 6} more
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function MemberCard({ item }: { item: { member: string; teamName: string; department: string; sport: string; sportName?: string; category: string; registeredAt?: number } }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-accent">
          <User size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black uppercase tracking-wide text-foreground">{item.member}</p>
          <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {getSportDisplayName(item.sport, item.sportName)} / {item.department} / {item.teamName}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Calendar size={11} />
            {formatDate(item.registeredAt)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card/40 p-10 text-center">
      <UsersRound size={42} className="text-muted-foreground" />
      <h2 className="mt-5 text-2xl font-black uppercase tracking-wide text-foreground">{label}</h2>
      <p className="mt-2 max-w-md text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Registered teams and members will appear here automatically.
      </p>
    </div>
  );
}
