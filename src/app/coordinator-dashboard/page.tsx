"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle, ClipboardList, FileUp, LogOut, Megaphone, Send, ShieldCheck, Shield, ShieldOff, Table2, Trophy, UserPlus, UsersRound } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { InvictaLogo } from "@/components/invicta-logo";
import { Team } from "@/lib/fixture-generator";
import {
  AdminFixturePayload,
  CoordinatorPointsTablePayload,
  CoordinatorVolunteerPayload,
  MongoAnnouncement,
  assignCoordinatorFixtureVolunteer,
  createCoordinatorRule,
  createCoordinatorVolunteer,
  getCoordinatorAnnouncements,
  getCoordinatorFixtures,
  getCoordinatorPointsTable,
  getCoordinatorTeams,
  getCoordinatorVolunteers,
  getTeamApprovedRegistrations,
  TeamRegistrationPayload,
} from "@/lib/api";
import { clearPortalSession, getRoleAccount, RoleAccount } from "@/lib/role-auth";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function normalizeSportValue(value?: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function getSportDisplayName(sportId?: string, sportName?: string) {
  const name = sportName?.trim();
  if (name) return name;
  return sportId || "Assigned sport";
}

function CoordinatorDashboardContent() {
  const router = useRouter();
  const [account] = useState<RoleAccount | null>(() => getRoleAccount());
  const assignedSport = normalizeSportValue(account?.assignedSport);
  const assignedSportName = getSportDisplayName(assignedSport, account?.assignedSportName);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<AdminFixturePayload[]>([]);
  const [leagueTable, setLeagueTable] = useState<CoordinatorPointsTablePayload[]>([]);
  const [announcements, setAnnouncements] = useState<MongoAnnouncement[]>([]);
  const [ruleSport, setRuleSport] = useState(assignedSport || "football");
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleAttachment, setRuleAttachment] = useState<File | null>(null);
  const [isPublishingRule, setIsPublishingRule] = useState(false);
  const [volunteers, setVolunteers] = useState<CoordinatorVolunteerPayload[]>([]);
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerEmail, setVolunteerEmail] = useState("");
  const [volunteerPassword, setVolunteerPassword] = useState("1234");
  const [volunteerRegistrationNumber, setVolunteerRegistrationNumber] = useState("");
  const [volunteerPhone, setVolunteerPhone] = useState("");
  const [volunteerMessage, setVolunteerMessage] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assigningFixtureId, setAssigningFixtureId] = useState<string | null>(null);
  const [isCreatingVolunteer, setIsCreatingVolunteer] = useState(false);
  const availableRuleSports = useMemo(() => {
    return [
      {
        id: assignedSport || account?.assignedSport || "football",
        name: getSportDisplayName(assignedSport, account?.assignedSportName),
      },
    ];
  }, [account?.assignedSportName, assignedSport]);

  const effectiveRuleSport = availableRuleSports.some((sport) => sport.id === ruleSport)
    ? ruleSport
    : (availableRuleSports[0]?.id || "football");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      const [coordinatorTeams, coordinatorVolunteers, coordinatorFixtures, coordinatorLeagueTable, coordinatorAnnouncements] = await Promise.all([
        getCoordinatorTeams().catch(() => []),
        getCoordinatorVolunteers().catch(() => []),
        getCoordinatorFixtures().catch(() => []),
        getCoordinatorPointsTable().catch(() => []),
        getCoordinatorAnnouncements().catch(() => []),
      ]);
      if (!isMounted) return;
      setTeams(coordinatorTeams as Team[]);
      setVolunteers(coordinatorVolunteers);
      setFixtures(coordinatorFixtures);
      setLeagueTable(coordinatorLeagueTable);
      setAnnouncements(coordinatorAnnouncements);
    }

    void loadDashboardData();
    const interval = window.setInterval(loadDashboardData, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const assignedTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSport = !assignedSport || normalizeSportValue(team.sport) === assignedSport;
      return matchesSport;
    });
  }, [assignedSport, teams]);

  const totalPlayers = assignedTeams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const assignedFixtureCount = fixtures.filter((fixture) => fixture.assignedVolunteer).length;

  const formatAnnouncementDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  const handleSignOut = async () => {
    clearPortalSession();
    router.replace("/login");
  };

  const handlePublishRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = ruleTitle.trim();
    const description = ruleDescription.trim();
    const selectedSport = availableRuleSports.find((sport) => sport.id === effectiveRuleSport);

    if (!title || !description || !selectedSport) {
      return;
    }

    setIsPublishingRule(true);

    try {
      let attachment:
        | {
            attachmentData: string;
            attachmentName: string;
            attachmentType: string;
            attachmentKind: "document" | "image";
          }
        | Record<string, never> = {};

      if (ruleAttachment) {
        attachment = {
          attachmentData: await readFileAsDataUrl(ruleAttachment),
          attachmentName: ruleAttachment.name,
          attachmentType: ruleAttachment.type || "application/octet-stream",
          attachmentKind: ruleAttachment.type.startsWith("image/") ? "image" : "document",
        };
      }

      await createCoordinatorRule({
        title,
        description,
        sport: selectedSport.id,
        sportName: selectedSport.name,
        ...attachment,
      });

      setRuleTitle("");
      setRuleDescription("");
      setRuleAttachment(null);
      event.currentTarget.reset();
    } finally {
      setIsPublishingRule(false);
    }
  };

  const handleCreateVolunteer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVolunteerMessage("");

    const name = volunteerName.trim();
    const email = volunteerEmail.trim().toLowerCase();
    const password = volunteerPassword.trim();
    const registrationNumber = volunteerRegistrationNumber.trim();
    const phone = volunteerPhone.trim();

    if (!name || !email || !password || !registrationNumber || !phone) {
      setVolunteerMessage("Name, email, password, registration number, and mobile number are required.");
      return;
    }

    setIsCreatingVolunteer(true);

    try {
      await createCoordinatorVolunteer({
        name,
        email,
        password,
        assignedSport: assignedSport || account?.assignedSport || "football",
        registrationNumber,
        phone,
      });
      setVolunteerName("");
      setVolunteerEmail("");
      setVolunteerPassword("1234");
      setVolunteerRegistrationNumber("");
      setVolunteerPhone("");
      setVolunteers(await getCoordinatorVolunteers().catch(() => []));
      setVolunteerMessage("Volunteer added for your sport.");
    } catch (error) {
      setVolunteerMessage(error instanceof Error ? error.message : "Could not add volunteer.");
    } finally {
      setIsCreatingVolunteer(false);
    }
  };

  const handleAssignVolunteer = async (fixtureId: string, volunteerId: string) => {
    if (!volunteerId) return;

    setAssignmentMessage("");
    setAssigningFixtureId(fixtureId);

    try {
      const updated = await assignCoordinatorFixtureVolunteer(fixtureId, volunteerId);
      setFixtures((currentFixtures) =>
        currentFixtures.map((fixture) =>
          fixture.id === fixtureId ? { ...fixture, assignedVolunteer: updated.assignedVolunteer } : fixture
        )
      );
      setAssignmentMessage("Volunteer duty assigned.");
    } catch (error) {
      setAssignmentMessage(error instanceof Error ? error.message : "Could not assign volunteer.");
    } finally {
      setAssigningFixtureId(null);
    }
  };

  return (
    <div className="dashboard-surface min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <InvictaLogo className="h-12 w-44 shrink-0 sm:h-14 sm:w-52" />
            <div className="min-w-0">
              <h1 className="sport-heading text-lg font-black sm:text-2xl">Coordinator Dashboard</h1>
              <p className="max-w-2xl text-xs font-semibold leading-relaxed text-muted-foreground sm:text-sm">
                Manage your assigned department or sport teams, review fixtures, and prepare team details for admin approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white sm:gap-2 sm:px-4 sm:py-3 sm:text-xs"
            >
              <LogOut size={14} className="sm:size-[16px]" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-accent">
                <ShieldCheck size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Assigned Role</span>
              </div>
              <h2 className="sport-heading text-2xl font-black">{account?.name || "Coordinator"}</h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Department: {account?.department || "All assigned departments"} / Sport: {assignedSport ? assignedSportName : "All assigned sports"}
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-xs font-black uppercase tracking-widest text-accent-foreground"
            >
              <ClipboardList size={16} />
              Add Department Team
            </Link>
          </div>
        </section>

        <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Trophy} label="Teams" value={assignedTeams.length} />
          <StatCard icon={UsersRound} label="Players" value={totalPlayers} />
          <StatCard icon={UsersRound} label="Volunteers" value={volunteers.length} />
          <StatCard icon={Shield} label="Male Teams" value={assignedTeams.filter((t) => (t.category || "Male") === "Male").length} color="blue" />
          <StatCard icon={ShieldOff} label="Female Teams" value={assignedTeams.filter((t) => (t.category || "Male") === "Female").length} color="pink" />
          <StatCard icon={UsersRound} label="Total Members" value={totalPlayers} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="p-0">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-accent">
                  <Table2 size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">League Table</span>
                </div>
                <h2 className="sport-heading text-xl font-black">Match League Table</h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground">Standings for your assigned sport.</p>
              </div>
              <Link href="/standings" className="w-fit rounded-xl bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-accent">
                Full standings
              </Link>
            </div>

            {leagueTable.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Played</th>
                      <th className="px-4 py-3">W</th>
                      <th className="px-4 py-3">D</th>
                      <th className="px-4 py-3">L</th>
                      <th className="px-4 py-3">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leagueTable.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-4 text-xs font-black text-accent">#{entry.rank}</td>
                        <td className="px-4 py-4 font-black uppercase tracking-wide text-foreground">{entry.department}</td>
                        <td className="px-4 py-4 text-xs font-bold text-muted-foreground">{entry.matchesPlayed}</td>
                        <td className="px-4 py-4 text-xs font-bold text-emerald-500">{entry.wins}</td>
                        <td className="px-4 py-4 text-xs font-bold text-muted-foreground">{entry.draws}</td>
                        <td className="px-4 py-4 text-xs font-bold text-red-500">{entry.losses}</td>
                        <td className="px-4 py-4 text-sm font-black text-foreground">{entry.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm font-semibold text-muted-foreground">
                No league table entries are available for your sport yet.
              </div>
            )}
          </Card>

          <Card className="p-0">
            <div className="border-b border-border p-5">
              <div className="mb-2 flex items-center gap-2 text-accent">
                <Megaphone size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Announcements</span>
              </div>
              <h2 className="sport-heading text-xl font-black">Latest Announcements</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Public notices related to your sport.</p>
            </div>

            <div className="divide-y divide-border">
              {announcements.length > 0 ? announcements.slice(0, 5).map((announcement) => (
                <div key={announcement._id} className="p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wide text-foreground">{announcement.title}</h3>
                    {announcement.createdAt && (
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {formatAnnouncementDate(announcement.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{announcement.message}</p>
                  {announcement.attachmentName && (
                    <span className="mt-3 inline-block rounded-lg bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {announcement.attachmentName}
                    </span>
                  )}
                </div>
              )) : (
                <div className="p-8 text-center text-sm font-semibold text-muted-foreground">
                  No announcements are available for your sport yet.
                </div>
              )}
            </div>
          </Card>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="sport-heading text-xl font-black">Assign Match Duties</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Assign volunteers to fixtures for your sport. Volunteers can update only assigned matches.
              </p>
            </div>
            <span className="w-fit rounded-xl bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {assignedFixtureCount}/{fixtures.length} assigned
            </span>
          </div>

          {assignmentMessage && (
            <div className="mb-4 rounded-xl border border-border bg-secondary px-4 py-3 text-xs font-bold text-muted-foreground">
              {assignmentMessage}
            </div>
          )}

          {fixtures.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Fixture</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Venue</th>
                    <th className="px-4 py-3">Volunteer Duty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fixtures.map((fixture) => {
                    const assignedVolunteer = volunteers.find((volunteer) => volunteer.id === fixture.assignedVolunteer);
                    return (
                      <tr key={fixture.id}>
                        <td className="px-4 py-4">
                          <p className="font-black uppercase tracking-wide text-foreground">
                            {fixture.teamAName || "Team A"} vs {fixture.teamBName || "Team B"}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{fixture.sportName || fixture.sport}</p>
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-muted-foreground">
                          {fixture.date || "Date TBD"} / {fixture.time || "Time TBD"}
                        </td>
                        <td className="px-4 py-4 text-xs font-bold text-muted-foreground">{fixture.venue || "Venue TBD"}</td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                            <select
                              value={fixture.assignedVolunteer || ""}
                              onChange={(event) => handleAssignVolunteer(fixture.id, event.target.value)}
                              disabled={assigningFixtureId === fixture.id || volunteers.length === 0}
                              className="h-11 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:border-accent disabled:opacity-50"
                            >
                              <option value="">Select volunteer</option>
                              {volunteers.map((volunteer) => (
                                <option key={volunteer.id} value={volunteer.id}>
                                  {volunteer.name} / {volunteer.registrationNumber || volunteer.email}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              {assigningFixtureId === fixture.id ? "Saving..." : assignedVolunteer ? "Assigned" : "Pending"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-semibold text-muted-foreground">
              No fixtures are available for your sport yet.
            </div>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-0">
            <div className="border-b border-border p-5">
              <h2 className="sport-heading text-xl font-black">Assigned Teams</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Teams matching your assigned department or sport appear here.</p>
            </div>
            {assignedTeams.length > 0 ? (
              <div className="p-5 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 border-b border-white/10 pb-2">
                    <Shield size={14} />
                    <span className="text-xs font-black uppercase tracking-widest">Male Teams ({assignedTeams.filter((t) => (t.category || "Male") === "Male").length})</span>
                  </div>
                  {assignedTeams.filter((t) => (t.category || "Male") === "Male").length > 0 ? (
                    <div className="space-y-2">
                      {assignedTeams.filter((t) => (t.category || "Male") === "Male").map((team) => (
                        <div key={team.id} className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black uppercase tracking-wide text-foreground">{team.name}</p>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {getSportDisplayName(team.sport, team.sportName)} / {team.department || "Department"}
                            </p>
                          </div>
                          <span className="w-fit rounded-lg bg-secondary px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            {team.members?.length || 0} players
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-muted-foreground italic py-2">No Male teams assigned yet.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-pink-400 border-b border-white/10 pb-2">
                    <ShieldOff size={14} />
                    <span className="text-xs font-black uppercase tracking-widest">Female Teams ({assignedTeams.filter((t) => (t.category || "Male") === "Female").length})</span>
                  </div>
                  {assignedTeams.filter((t) => (t.category || "Male") === "Female").length > 0 ? (
                    <div className="space-y-2">
                      {assignedTeams.filter((t) => (t.category || "Male") === "Female").map((team) => (
                        <div key={team.id} className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black uppercase tracking-wide text-foreground">{team.name}</p>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {getSportDisplayName(team.sport, team.sportName)} / {team.department || "Department"}
                            </p>
                          </div>
                          <span className="w-fit rounded-lg bg-secondary px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            {team.members?.length || 0} players
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-muted-foreground italic py-2">No Female teams assigned yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-muted-foreground">No teams found for your assignment yet.</p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="sport-heading text-xl font-black">Coordinator Tasks</h2>
            <div className="mt-4 space-y-3">
              <TaskLink href="/register" label="Submit or update team list" />
              <TaskLink href="/matches" label="View fixtures and match timing" />
              <TaskLink href="/sports" label="Review teams by sport" />
              <TaskLink href="/standings" label="Check approval impact on standings" />
            </div>
          </Card>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5">
            <h2 className="sport-heading text-xl font-black">Approved Team Registrations</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Approved teams across all sports visible to your role.</p>
          </div>
          <ApprovedTeamsView assignedSport={assignedSport} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <BookOpen size={21} />
            </div>
            <div>
              <h2 className="sport-heading text-xl font-black">Publish Sport Rules</h2>
              <p className="text-sm font-medium text-muted-foreground">
                Add rules for a sport. Admins and public visitors will see them in the Rules section.
              </p>
            </div>
          </div>

          <form onSubmit={handlePublishRule} className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sport</label>
              <select
                value={effectiveRuleSport}
                onChange={(event) => setRuleSport(event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
              >
                {availableRuleSports.map((sport) => (
                  <option key={sport.id} value={sport.id}>{sport.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rule Title</label>
              <input
                type="text"
                value={ruleTitle}
                onChange={(event) => setRuleTitle(event.target.value)}
                placeholder="Example: Match format and scoring"
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rules</label>
              <textarea
                value={ruleDescription}
                onChange={(event) => setRuleDescription(event.target.value)}
                placeholder="Write eligibility, scoring, duration, substitutions, penalties, or any sport-specific instructions."
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attachment</label>
              <label className="flex min-h-16 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-border bg-background px-4 py-3 transition-colors hover:border-accent sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="flex min-w-0 items-center gap-3">
                  <FileUp size={20} className="shrink-0 text-accent" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {ruleAttachment?.name || "Attach Word, PDF, JPG, or PNG"}
                    </span>
                    <span className="block text-xs font-medium text-muted-foreground">
                      Accepted: .doc, .docx, .pdf, .jpg, .jpeg, .png
                    </span>
                  </span>
                </span>
                <span className="mt-3 w-fit rounded-lg bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:mt-0">
                  Choose File
                </span>
                <input
                  type="file"
                  accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/jpeg,image/png"
                  onChange={(event) => setRuleAttachment(event.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={isPublishingRule || !ruleTitle.trim() || !ruleDescription.trim()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-xs font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} />
                {isPublishingRule ? "Publishing..." : "Publish Rule"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <UserPlus size={21} />
            </div>
            <div>
              <h2 className="sport-heading text-xl font-black">Add Sport Volunteers</h2>
              <p className="text-sm font-medium text-muted-foreground">
                Volunteers created here inherit your sport access only.
              </p>
            </div>
          </div>

          {volunteerMessage && (
            <div className="mb-4 rounded-xl border border-border bg-secondary px-4 py-3 text-xs font-bold text-muted-foreground">
              {volunteerMessage}
            </div>
          )}

          <form onSubmit={handleCreateVolunteer} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_170px_170px_130px_auto]">
            <input
              type="text"
              value={volunteerName}
              onChange={(event) => setVolunteerName(event.target.value)}
              placeholder="Volunteer name"
              className="h-12 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
            />
            <input
              type="email"
              value={volunteerEmail}
              onChange={(event) => setVolunteerEmail(event.target.value)}
              placeholder={assignedSport ? `volunteer${assignedSport}@gmail.com` : "volunteer@gmail.com"}
              className="h-12 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
            />
            <input
              type="text"
              value={volunteerRegistrationNumber}
              onChange={(event) => setVolunteerRegistrationNumber(event.target.value)}
              placeholder="Registration no"
              className="h-12 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
            />
            <input
              type="tel"
              value={volunteerPhone}
              onChange={(event) => setVolunteerPhone(event.target.value)}
              placeholder="Mobile no"
              className="h-12 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
            />
            <input
              type="text"
              value={volunteerPassword}
              onChange={(event) => setVolunteerPassword(event.target.value)}
              placeholder="1234"
              className="h-12 rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
            />
            <button
              type="submit"
              disabled={isCreatingVolunteer || !assignedSport}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-xs font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus size={16} />
              {isCreatingVolunteer ? "Adding..." : "Add Volunteer"}
            </button>
          </form>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border">
            <div className="border-b border-border bg-secondary px-4 py-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Volunteers Under This Sport</h3>
            </div>
            {volunteers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Registration No</th>
                      <th className="px-4 py-3">Mobile No</th>
                      <th className="px-4 py-3">Sport</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {volunteers.map((volunteer) => (
                      <tr key={volunteer.id}>
                        <td className="px-4 py-4 font-black uppercase tracking-wide text-foreground">{volunteer.name}</td>
                        <td className="px-4 py-4 font-mono text-xs font-semibold text-muted-foreground">{volunteer.email}</td>
                        <td className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-foreground">{volunteer.registrationNumber || "Not added"}</td>
                        <td className="px-4 py-4 text-xs font-bold text-foreground">{volunteer.phone || "Not added"}</td>
                        <td className="px-4 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
                          {getSportDisplayName(volunteer.assignedSport, volunteer.assignedSportName)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm font-semibold text-muted-foreground">
                No volunteers have been added for this sport yet.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color?: string }) {
  const bgClass = color === "blue" ? "bg-blue-500/15 text-blue-400" : color === "pink" ? "bg-pink-500/15 text-pink-400" : "bg-accent/15 text-accent";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={"flex h-10 w-10 items-center justify-center rounded-xl shrink-0 " + bgClass}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="text-xl font-black text-foreground">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function ApprovedTeamsView({ assignedSport }: { assignedSport: string }) {
  const [registrations, setRegistrations] = useState<TeamRegistrationPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState("all");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getTeamApprovedRegistrations();
        if (!mounted) return;
        const filtered = assignedSport
          ? data.filter((r) => r.sportId === assignedSport || r.sportName.toLowerCase().replace(/\s+/g, "-") === assignedSport)
          : data;
        setRegistrations(filtered);
      } catch {
        if (mounted) setRegistrations([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [assignedSport]);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }

  if (registrations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <CheckCircle size={32} className="mx-auto text-muted-foreground/40" />
        <p className="mt-3 text-sm font-semibold text-muted-foreground">No approved registrations found for your assigned sport.</p>
      </div>
    );
  }

  const tournamentOptions = Array.from(
    new Map(
      registrations
        .filter((reg) => reg.tournamentId || reg.tournamentName)
        .map((reg) => [reg.tournamentId || reg.tournamentName, reg.tournamentName || "Tournament"])
    ).entries()
  );
  const visibleRegistrations = selectedTournament === "all"
    ? registrations
    : registrations.filter((reg) => reg.tournamentId === selectedTournament || (!reg.tournamentId && reg.tournamentName === selectedTournament));

  const maleRegs = visibleRegistrations.filter((r) => r.category === "Male");
  const femaleRegs = visibleRegistrations.filter((r) => r.category === "Female");

  function RegCard({ reg }: { reg: TeamRegistrationPayload }) {
    const isExpanded = expandedTeamId === reg._id;
    return (
      <button
        type="button"
        onClick={() => setExpandedTeamId(isExpanded ? null : reg._id)}
        aria-expanded={isExpanded}
        className="w-full rounded-xl border border-border bg-secondary/30 p-4 text-left transition-colors hover:border-accent"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-black text-foreground">{reg.teamName}</h4>
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-accent">{reg.sportName}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{reg.category}</span>
        </div>
        {reg.tournamentName && <p className="mt-1 text-xs font-bold text-accent">{reg.tournamentName}</p>}
        <p className="mt-1 text-xs font-semibold text-muted-foreground">{reg.department} &middot; Captain: {reg.captainName}</p>
        {isExpanded && (
          <div className="mt-3 border-t border-border pt-3">
            {reg.members && reg.members.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {reg.members.map((m, i) => (
                  <span key={`${reg._id}-${m.registrationNo}-${i}`} className="rounded-md bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground">
                    {m.fullName} {m.registrationNo ? `(${m.registrationNo})` : ""}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-muted-foreground">No members recorded for this team.</p>
            )}
          </div>
        )}
        {reg.teamLogo && (
          <img src={reg.teamLogo} alt="" className="mt-2 h-10 w-10 rounded-lg object-cover" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-5 max-h-96 overflow-y-auto">
      {tournamentOptions.length > 0 && (
        <select
          value={selectedTournament}
          onChange={(event) => {
            setSelectedTournament(event.target.value);
            setExpandedTeamId(null);
          }}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-black text-foreground outline-none focus:border-accent"
        >
          <option value="all">All Tournaments</option>
          {tournamentOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      )}
      {maleRegs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-400 border-b border-white/10 pb-1.5">
            <Shield size={14} />
            <span className="text-xs font-black uppercase tracking-widest">Male ({maleRegs.length})</span>
          </div>
          <div className="space-y-2">
            {maleRegs.map((reg) => <RegCard key={reg._id} reg={reg} />)}
          </div>
        </div>
      )}
      {femaleRegs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-pink-400 border-b border-white/10 pb-1.5">
            <ShieldOff size={14} />
            <span className="text-xs font-black uppercase tracking-widest">Female ({femaleRegs.length})</span>
          </div>
          <div className="space-y-2">
            {femaleRegs.map((reg) => <RegCard key={reg._id} reg={reg} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-bold text-foreground transition-colors hover:border-accent hover:text-accent">
      {label}
    </Link>
  );
}

export default function CoordinatorDashboardPage() {
  return (
    <ProtectedRoute allowedRole="coordinator">
      <CoordinatorDashboardContent />
    </ProtectedRoute>
  );
}
