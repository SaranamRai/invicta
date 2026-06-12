"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardList, FileUp, LogOut, Send, ShieldCheck, Trophy, UserPlus, UsersRound } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { Card } from "@/components/ui/card";
import { Team } from "@/lib/fixture-generator";
import { AdminFixturePayload, CoordinatorVolunteerPayload, TournamentPayload, assignCoordinatorFixtureVolunteer, createCoordinatorRule, createCoordinatorVolunteer, getCoordinatorFixtures, getCoordinatorVolunteers, getPublicTeams, getPublicTournaments, mapMongoTeam } from "@/lib/api";
import { clearPortalSession, getRoleAccount, RoleAccount } from "@/lib/role-auth";
import { sports } from "@/lib/mock-data";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function CoordinatorDashboardContent() {
  const router = useRouter();
  const [account] = useState<RoleAccount | null>(() => getRoleAccount());
  const assignedSport = account?.assignedSport?.trim().toLowerCase() || "";
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<AdminFixturePayload[]>([]);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const selectedTournament = tournaments.find((tournament) => (tournament._id || tournament.id) === selectedTournamentId);
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
  const availableRuleSports = assignedSport ? sports.filter((sport) => sport.id === assignedSport) : sports;

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      const [publicTeams, coordinatorVolunteers, coordinatorFixtures, publicTournaments] = await Promise.all([
        getPublicTeams(),
        getCoordinatorVolunteers().catch(() => []),
        getCoordinatorFixtures(selectedTournamentId ? { tournamentId: selectedTournamentId } : undefined).catch(() => []),
        getPublicTournaments().catch(() => []),
      ]);
      if (!isMounted) return;
      setTeams(publicTeams.map((team) => mapMongoTeam(team) as Team));
      setVolunteers(coordinatorVolunteers);
      setFixtures(coordinatorFixtures);
      setTournaments(publicTournaments);
    }

    void loadDashboardData();
    const interval = window.setInterval(loadDashboardData, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [selectedTournamentId]);

  const assignedTeams = useMemo(() => {
    const department = account?.department?.trim().toLowerCase();
    const assignedSport = account?.assignedSport?.trim().toLowerCase();

    return teams.filter((team) => {
      const matchesDepartment = !department || team.department?.trim().toLowerCase() === department || team.name.trim().toLowerCase() === department;
      const matchesSport = !assignedSport || team.sport.trim().toLowerCase() === assignedSport;
      return matchesDepartment && matchesSport;
    });
  }, [account, teams]);

  const totalPlayers = assignedTeams.reduce((sum, team) => sum + (team.members?.length || 0), 0);
  const assignedFixtureCount = fixtures.filter((fixture) => fixture.assignedVolunteer).length;

  const handleSignOut = async () => {
    clearPortalSession();
    router.replace("/login");
  };

  const handlePublishRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = ruleTitle.trim();
    const description = ruleDescription.trim();
    const selectedSport = availableRuleSports.find((sport) => sport.id === ruleSport);

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
        tournamentId: selectedTournamentId,
        tournamentName: selectedTournament?.name || "",
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
        assignedSport,
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
      const updated = await assignCoordinatorFixtureVolunteer(fixtureId, volunteerId, selectedTournamentId);
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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-44 items-center overflow-hidden">
              <img src="/msu-logo-transparent.png" alt="Medhavi Skills University" className="h-auto w-full object-contain" />
            </div>
            <div>
              <h1 className="sport-heading text-2xl font-black">Coordinator Dashboard</h1>
              <p className="max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
                Manage your assigned department or sport teams, review fixtures, and prepare team details for admin approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white"
            >
              <LogOut size={16} />
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
                Department: {account?.department || "All assigned departments"} / Sport: {account?.assignedSport || "All assigned sports"}
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

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon={Trophy} label="Assigned Teams" value={assignedTeams.length} />
          <StatCard icon={UsersRound} label="Players Listed" value={totalPlayers} />
          <StatCard icon={UsersRound} label="Sport Volunteers" value={volunteers.length} />
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

          <div className="mb-5 max-w-md space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tournament</label>
            <select
              value={selectedTournamentId}
              onChange={(event) => setSelectedTournamentId(event.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none focus:border-accent"
            >
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => (
                <option key={tournament._id || tournament.id} value={tournament._id || tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </div>

          {assignmentMessage && (
            <div className="mb-4 rounded-xl border border-border bg-secondary px-4 py-3 text-xs font-bold text-muted-foreground">
              {assignmentMessage}
            </div>
          )}

          {!selectedTournamentId ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm font-semibold text-muted-foreground">
              Please select a tournament.
            </div>
          ) : fixtures.length > 0 ? (
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
                          <div className="flex min-w-[240px] flex-col gap-2 sm:flex-row sm:items-center">
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
            <div className="divide-y divide-border">
              {assignedTeams.length > 0 ? assignedTeams.map((team) => (
                <div key={team.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-black uppercase tracking-wide text-foreground">{team.name}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {sports.find((sport) => sport.id === team.sport)?.name || team.sport} / {team.department || "Department"}
                    </p>
                  </div>
                  <span className="w-fit rounded-xl bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {team.members?.length || 0} players
                  </span>
                </div>
              )) : (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-muted-foreground">No teams found for your assignment yet.</p>
                </div>
              )}
            </div>
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
            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tournament</label>
              <select
                value={selectedTournamentId}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
              >
                <option value="">Select tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament._id || tournament.id} value={tournament._id || tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sport</label>
              <select
                value={ruleSport}
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
                disabled={isPublishingRule || !selectedTournamentId || !ruleTitle.trim() || !ruleDescription.trim()}
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
                          {sports.find((sport) => sport.id === volunteer.assignedSport)?.name || volunteer.assignedSport || "Assigned sport"}
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

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Icon size={22} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="text-3xl font-black text-foreground">{value}</p>
        </div>
      </div>
    </Card>
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
