"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminOverview } from "@/components/admin/admin-overview";
import { TeamManager } from "@/components/admin/team-manager";
import { FixtureGenerator } from "@/components/admin/fixture-generator";
import { FixtureViewer } from "@/components/admin/fixture-viewer";
import { TournamentManager } from "@/components/admin/tournament-manager";
import { LeaderboardViewer } from "@/components/admin/leaderboard-viewer";
import { UsersViewer } from "@/components/admin/users-viewer";
import { RulesViewer } from "@/components/admin/rules-viewer";
import { Team, Fixture } from "@/lib/fixture-generator";
import { Download, LogOut, CheckCircle, XCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { clearPortalSession, getRoleAccount } from "@/lib/role-auth";
import { sports } from "@/lib/mock-data";
import {
  createAdminAnnouncement,
  createAdminTeam,
  deleteAdminFixture,
  deleteAdminTeam,
  getAdminFixtures,
  getAdminTeams,
  replaceAdminFixtures,
  updateAdminFixture,
  updateAdminTeam,
  getTeamPendingRegistrations,
  getTeamApprovedRegistrations,
  approveTeamRegistration,
  rejectTeamRegistration,
  TeamRegistrationPayload,
} from "@/lib/api";
import { getExportApprovedRegistrationsUrl } from "@/lib/api";

type AdminTab =
  | "dashboard"
  | "teams"
  | "fixtures"
  | "schedule"
  | "tournaments"
  | "leaderboard"
  | "rules"
  | "users"
  | "approvals";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSportName(sportId: string) {
  return sports.find((sport) => sport.id === sportId)?.name || sportId;
}

function getTeamName(teamId: string, teams: Team[]) {
  return teams.find((team) => team.id === teamId)?.name || teamId;
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
          <a
            href={getExportApprovedRegistrationsUrl()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-black uppercase tracking-widest text-accent-foreground"
          >
            <Download size={14} />
            Export Excel
          </a>
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
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{reg.category}</span>
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

function buildFixtureFlowchartDoc(fixtures: Fixture[], teams: Team[]) {
  const groupedFixtures = [...fixtures].sort((a, b) => `${a.date}${a.time}${a.sport}`.localeCompare(`${b.date}${b.time}${b.sport}`));
  const rows = groupedFixtures.map((fixture, index) => {
    const teamA = escapeHtml(getTeamName(fixture.teamA, teams));
    const teamB = escapeHtml(getTeamName(fixture.teamB, teams));
    const sport = escapeHtml(getSportName(fixture.sport));
    const venue = escapeHtml(fixture.venue);
    const date = escapeHtml(fixture.date);
    const time = escapeHtml(fixture.time);

    return `
      <tr>
        <td class="step">${index + 1}</td>
        <td>
          <div class="match-card">
            <div class="meta">${date} at ${time} | ${venue}</div>
            <div class="title">${teamA} vs ${teamB}</div>
            <div class="sport">${sport}</div>
          </div>
          ${index < groupedFixtures.length - 1 ? '<div class="connector">then</div>' : ""}
        </td>
      </tr>
    `;
  }).join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #111827; }
          h1 { color: #0f172a; margin-bottom: 4px; }
          .subtitle { color: #64748b; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 8px; }
          .step {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: #facc15;
            color: #0f172a;
            text-align: center;
            font-weight: bold;
            font-size: 18px;
          }
          .match-card {
            border: 2px solid #e2e8f0;
            border-left: 8px solid #facc15;
            border-radius: 10px;
            padding: 14px 16px;
            background: #f8fafc;
          }
          .meta { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; }
          .title { margin-top: 6px; font-size: 18px; font-weight: bold; color: #020617; }
          .sport { margin-top: 4px; font-size: 12px; font-weight: bold; color: #b45309; text-transform: uppercase; }
          .connector { margin: 8px 0 0 18px; color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>Invicta Fixture Flowchart</h1>
        <div class="subtitle">Generated schedule. Teams from the same department are not scheduled at the same date and time.</div>
        <table>${rows}</table>
      </body>
    </html>
  `;
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

  // Add team handler
  const handleAddTeam = async (team: Team) => {
    const savedTeam = await createAdminTeam(team);
    setTeams((currentTeams) => [savedTeam as Team, ...currentTeams]);
  };

  // Remove team handler
  const handleRemoveTeam = async (teamId: string) => {
    await deleteAdminTeam(teamId);
    setTeams((currentTeams) => currentTeams.filter((team) => team.id !== teamId));
    setFixtures((currentFixtures) => currentFixtures.filter((fixture) => fixture.teamA !== teamId && fixture.teamB !== teamId));
  };

  // Update team handler
  const handleUpdateTeam = async (updatedTeam: Team) => {
    const savedTeam = await updateAdminTeam(updatedTeam);
    setTeams((currentTeams) => currentTeams.map((team) => team.id === savedTeam.id ? savedTeam as Team : team));
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
      void updateAdminTeam(team).catch((error) => console.error("Mongo standings update failed:", error));
    });
    setTeams(updatedTeams);
  };

  // Save fixtures to Firestore so user and volunteer dashboards update in real time.
  const handleGenerateFixtures = async (newFixtures: Fixture[]) => {
    const savedFixtures = await replaceAdminFixtures(newFixtures);
    setFixtures(savedFixtures as Fixture[]);

    if (newFixtures.length > 0) {
      const scheduleDocumentHtml = buildFixtureFlowchartDoc(newFixtures, teams);

      await createAdminAnnouncement({
        title: "Fixtures Published",
        message: `${newFixtures.length} tournament fixture${newFixtures.length === 1 ? "" : "s"} published. Download the flowchart schedule from Announcements.`,
        visibleToPublic: true,
        attachmentName: "invicta-fixture-flowchart.doc",
        attachmentType: "application/msword",
        attachmentHtml: scheduleDocumentHtml,
      });
    }
    // Reset standings count
    recalculateStandings(newFixtures);
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
            <div className="dashboard-logo flex h-11 w-36 shrink-0 items-center justify-start overflow-hidden sm:h-20 sm:w-60">
              <img
                src="/msu-logo-transparent.png"
                alt="Medhavi Skills University"
                className="h-auto w-full max-w-full object-contain"
              />
            </div>
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
                  { id: "teams" as const, label: "Teams" },
                  { id: "fixtures" as const, label: "Create Fixtures" },
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
                <a
                  href={getExportApprovedRegistrationsUrl()}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  <Download size={16} />
                  Download Approved Registrations (Excel)
                </a>
              </div>
            )}
            <AdminOverview
              teams={teams}
              fixtures={fixtures}
              setActiveTab={setActiveTab}
              onUpdateTeam={handleUpdateTeam}
              canManageSetup={canManageSetup}
            />
          </>
        )}

        {activeTab === "tournaments" && canManageSetup && (
          <TournamentManager teamsCountBySport={teamsCountBySport} />
        )}

        {activeTab === "teams" && canManageSetup && (
          <TeamManager
            teams={teams}
            onAddTeam={handleAddTeam}
            onRemoveTeam={handleRemoveTeam}
            onUpdateTeam={handleUpdateTeam}
          />
        )}

        {activeTab === "fixtures" && canManageSetup && (
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

        {activeTab === "rules" && <RulesViewer />}

        {activeTab === "users" && <UsersViewer teams={teams} canManageAccounts={canManageSetup} />}

        {activeTab === "approvals" && canManageSetup && (
          <ApprovalsPanel />
        )}
      </div>
    </div>
  );
}
