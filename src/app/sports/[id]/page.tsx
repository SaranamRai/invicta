"use client";

import React, { useEffect, useState } from "react";
import { sports } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Users, User, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { Team } from "@/lib/fixture-generator";
import { MatchData } from "@/lib/types";
import { getPublicFixtures, getPublicLiveScores, getPublicTeams, mapMongoFixture, mapMongoTeam } from "@/lib/api";


export default function SportDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const sport = sports.find((s) => s.id === params.id);
  const [activeTab, setActiveTab] = useState("Teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<MatchData[]>([]);

  useEffect(() => {
    if (!sport) return;
    const sportId = sport.id;
    let isMounted = true;

    async function loadTeams() {
      const publicTeams = await getPublicTeams();
      if (!isMounted) return;
      const nextTeams = publicTeams
        .map((team) => mapMongoTeam(team) as Team)
        .filter((team) => team.sport === sportId);

      setTeams(nextTeams.sort((a, b) => a.name.localeCompare(b.name)));
    }

    void loadTeams();
    const interval = window.setInterval(loadTeams, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [sport]);

  useEffect(() => {
    if (!sport) return;
    const sportId = sport.id;
    let isMounted = true;

    async function loadFixtures() {
      const [publicFixtures, liveScores] = await Promise.all([getPublicFixtures(), getPublicLiveScores()]);
      if (!isMounted) return;
      const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
      const nextFixtures = publicFixtures
        .map((fixture) => mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData)
        .filter((fixture) => fixture.sport === sportId);

      setFixtures(nextFixtures.sort((a, b) => `${a.date || ""}${a.time || ""}`.localeCompare(`${b.date || ""}${b.time || ""}`)));
    }

    void loadFixtures();
    const interval = window.setInterval(loadFixtures, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [sport]);


  if (!sport) return <div className="p-20 text-center font-black">Sport Not Found</div>;

  const totalMembers = teams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const allMembers = teams.flatMap((team) =>
    (team.members || []).map((member) => ({
      member,
      teamName: team.name,
      department: team.department || team.name,
    }))
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-8">
        <div className="flex items-center gap-6">
          <Link href="/sports" className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary uppercase">{sport.name}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
              View registered teams, player names, and fixtures for {sport.name}.
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

      {/* Stats Summary */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registered Teams</p>
              <p className="text-2xl font-black sport-heading">{teams.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Members</p>
              <p className="text-2xl font-black sport-heading">{totalMembers}</p>
            </div>
          </div>
        </Card>
      </div>


      {/* Main Content */}
      {activeTab === "Teams" ? (
        teams.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-lg font-black uppercase text-accent">
                    {team.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black uppercase tracking-wide text-foreground">{team.name}</h3>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {team.department || "Department"}
                    </p>
                    <p className="mt-3 text-xs font-bold text-muted-foreground">
                      {team.members?.length || 0} registered member{team.members?.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState activeTab={activeTab} sportName={sport.name} />
        )
      ) : activeTab === "Members" ? (
        allMembers.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allMembers.map((item, index) => (
              <Card key={`${item.teamName}-${item.member}-${index}`} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase tracking-wide text-foreground">{item.member}</p>
                    <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {item.department} / {item.teamName}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState activeTab={activeTab} sportName={sport.name} />
        )
      ) : fixtures.length > 0 ? (
        <div className="space-y-4">
          {fixtures.map((fixture) => (
            <Card key={fixture.id} className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent/15 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-accent">
                      {fixture.status}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {fixture.date || "Date TBD"} / {fixture.time || "Time TBD"}
                    </span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-wide text-foreground">
                    {fixture.teamA} <span className="text-accent">VS</span> {fixture.teamB}
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {fixture.venue || "Venue TBD"}
                  </p>
                </div>
                <Link
                  href="/matches"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-secondary px-5 text-[10px] font-black uppercase tracking-widest text-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  View All Matches
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState activeTab={activeTab} sportName={sport.name} />
      )}
    </div>
  );
}

function EmptyState({ activeTab, sportName }: { activeTab: string; sportName: string }) {
  return (
    <div className="min-h-[400px] rounded-[2.5rem] bg-card/30 border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-20">
      <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center mb-8">
        {activeTab === "Teams" ? <Users size={48} className="text-slate-500" /> : <User size={48} className="text-slate-500" />}
      </div>
      <h3 className="text-3xl font-black sport-heading text-foreground uppercase">No {activeTab} Registered</h3>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-muted-foreground">
        Registered {sportName} {activeTab.toLowerCase()} will appear here automatically.
      </p>
    </div>
  );
}
