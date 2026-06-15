"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AutomaticFixtureGenerator } from "@/components/admin/automatic-fixture-generator";
import { FixtureViewer } from "@/components/admin/fixture-viewer";
import { TournamentManager } from "@/components/admin/tournament-manager";
import { LeaderboardViewer } from "@/components/admin/leaderboard-viewer";
import { UsersViewer } from "@/components/admin/users-viewer";
import { RulesViewer } from "@/components/admin/rules-viewer";
import { Team, Fixture } from "@/lib/fixture-generator";
import { Download, LogOut, CheckCircle, XCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { InvictaLogo } from "@/components/invicta-logo";
import { GenderMark } from "@/components/gender-mark";
import { clearPortalSession, getRoleAccount } from "@/lib/role-auth";
import {
  deleteAdminFixture,
  getAdminFixtures,
  getAdminTeams,
  updateAdminFixture,
  updateAdminTeam,
  getAdminSports,
  getAdminTournaments,
  getTeamPendingRegistrations,
  getTeamApprovedRegistrations,
  approveTeamRegistration,
  rejectTeamRegistration,
  MongoSport,
  TeamRegistrationPayload,
  TournamentPayload,
  downloadApprovedRegistrationsExcel,
} from "@/lib/api";

type AdminTab =
  | "dashboard"
  | "teams"
  | "generate-fixtures"
  | "schedule"
  | "tournaments"
  | "leaderboard"
  | "rules"
  | "users"
  | "approvals";

function DownloadApprovedRegistrationsButton({ compact = false, filters }: { compact?: boolean; filters?: Record<string, string | undefined> }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDownload() {
    setIsDownloading(true);
    setMessage("");

    try {
      const filename = await downloadApprovedRegistrationsExcel(filters);
      setMessage(`Downloaded ${filename}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not download approved registrations.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className={`inline-flex items-center gap-2 rounded-xl bg-accent px-4 text-xs font-black uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60 ${compact ? "py-2" : "py-2.5"}`}
      >
        <Download size={compact ? 14 : 16} />
        {isDownloading ? "Downloading..." : compact ? "Export Excel" : "Download Approved Registrations (Excel)"}
      </button>
      {message && <p className="max-w-sm text-xs font-bold text-muted-foreground">{message}</p>}
    </div>
  );
}

function ApprovalsPanel() {
  const [registrations, setRegistrations] = useState<TeamRegistrationPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function loadRegistrations() {
    setLoading(true);
    try {
      const data = await getTeamPendingRegistrations();
      setRegistrations(data);
    } catch {
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveTeamRegistration(id);
      setActionMsg("Registration approved successfully.");
      loadRegistrations();
    } catch (error) {
      setActionMsg(error instanceof Error ? error.message : "Approval failed");
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    try {
      await rejectTeamRegistration(id, rejectReason.trim());
      setActionMsg("Registration rejected.");
      setRejectId(null);
      setRejectReason("");
      loadRegistrations();
    } catch (error) {
      setActionMsg(error instanceof Error ? error.message : "Rejection failed");
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="sport-heading text-2xl font-black text-foreground">Pending Approvals</h2>
          <p className="text-sm text-muted-foreground">Review and approve or reject team registrations.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadRegistrations}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground transition-colors hover:border-accent"
          >
            Refresh
          </button>
          <DownloadApprovedRegistrationsButton compact />
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-xs font-bold text-muted-foreground">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : registrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <CheckCircle size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-sm font-bold text-muted-foreground">No pending registrations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => (
            <div key={reg._id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-foreground">{reg.teamName}</h3>
                    <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-accent">{reg.sportName}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${reg.category === "Female" ? "bg-pink-500/10 text-pink-500" : "bg-blue-500/10 text-blue-500"}`}>
                      <GenderMark gender={reg.category} className="h-3.5 w-3.5" />
                      {reg.category}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {reg.department} &middot; Captain: {reg.captainName} ({reg.captainRegNo}) &middot; {reg.captainEmail}
                  </p>
                  {reg.members && reg.members.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {reg.members.map((m, i) => (
                        <span key={i} className="rounded-lg bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
                          {m.fullName} ({m.registrationNo})
                        </span>
                      ))}
                    </div>
                  )}
                  {reg.teamLogo && (
                    <div className="mt-2">
                      <img src={reg.teamLogo} alt="Team logo" className="h-12 w-12 rounded-lg object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    onClick={() => handleApprove(reg._id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-600"
                  >
                    <CheckCircle size={14} />
                    Approve
                  </button>
                  {rejectId === reg._id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason..."
                        className="h-9 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 outline-none placeholder:text-red-300"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleReject(reg._id)}
                          disabled={!rejectReason.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setRejectId(null); setRejectReason(""); }}
                          className="rounded-lg bg-secondary px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setRejectId(reg._id); setRejectReason(""); }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 transition-colors hover:bg-red-100"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ApprovedTeamsPanel() {
  const [registrations, setRegistrations] = useState<TeamRegistrationPayload[]>([]);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);
  const [sports, setSports] = useState<MongoSport[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  useEffect(() => {
    loadApprovedTeams();
  }, []);

  async function loadApprovedTeams() {
    setLoading(true);
    setMessage("");
    try {
      const [data, setupTournaments, setupSports] = await Promise.all([
        getTeamApprovedRegistrations(),
        getAdminTournaments().catch(() => []),
        getAdminSports().catch(() => []),
      ]);
      setRegistrations(data);
      setTournaments(setupTournaments);
      setSports(setupSports);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load approved teams.");
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }

  const tournamentOptions = Array.from(
    new Map(
      [
        ...tournaments.map((tournament) => [tournament._id || tournament.id || tournament.name, tournament.name] as const),
        ...registrations
          .filter((reg) => reg.tournamentId || reg.tournamentName)
          .map((reg) => [reg.tournamentId || reg.tournamentName, reg.tournamentName || "Tournament"] as const),
      ].filter(([id]) => Boolean(id))
    ).entries()
  );
  const registrationsInTournament = registrations.filter((reg) =>
    selectedTournament && (reg.tournamentId === selectedTournament || (!reg.tournamentId && reg.tournamentName === selectedTournament))
  );
  const sportOptions = Array.from(
    new Map(
      [
        ...registrationsInTournament.map((reg) => [reg.sportId, reg.sportName] as const),
        ...sports
          .filter((sport) => sport.status !== "inactive")
          .map((sport) => [sport._id, sport.sportName || sport.name || "Sport"] as const),
      ].filter(([id]) => Boolean(id))
    ).entries()
  );
  const teamOptions = registrations.filter((reg) => {
    const matchesTournament = selectedTournament && (reg.tournamentId === selectedTournament || (!reg.tournamentId && reg.tournamentName === selectedTournament));
    const matchesSport = selectedSport && reg.sportId === selectedSport;
    const matchesCategory = !selectedCategory || reg.category === selectedCategory;
    return matchesTournament && matchesSport && matchesCategory;
  });
  const visibleRegistrations = selectedTournament && selectedSport
    ? teamOptions.filter((reg) => !selectedTeam || reg._id === selectedTeam)
    : [];
  const exportFilters = {
    tournamentId: selectedTournament || undefined,
    sportId: selectedSport || undefined,
    category: selectedCategory || undefined,
    teamId: selectedTeam || undefined,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="sport-heading text-2xl font-black text-foreground">Approved Teams</h2>
          <p className="text-sm text-muted-foreground">Approved registrations appear here. Click a team to view its members and approval date.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadApprovedTeams}
            className="w-fit rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground transition-colors hover:border-accent"
          >
            Refresh
          </button>
          <DownloadApprovedRegistrationsButton compact filters={exportFilters} />
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">Tournament</p>
            <p className="text-sm font-semibold text-muted-foreground">Select tournament, then sport, then view approved teams.</p>
          </div>
          <select
            value={selectedTournament}
            onChange={(event) => {
              setSelectedTournament(event.target.value);
              setSelectedSport("");
              setSelectedCategory("");
              setSelectedTeam("");
              setExpandedTeamId(null);
            }}
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-black text-foreground outline-none focus:border-accent"
          >
            <option value="">{tournamentOptions.length ? "Select tournament..." : "No tournaments available"}</option>
            {tournamentOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={selectedSport}
            onChange={(event) => {
              setSelectedSport(event.target.value);
              setSelectedTeam("");
            }}
            disabled={!selectedTournament}
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-black text-foreground outline-none focus:border-accent disabled:opacity-50"
          >
            <option value="">{selectedTournament ? "Select sport..." : "Select tournament first"}</option>
            {sportOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(event) => {
              setSelectedCategory(event.target.value);
              setSelectedTeam("");
            }}
            disabled={!selectedTournament}
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-black text-foreground outline-none focus:border-accent disabled:opacity-50"
          >
            <option value="">All Categories</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select
            value={selectedTeam}
            onChange={(event) => setSelectedTeam(event.target.value)}
            disabled={!selectedTournament || !selectedSport}
            className="h-11 rounded-xl border border-border bg-background px-4 text-sm font-black text-foreground outline-none focus:border-accent disabled:opacity-50 lg:col-start-2"
          >
            <option value="">All Teams</option>
            {teamOptions.map((reg) => (
              <option key={reg._id} value={reg._id}>{reg.teamName}</option>
            ))}
          </select>
      </div>

      {message && (
        <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-xs font-bold text-muted-foreground">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : !selectedTournament ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <CheckCircle size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-sm font-bold text-muted-foreground">Please select a tournament.</p>
        </div>
      ) : !selectedSport ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <CheckCircle size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-sm font-bold text-muted-foreground">Please select a sport inside this tournament.</p>
        </div>
      ) : visibleRegistrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <CheckCircle size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-4 text-sm font-bold text-muted-foreground">No approved teams found for this tournament and sport</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleRegistrations.map((reg) => {
            const isExpanded = expandedTeamId === reg._id;
            return (
              <button
                key={reg._id}
                type="button"
                onClick={() => setExpandedTeamId(isExpanded ? null : reg._id)}
                aria-expanded={isExpanded}
                className="rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-accent hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {reg.teamLogo ? (
                    <img src={reg.teamLogo} alt="" className="h-14 w-14 rounded-xl border border-border bg-background object-contain" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-lg font-black uppercase text-accent">
                      {reg.teamName.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-black text-foreground">{reg.teamName}</h3>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-500">Approved</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {reg.sportName} / {reg.category} / {reg.department}
                    </p>
                    {reg.tournamentName && (
                      <p className="mt-1 text-xs font-semibold text-accent">{reg.tournamentName}</p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Captain: {reg.captainName} ({reg.captainRegNo})
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-accent">
                      Approved Date: {formatDate(reg.reviewedAt)}
                    </p>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      Members ({reg.members?.length || 0})
                    </p>
                    {reg.members && reg.members.length > 0 ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {reg.members.map((member, index) => (
                          <div key={`${reg._id}-${member.registrationNo}-${index}`} className="rounded-lg border border-border bg-secondary/60 px-3 py-2">
                            <p className="text-sm font-black text-foreground">{member.fullName}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                              {member.registrationNo} / {member.semester || "Semester N/A"} / {member.gender || reg.category}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm font-semibold text-muted-foreground">No members recorded for this team.</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const account = getRoleAccount();
  const canManageSetup = account?.role === "supercoordinator";
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>(canManageSetup ? "dashboard" : "users");

  useEffect(() => {
    let isMounted = true;

    async function loadAdminData() {
      try {
        const [nextTeams, nextFixtures] = await Promise.all([
          getAdminTeams(),
          getAdminFixtures(),
        ]);

        if (!isMounted) return;

        setTeams(nextTeams as Team[]);
        setFixtures(nextFixtures as Fixture[]);
      } catch (error) {
        console.error("Failed to load Mongo admin data:", error);
      }
    }

    void loadAdminData();

    return () => {
      isMounted = false;
    };
  }, []);

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
      void updateAdminTeam(team).catch((error) => console.error("Mongo standings update failed:", error));
    });
    setTeams(updatedTeams);
  };

  const handleAutomaticFixturesGenerated = async () => {
    const nextFixtures = await getAdminFixtures();
    setFixtures(nextFixtures as Fixture[]);
  };

  // Delete single fixture
  const handleDeleteFixture = async (fixtureId: string) => {
    await deleteAdminFixture(fixtureId);
    setFixtures((currentFixtures) => currentFixtures.filter((fixture) => fixture.id !== fixtureId));
    recalculateStandings(fixtures.filter((fixture) => fixture.id !== fixtureId));
  };

  // Update fixture handler
  const handleUpdateFixture = async (updatedFixture: Fixture) => {
    const savedFixture = await updateAdminFixture(updatedFixture);
    const nextFixtures = fixtures.map((fixture) => fixture.id === updatedFixture.id ? savedFixture as Fixture : fixture);
    setFixtures(nextFixtures);
    recalculateStandings(nextFixtures);
  };

  const handleLogout = () => {
    clearPortalSession();
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
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <InvictaLogo className="h-12 w-44 shrink-0 sm:h-16 sm:w-56" />
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="sport-heading text-lg font-black sm:text-3xl">
                {canManageSetup ? "INVICTA SUPERCOORDINATOR" : "INVICTA ADMIN"}
              </h1>
              <p className="max-w-2xl text-xs font-semibold leading-relaxed text-muted-foreground sm:text-sm">
                {canManageSetup
                  ? "Set up tournaments, add sport teams, publish fixtures, and manage sport-level coordinators and volunteers."
                  : "View system role accounts, coordinator hierarchy, volunteers, teams, fixtures, and tournament permissions."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="group relative flex items-center gap-1.5 overflow-hidden rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-500 transition-all hover:bg-red-500 hover:text-white active:scale-95 cursor-pointer sm:gap-2 sm:px-6 sm:py-3"
            >
              <LogOut size={16} className="sm:size-[18px]" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] sm:text-xs sm:tracking-[0.2em]">
                Sign Out
              </span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-border flex">
          <div className="mx-auto flex w-full max-w-7xl gap-0.5 overflow-x-auto px-3 sm:gap-1 sm:px-6">
            {(canManageSetup
              ? [
                  { id: "dashboard" as const, label: "Overview" },
                  { id: "tournaments" as const, label: "Sports Setup" },
                  { id: "teams" as const, label: "Approved Teams" },
                  { id: "generate-fixtures" as const, label: "Generate Fixtures" },
                  { id: "schedule" as const, label: "Match Schedule" },
                  { id: "leaderboard" as const, label: "League Tables" },
                  { id: "rules" as const, label: "Rules" },
                  { id: "users" as const, label: "System Users" },
                  { id: "approvals" as const, label: "Approvals" },
                ]
              : [
                  { id: "dashboard" as const, label: "Overview" },
                  { id: "schedule" as const, label: "Match Schedule" },
                  { id: "leaderboard" as const, label: "League Tables" },
                  { id: "rules" as const, label: "Rules" },
                  { id: "users" as const, label: "System Users" },
                ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[10px] font-black uppercase tracking-[0.08em] transition-all cursor-pointer sm:px-6 sm:py-4 sm:text-sm sm:tracking-[0.1em] ${
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
          <>
            {canManageSetup && (
              <div className="mb-6 flex justify-end">
                <DownloadApprovedRegistrationsButton />
              </div>
            )}
            <AdminOverview
              teams={teams}
              fixtures={fixtures}
              setActiveTab={setActiveTab}
              canManageSetup={canManageSetup}
            />
          </>
        )}

        {activeTab === "tournaments" && canManageSetup && (
          <TournamentManager teamsCountBySport={teamsCountBySport} />
        )}

        {activeTab === "teams" && canManageSetup && (
          <ApprovedTeamsPanel />
        )}

        {activeTab === "generate-fixtures" && canManageSetup && (
          <AutomaticFixtureGenerator
            fixtures={fixtures}
            onGenerated={handleAutomaticFixturesGenerated}
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

        {activeTab === "rules" && <RulesViewer />}

        {activeTab === "users" && (
          <UsersViewer
            teams={teams}
            canManageAccounts={canManageSetup}
            onTeamUpdated={(updatedTeam) => {
              setTeams((currentTeams) => currentTeams.map((team) => team.id === updatedTeam.id ? updatedTeam : team));
            }}
          />
        )}

        {activeTab === "approvals" && canManageSetup && (
          <ApprovalsPanel />
        )}
      </div>
    </div>
  );
}
