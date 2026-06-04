"use client";

import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Calendar, ChevronDown, Search, Trophy, User, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { Team } from "@/lib/fixture-generator";
import { sports } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const allSportsLabel = "All Sports";

function formatDate(value?: number) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VolunteerTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedSport, setSelectedSport] = useState(allSportsLabel);
  const [activeTab, setActiveTab] = useState<"Teams" | "Members">("Teams");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "teams"), (snapshot) => {
      const nextTeams = snapshot.docs.map((teamDoc) => ({
        id: teamDoc.id,
        ...teamDoc.data(),
      } as Team));

      setTeams(nextTeams.sort((a, b) => `${a.sport}${a.name}`.localeCompare(`${b.sport}${b.name}`)));
    });

    return () => unsubscribe();
  }, []);

  const sportOptions = useMemo(() => {
    const registeredSports = sports.map((sport) => sport.id);
    return [allSportsLabel, ...registeredSports];
  }, []);

  const teamCountBySport = useMemo(() => {
    return teams.reduce((counts, team) => {
      counts[team.sport] = (counts[team.sport] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }, [teams]);

  const sportNameById = useMemo(
    () => Object.fromEntries(sports.map((sport) => [sport.id, sport.name])),
    []
  );

  const filteredTeams = teams.filter((team) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSport = selectedSport === allSportsLabel || team.sport === selectedSport;
    const matchesSearch =
      !query ||
      team.name.toLowerCase().includes(query) ||
      (team.department || "").toLowerCase().includes(query) ||
      (team.coachCaptain || "").toLowerCase().includes(query) ||
      (team.members || []).some((member) => member.toLowerCase().includes(query));

    return matchesSport && matchesSearch;
  });

  const members = filteredTeams.flatMap((team) =>
    (team.members || []).map((member, index) => ({
      member,
      teamName: team.name,
      department: team.department || team.name,
      sport: team.sport,
      registeredAt: team.playerRegisteredAt?.[index] || team.registeredAt,
    }))
  );

  const totalMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Trophy size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Registered Teams</p>
              <p className="text-3xl font-black text-foreground">{teams.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
              <UsersRound size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Members</p>
              <p className="text-3xl font-black text-foreground">{totalMembers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <UsersRound size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Currently Showing</p>
              <p className="text-3xl font-black text-foreground">{activeTab === "Teams" ? filteredTeams.length : members.length}</p>
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
                {sport === allSportsLabel ? sport : `${sportNameById[sport] || sport} (${teamCountBySport[sport] || 0})`}
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
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredTeams.map((team) => (
              <Card key={team.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-lg font-black uppercase text-accent">
                    {team.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black uppercase tracking-wide text-foreground">{team.name}</h2>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {sportNameById[team.sport] || team.sport} / {team.department || "Department"}
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
                    </div>

                    {team.members?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {team.members.slice(0, 6).map((member, index) => (
                          <span key={`${team.id}-${member}-${index}`} className="rounded-lg bg-secondary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
                            {member}
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
            ))}
          </div>
        ) : (
          <EmptyState label="No teams found" />
        )
      ) : members.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {members.map((item, index) => (
            <Card key={`${item.teamName}-${item.member}-${index}`} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-accent">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black uppercase tracking-wide text-foreground">{item.member}</p>
                  <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {sportNameById[item.sport] || item.sport} / {item.department} / {item.teamName}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <Calendar size={11} />
                    {formatDate(item.registeredAt)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState label="No members found" />
      )}
    </div>
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
