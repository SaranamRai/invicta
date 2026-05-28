"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { clearPortalAuth } from "@/lib/admin-auth";
import { auth, db } from "@/lib/firebase";
import { AdminOverview } from "@/components/admin/admin-overview";
import { TeamManager } from "@/components/admin/team-manager";
import { FixtureGenerator } from "@/components/admin/fixture-generator";
import { FixtureViewer } from "@/components/admin/fixture-viewer";
import { TournamentManager } from "@/components/admin/tournament-manager";
import { LeaderboardViewer } from "@/components/admin/leaderboard-viewer";
import { UsersViewer } from "@/components/admin/users-viewer";
import { Team, Fixture } from "@/lib/fixture-generator";
import { MatchData } from "@/lib/types";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type AdminTab =
  | "dashboard"
  | "teams"
  | "fixtures"
  | "schedule"
  | "tournaments"
  | "leaderboard"
  | "users";

const fixtureStatusToMatchStatus: Record<Fixture["status"], MatchData["status"]> = {
  scheduled: "Upcoming",
  live: "Live",
  completed: "Finished",
};

const matchStatusToFixtureStatus: Record<MatchData["status"], Fixture["status"]> = {
  Upcoming: "scheduled",
  Live: "live",
  Finished: "completed",
};

const fixtureToMatch = (fixture: Fixture, teams: Team[]): MatchData => {
  const teamA = teams.find((team) => team.id === fixture.teamA);
  const teamB = teams.find((team) => team.id === fixture.teamB);

  const match: MatchData = {
    id: fixture.id,
    teamA: teamA?.name || fixture.teamA,
    teamB: teamB?.name || fixture.teamB,
    sport: fixture.sport,
    type: "Inter-Department",
    scoreA: fixture.scoreA ?? 0,
    scoreB: fixture.scoreB ?? 0,
    status: fixtureStatusToMatchStatus[fixture.status],
    time: fixture.time,
    date: fixture.date,
    venue: fixture.venue,
    lastUpdated: Date.now(),
  };

  if (fixture.endedAt) {
    match.endedAt = new Date(fixture.endedAt).getTime();
  }

  return match;
};

const matchToFixture = (match: MatchData): Fixture => ({
  id: match.id,
  teamA: match.teamA,
  teamB: match.teamB,
  sport: match.sport,
  date: match.date || new Date(match.lastUpdated || Date.now()).toISOString().split("T")[0],
  time: match.time || "09:00",
  venue: match.venue || "Arena",
  status: matchStatusToFixtureStatus[match.status],
  scoreA: match.scoreA,
  scoreB: match.scoreB,
  endedAt: match.endedAt ? new Date(match.endedAt).toISOString() : undefined,
});

export default function AdminDashboard() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  useEffect(() => {
    const unsubscribeTeams = onSnapshot(collection(db, "teams"), (snapshot) => {
      setTeams(snapshot.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() } as Team)));
    });

    const unsubscribeMatches = onSnapshot(collection(db, "matches"), (snapshot) => {
      const nextFixtures = snapshot.docs.map((matchDoc) => {
        const match = { id: matchDoc.id, ...matchDoc.data() } as MatchData;
        return matchToFixture(match);
      });

      setFixtures(nextFixtures.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
    });

    return () => {
      unsubscribeTeams();
      unsubscribeMatches();
    };
  }, []);

  // Add team handler
  const handleAddTeam = async (team: Team) => {
    await setDoc(doc(db, "teams", team.id), team);
  };

  // Remove team handler
  const handleRemoveTeam = async (teamId: string) => {
    await deleteDoc(doc(db, "teams", teamId));
  };

  // Update team handler
  const handleUpdateTeam = async (updatedTeam: Team) => {
    await setDoc(doc(db, "teams", updatedTeam.id), updatedTeam, { merge: true });
  };

  // Recalculate team standings (wins/losses) based on completed fixtures
  const recalculateStandings = (allFixtures = fixtures) => {
    const updatedTeams = teams.map((team) => {
      let won = 0;
      let lost = 0;

      allFixtures.forEach((fix) => {
        if (
          fix.status === "completed" &&
          fix.scoreA !== undefined &&
          fix.scoreB !== undefined
        ) {
          const isTeamA = fix.teamA === team.id || fix.teamA === team.name;
          const isTeamB = fix.teamB === team.id || fix.teamB === team.name;

          if (isTeamA) {
            if (fix.scoreA > fix.scoreB) won++;
            else if (fix.scoreA < fix.scoreB) lost++;
          } else if (isTeamB) {
            if (fix.scoreB > fix.scoreA) won++;
            else if (fix.scoreB < fix.scoreA) lost++;
          }
        }
      });

      return {
        ...team,
        wins: won,
        losses: lost,
      };
    });

    updatedTeams.forEach((team) => {
      setDoc(doc(db, "teams", team.id), team, { merge: true });
    });
  };

  // Save fixtures to Firestore so user and volunteer dashboards update in real time.
  const handleGenerateFixtures = async (newFixtures: Fixture[]) => {
    await Promise.all(fixtures.map((fixture) => deleteDoc(doc(db, "matches", fixture.id))));
    await Promise.all(
      newFixtures.map((fixture) => setDoc(doc(db, "matches", fixture.id), fixtureToMatch(fixture, teams)))
    );
    if (newFixtures.length > 0) {
      await addDoc(collection(db, "notifications"), {
        title: "Fixtures Published",
        message: `${newFixtures.length} tournament fixture${newFixtures.length === 1 ? "" : "s"} published to the Match Center.`,
        timestamp: Date.now(),
        type: "info",
        href: "/matches",
      });
    }
    // Reset standings count
    recalculateStandings(newFixtures);
  };

  // Delete single fixture
  const handleDeleteFixture = async (fixtureId: string) => {
    await deleteDoc(doc(db, "matches", fixtureId));
    recalculateStandings(fixtures.filter((fixture) => fixture.id !== fixtureId));
  };

  // Update fixture handler
  const handleUpdateFixture = async (updatedFixture: Fixture) => {
    await setDoc(doc(db, "matches", updatedFixture.id), fixtureToMatch(updatedFixture, teams), { merge: true });
    recalculateStandings(fixtures.map((fixture) => fixture.id === updatedFixture.id ? updatedFixture : fixture));
  };

  const handleLogout = () => {
    clearPortalAuth();
    signOut(auth);
    router.replace("/login");
  };

  // Create team name lookup
  const teamNameLookup: Record<string, string> = {};
  teams.forEach((team) => {
    teamNameLookup[team.id] = team.name;
  });

  // Calculate teams count per sport category
  const teamsCountBySport = teams.reduce((acc, team) => {
    acc[team.sport] = (acc[team.sport] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="dashboard-surface min-h-screen bg-background text-foreground pb-12">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex h-16 w-48 shrink-0 items-center justify-start overflow-hidden sm:h-20 sm:w-60">
              <img
                src="/msu-logo-transparent.png"
                alt="Medhavi Skills University"
                className="h-auto w-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <h1 className="sport-heading text-2xl font-black sm:text-3xl">INVICTA ADMIN</h1>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                Tournament Control & Analytics Portal
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-500 transition-all hover:bg-red-500 hover:text-white active:scale-95 cursor-pointer sm:px-6"
            >
              <LogOut size={18} />
              <span className="text-xs font-black uppercase tracking-[0.2em]">
                Logout
              </span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-border flex">
          <div className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
            {[
              { id: "dashboard" as const, label: "Dashboard" },
              { id: "tournaments" as const, label: "Tournaments" },
              { id: "teams" as const, label: "Teams" },
              { id: "fixtures" as const, label: "Generator" },
              { id: "schedule" as const, label: "Schedule" },
              { id: "leaderboard" as const, label: "Leaderboard" },
              { id: "users" as const, label: "Users" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-4 text-xs font-black uppercase tracking-[0.1em] transition-all cursor-pointer sm:px-6 sm:text-sm ${
                  activeTab === tab.id
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === "dashboard" && (
          <AdminOverview
            teams={teams}
            fixtures={fixtures}
            setActiveTab={setActiveTab}
            onUpdateTeam={handleUpdateTeam}
          />
        )}

        {activeTab === "tournaments" && (
          <TournamentManager teamsCountBySport={teamsCountBySport} />
        )}

        {activeTab === "teams" && (
          <TeamManager
            teams={teams}
            onAddTeam={handleAddTeam}
            onRemoveTeam={handleRemoveTeam}
            onUpdateTeam={handleUpdateTeam}
          />
        )}

        {activeTab === "fixtures" && (
          <FixtureGenerator
            teams={teams}
            onGenerateFixtures={handleGenerateFixtures}
          />
        )}

        {activeTab === "schedule" && (
          <FixtureViewer
            fixtures={fixtures}
            teams={teamNameLookup}
            onDeleteFixture={handleDeleteFixture}
            onUpdateFixture={handleUpdateFixture}
          />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardViewer
            teams={teams}
            fixtures={fixtures}
            onRecalculate={() => recalculateStandings()}
          />
        )}

        {activeTab === "users" && <UsersViewer teams={teams} />}
      </div>
    </div>
  );
}
