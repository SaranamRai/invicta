"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  GraduationCap,
  Mail,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  UserPlus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { createAdminCoordinator, createAdminVolunteer, getAdminRoleAccounts, getPublicSports, updateAdminRoleAccount, deleteAdminRoleAccount, updateAdminTeam, MongoSport } from "@/lib/api";
import { Team } from "@/lib/fixture-generator";

interface AppUser {
  id: string;
  fullName: string;
  email: string;
  deptName: string;
  role: "admin" | "volunteer" | "coordinator" | string;
  assignedSport?: string;
  assignedSportId?: string;
  assignedSportName?: string;
  createdByRole?: string;
  createdAt?: unknown;
}

interface PlayerUser {
  id: string;
  fullName: string;
  registrationNo?: string;
  phone?: string;
  semester?: string;
  teamName: string;
  teamId: string;
  memberIndex: number;
  department: string;
  sport: string;
  registeredAt?: number;
  rawMember: unknown;
}

function formatCreatedAt(value: unknown) {
  if (!value) {
    return "Not recorded";
  }

  const date =
    typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function"
      ? value.toDate()
      : new Date(value as string | number | Date);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeSportValue(value?: string) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function getSportName(sportId?: string, sportName?: string) {
  const name = sportName?.trim();
  if (name) return name;
  return sportId || "Not assigned";
}

function sortByName<T extends { fullName: string }>(users: T[]) {
  return [...users].sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }));
}

export function UsersViewer({
  teams,
  canManageAccounts = false,
  onTeamUpdated,
}: {
  teams: Team[];
  canManageAccounts?: boolean;
  onTeamUpdated?: (team: Team) => void;
}) {
  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
  };

  const [activeSection, setActiveSection] = useState<"volunteers" | "players">("volunteers");
  const [roleAccounts, setRoleAccounts] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [accountRole, setAccountRole] = useState<"coordinator" | "volunteer">("coordinator");
  const [accountSport, setAccountSport] = useState("");
  const [accountSportId, setAccountSportId] = useState("");
  const [accountSportName, setAccountSportName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState(() => generateTempPassword());
  const [accountRegistrationNo, setAccountRegistrationNo] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [sportsList, setSportsList] = useState<MongoSport[]>([]);
  const [, setAutoGeneratePassword] = useState(true);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editSport, setEditSport] = useState("");
  const [editSportId, setEditSportId] = useState("");
  const [editSportName, setEditSportName] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PlayerUser | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerRegNo, setPlayerRegNo] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [playerSemester, setPlayerSemester] = useState("");
  const [playerSaving, setPlayerSaving] = useState(false);
  const [playerError, setPlayerError] = useState("");

  const fetchRoleAccounts = React.useCallback(async () => {
      try {
        setRoleAccounts(await getAdminRoleAccounts());
      } catch (error) {
        console.error("Mongo role accounts fetch error", error);
        setRoleAccounts([]);
      } finally {
        setLoading(false);
      }
  }, []);

  const handleSportChange = (value: string) => {
    setAccountSport(value);
    const selected = sportsList.find(
      (s) => normalizeSportValue(s.sportName || s.name || "") === value
    );
    if (selected) {
      setAccountSportId(selected._id);
      setAccountSportName(selected.sportName || selected.name || "");
    } else {
      setAccountSportId("");
      setAccountSportName("");
    }
  };

  const sportInitialized = useRef(false);

  useEffect(() => {
    void Promise.resolve().then(fetchRoleAccounts);
    getPublicSports().then(list => {
      setSportsList(list);
      if (list.length > 0 && !sportInitialized.current) {
        sportInitialized.current = true;
        const first = list[0];
        setAccountSport(normalizeSportValue(first.sportName || first.name || ""));
        setAccountSportId(first._id);
        setAccountSportName(first.sportName || first.name || "");
      }
    }).catch(() => {});
  }, [fetchRoleAccounts]);

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError("");
    setAccountSuccess("");

    const finalPassword = accountPassword.trim() || generateTempPassword();

    const payload = {
      name: accountName.trim(),
      email: accountEmail.trim().toLowerCase(),
      password: finalPassword,
      assignedSport: accountSport,
      assignedSportId: accountSportId || undefined,
      assignedSportName: accountSportName || undefined,
      registrationNo: accountRegistrationNo.trim() || undefined,
      phone: accountPhone.trim() || undefined,
    };

    if (!payload.name || !payload.email || !payload.assignedSport) {
      setAccountError("Coordinator Name, Email Address, and Assigned Sport are required.");
      return;
    }

    setIsCreatingAccount(true);

    try {
      const result = accountRole === "coordinator"
        ? await createAdminCoordinator(payload)
        : await createAdminVolunteer(payload);

      setAccountName("");
      setAccountEmail("");
      setAccountPassword("");
      setAccountRegistrationNo("");
      setAccountPhone("");
      setAutoGeneratePassword(true);
      if (sportsList.length > 0) {
        const first = sportsList[0];
        setAccountSport(normalizeSportValue(first.sportName || first.name || ""));
        setAccountSportId(first._id);
        setAccountSportName(first.sportName || first.name || "");
      }

      const response = result as { message?: string; emailSent?: boolean };
      const msg = response.message || "";
      const roleLabel = accountRole === "coordinator" ? "Coordinator" : "Volunteer";
      if (response.emailSent) {
        setAccountSuccess(`${roleLabel} account created successfully. Duty assignment email sent to ${payload.email}.`);
      } else if (msg.replace(/\.$/, "") === "Account created successfully") {
        setAccountSuccess(`${roleLabel} account created successfully.`);
      } else if (msg) {
        setAccountError(msg);
      }

      await fetchRoleAccounts();
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setEditName(user.fullName);
    setEditEmail(user.email);
    setEditPassword("");
    setEditSportId(user.assignedSportId || "");
    setEditSportName(user.assignedSportName || "");
    setEditSport(user.assignedSport || "");
    setEditStatus(user.deptName === "inactive" ? "inactive" : "active");
    setEditError("");
    setEditSaving(false);
    setDeleteConfirm(null);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setDeleteConfirm(null);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    setEditError("");

    if (!editName.trim() || !editEmail.trim()) {
      setEditError("Name and email are required");
      return;
    }

    setEditSaving(true);
    try {
      const payload: {
        role: string; name: string; email: string; assignedSport: string; assignedSportId?: string; assignedSportName?: string; status: string; password?: string;
      } = {
        role: editingUser.role,
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        assignedSport: editSport,
        assignedSportId: editSportId || undefined,
        assignedSportName: editSportName || undefined,
        status: editStatus,
      };
      if (editPassword.trim()) payload.password = editPassword.trim();

      await updateAdminRoleAccount(editingUser.id, payload);
      closeEditModal();
      await fetchRoleAccounts();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Could not update account");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteAccount = async (user: AppUser) => {
    if (deleteConfirm !== user.id) {
      setDeleteConfirm(user.id);
      return;
    }

    try {
      await deleteAdminRoleAccount(user.id, user.role);
      setDeleteConfirm(null);
      closeEditModal();
      await fetchRoleAccounts();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Could not delete account");
    }
  };

  function getMemberName(member: unknown): string {
    if (typeof member === "string") return member.trim();
    if (!member || typeof member !== "object") return "";
    const m = member as { fullName?: string; name?: string; registrationNumber?: string; regNo?: string };
    return m.fullName || m.name || m.registrationNumber || m.regNo || "";
  }

  function getMemberRegNo(member: unknown): string {
    if (!member || typeof member !== "object") return "";
    const m = member as { registrationNo?: string; registrationNumber?: string; regNo?: string };
    return m.registrationNo || m.registrationNumber || m.regNo || "";
  }

  function getMemberField(member: unknown, field: "phone" | "semester"): string {
    if (!member || typeof member !== "object") return "";
    const m = member as { phone?: string; semester?: string };
    return m[field] || "";
  }

  const openPlayerEdit = (player: PlayerUser) => {
    setEditingPlayer(player);
    setPlayerName(player.fullName);
    setPlayerRegNo(player.registrationNo || "");
    setPlayerPhone(player.phone || "");
    setPlayerSemester(player.semester || "");
    setPlayerError("");
  };

  const closePlayerEdit = () => {
    setEditingPlayer(null);
    setPlayerError("");
  };

  const handlePlayerSave = async () => {
    if (!editingPlayer) return;
    const team = teams.find((item) => item.id === editingPlayer.teamId);
    if (!team) {
      setPlayerError("Team not found for this player.");
      return;
    }
    if (!playerName.trim()) {
      setPlayerError("Player name is required.");
      return;
    }

    const members = [...(team.members || [])];
    const existingMember = members[editingPlayer.memberIndex];
    const nextMember = typeof existingMember === "object" && existingMember !== null
      ? {
          ...(existingMember as Record<string, unknown>),
          fullName: playerName.trim(),
          registrationNo: playerRegNo.trim().toUpperCase(),
          registrationNumber: playerRegNo.trim().toUpperCase(),
          phone: playerPhone.trim(),
          semester: playerSemester.trim(),
        }
      : playerRegNo.trim()
        ? {
            fullName: playerName.trim(),
            registrationNo: playerRegNo.trim().toUpperCase(),
            registrationNumber: playerRegNo.trim().toUpperCase(),
            phone: playerPhone.trim(),
            semester: playerSemester.trim(),
          }
        : playerName.trim();

    members[editingPlayer.memberIndex] = nextMember as never;

    setPlayerSaving(true);
    try {
      const savedTeam = await updateAdminTeam({ ...team, members });
      onTeamUpdated?.(savedTeam as Team);
      closePlayerEdit();
    } catch (error) {
      setPlayerError(error instanceof Error ? error.message : "Could not update player.");
    } finally {
      setPlayerSaving(false);
    }
  };

  const players = useMemo<PlayerUser[]>(
    () =>
      sortByName(
        teams.flatMap((team) =>
          (team.members || [])
            .filter((member) => getMemberName(member))
            .map((member, index) => ({
              id: `${team.id}-${index}`,
              fullName: getMemberName(member),
              registrationNo: getMemberRegNo(member),
              phone: getMemberField(member, "phone"),
              semester: getMemberField(member, "semester"),
              teamName: team.name,
              teamId: team.id,
              memberIndex: index,
              department: team.department || team.name,
              sport: team.sport,
              registeredAt: team.playerRegisteredAt?.[index] || team.registeredAt,
              rawMember: member,
            }))
        )
      ),
    [teams]
  );

  const query = searchQuery.trim().toLowerCase();
  const filteredVolunteers = sortByName(
    roleAccounts.filter((volunteer) =>
      [volunteer.fullName, volunteer.email, volunteer.deptName, volunteer.role]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  );
  const filteredPlayers = sortByName(
    players.filter((player) =>
        [player.fullName, player.teamName, player.department, getSportName(player.sport)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-black sport-heading text-white">Role Accounts and Players</h2>
          <p className="text-sm text-slate-400">
            Review admin, supercoordinator, coordinator, and volunteer accounts from MongoDB, plus players registered under teams.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
          <CountCard label="Role Accounts" value={roleAccounts.length} />
          <CountCard label="Players" value={players.length} />
        </div>
      </div>

      {canManageAccounts && (
        <Card className="bg-slate-900/60 border-white/5">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <UserPlus size={19} />
              </div>
              <div>
                <h3 className="sport-heading text-lg font-black text-white">Add Sport Role Account</h3>
                <p className="text-xs font-semibold text-slate-400">Supercoordinator can add one coordinator per sport and volunteers under that sport.</p>
              </div>
            </div>

            {accountError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
                {accountError}
              </div>
            )}
            {accountSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300">
                {accountSuccess}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <select
                  value={accountRole}
                  onChange={(event) => setAccountRole(event.target.value as "coordinator" | "volunteer")}
                  className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent"
                >
                  <option value="coordinator">Coordinator</option>
                  <option value="volunteer">Volunteer</option>
                </select>
                <select
                  value={accountSport}
                  onChange={(event) => handleSportChange(event.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent"
                >
                  {sportsList.length === 0 ? (
                    <option value="" disabled>Loading sports...</option>
                  ) : (
                    <>
                      <option value="" disabled>Select Assigned Sport</option>
                      {sportsList.map((sport) => {
                        const id = normalizeSportValue(sport.sportName || sport.name || "");
                        return <option key={id} value={id}>{sport.sportName || sport.name}</option>;
                      })}
                    </>
                  )}
                </select>
                <input
                  type="text"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="Coordinator Name"
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
                />
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(event) => setAccountEmail(event.target.value)}
                  placeholder="Email Address"
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <input
                  type="text"
                  value={accountRegistrationNo}
                  onChange={(event) => setAccountRegistrationNo(event.target.value)}
                  placeholder="Registration Number"
                  className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
                />
                <input
                  type="tel"
                  value={accountPhone}
                  onChange={(event) => setAccountPhone(event.target.value)}
                  placeholder="Phone Number"
                  className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
                />
                <div className="relative min-w-0">
                  <input
                    type="text"
                    value={accountPassword}
                    onChange={(event) => { setAccountPassword(event.target.value); setAutoGeneratePassword(false); }}
                    placeholder="Password (auto-generated)"
                    className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 pr-20 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => { setAccountPassword(generateTempPassword()); setAutoGeneratePassword(false); }}
                    className="absolute right-1 top-1 h-10 rounded-lg bg-slate-800 px-3 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                  >
                    Generate
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingAccount}
                  className="inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.01] disabled:opacity-50 sm:px-5"
                >
                  <UserPlus size={15} className="shrink-0" />
                  <span className="truncate">{isCreatingAccount ? "Creating..." : `Create ${accountRole === "coordinator" ? "Coordinator" : "Volunteer"}`}</span>
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900/60 border-white/5">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-1 lg:w-[320px]">
              {[
                { id: "volunteers" as const, label: "Role Accounts", icon: ShieldCheck },
                { id: "players" as const, label: "Players", icon: UsersRound },
              ].map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`flex h-11 items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      isActive ? "bg-accent text-accent-foreground" : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <section.icon size={15} />
                    {section.label}
                  </button>
                );
              })}
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 text-slate-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeSection === "volunteers" ? "role accounts" : "players"} by name, email, team, or department...`}
                className="w-full rounded-xl bg-slate-950/60 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-accent transition-all"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {activeSection === "volunteers" ? (
        <VolunteersTable volunteers={filteredVolunteers} loading={loading} onEdit={canManageAccounts ? openEditModal : undefined} />
      ) : (
        <PlayersTable players={filteredPlayers} onEdit={canManageAccounts ? openPlayerEdit : undefined} />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          name={editName}
          email={editEmail}
          password={editPassword}
          sport={editSport}
          status={editStatus}
          sportsList={sportsList}
          saving={editSaving}
          error={editError}
          deleteConfirm={deleteConfirm}
          onNameChange={setEditName}
          onEmailChange={setEditEmail}
          onPasswordChange={setEditPassword}
          onSportChange={setEditSport}
          onSportIdChange={setEditSportId}
          onSportNameChange={setEditSportName}
          onStatusChange={setEditStatus}
          onSave={handleEditSave}
          onDelete={handleDeleteAccount}
          onClose={closeEditModal}
        />
      )}

      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          name={playerName}
          registrationNo={playerRegNo}
          phone={playerPhone}
          semester={playerSemester}
          saving={playerSaving}
          error={playerError}
          onNameChange={setPlayerName}
          onRegistrationNoChange={setPlayerRegNo}
          onPhoneChange={setPlayerPhone}
          onSemesterChange={setPlayerSemester}
          onSave={handlePlayerSave}
          onClose={closePlayerEdit}
        />
      )}
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-slate-900 px-3 py-2.5 text-center sm:min-w-[130px] sm:px-4">
      <span className="block text-[9px] font-black uppercase tracking-wide text-slate-400 sm:text-[10px] sm:tracking-wider">{label}</span>
      <span className="scoreboard-number block text-2xl font-black text-white">{value}</span>
    </div>
  );
}

function VolunteersTable({ volunteers, loading, onEdit }: { volunteers: AppUser[]; loading: boolean; onEdit?: (user: AppUser) => void }) {
  return (
    <Card className="bg-slate-900/60 border-white/5 text-white">
      <CardContent className="p-0 overflow-hidden">
        {loading ? (
          <EmptyState label="Loading role accounts..." spinning />
        ) : volunteers.length === 0 ? (
          <EmptyState label="No Role Accounts Found" detail="Create role accounts from the admin dashboard." />
        ) : (
          <>
          <div className="grid gap-3 p-3 md:hidden">
            {volunteers.map((volunteer) => (
              <div key={volunteer.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <NameCell name={volunteer.fullName} />
                  <RolePill icon={ShieldCheck} label={volunteer.role || "No role"} />
                </div>
                <div className="mt-4 space-y-2 text-xs font-semibold text-slate-400">
                  <p className="break-all font-mono text-slate-300">{volunteer.email}</p>
                  <p className="uppercase">{volunteer.assignedSportName || (volunteer.assignedSport ? getSportName(volunteer.assignedSport, volunteer.assignedSportName) : volunteer.deptName)}</p>
                  <p>{formatCreatedAt(volunteer.createdAt)}</p>
                </div>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(volunteer)}
                    className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/10 bg-slate-800 px-3 text-[10px] font-black uppercase tracking-wide text-slate-300 transition-all hover:border-accent hover:bg-accent hover:text-accent-foreground"
                  >
                    Edit
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[900px] w-full text-left">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Department / Group</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Role</th>
                  {onEdit && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {volunteers.map((volunteer) => (
                  <tr key={volunteer.id} className="transition-all hover:bg-slate-950/20">
                    <td className="px-6 py-5">
                      <NameCell name={volunteer.fullName} />
                    </td>
                    <td className="px-6 py-5 text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <Mail size={13} className="text-slate-500" />
                        <span>{volunteer.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-300 font-bold">
                      <div className="flex items-center gap-1.5 text-xs">
                        <GraduationCap size={14} className="text-slate-500" />
                        <span className="uppercase">{volunteer.assignedSportName || (volunteer.assignedSport ? getSportName(volunteer.assignedSport, volunteer.assignedSportName) : volunteer.deptName)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-600" />
                        <span>{formatCreatedAt(volunteer.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <RolePill icon={ShieldCheck} label={volunteer.role || "No role"} />
                    </td>
                    {onEdit && (
                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => onEdit(volunteer)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-3 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all hover:bg-accent hover:text-accent-foreground hover:border-accent"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PlayersTable({ players, onEdit }: { players: PlayerUser[]; onEdit?: (player: PlayerUser) => void }) {
  return (
    <Card className="bg-slate-900/60 border-white/5 text-white">
      <CardContent className="p-0 overflow-hidden">
        {players.length === 0 ? (
          <EmptyState label="No Players Found" detail="Registered team members will appear here automatically." />
        ) : (
          <>
          <div className="grid gap-3 p-3 md:hidden">
            {players.map((player) => (
              <div key={player.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <NameCell name={player.fullName} />
                  <RolePill icon={UsersRound} label="Player" />
                </div>
                <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-400">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">Registration</span>
                    <span className="font-mono uppercase text-slate-300">{player.registrationNo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">Team</span>
                    <span className="uppercase text-slate-300">{player.teamName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">Department</span>
                      <span className="uppercase text-slate-300">{player.department}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black uppercase tracking-wide text-slate-500">Sport</span>
                      <span className="text-slate-300">{player.sport || "N/A"}</span>
                    </div>
                  </div>
                </div>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(player)}
                    className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/10 bg-slate-800 px-3 text-[10px] font-black uppercase tracking-wide text-slate-300 transition-all hover:border-accent hover:bg-accent hover:text-accent-foreground"
                  >
                    Edit Player
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[980px] w-full text-left">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Player Name</th>
                  <th className="px-6 py-4">Registration No.</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Sport</th>
                  <th className="px-6 py-4">Registration Date</th>
                  <th className="px-6 py-4 text-right">Type</th>
                  {onEdit && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {players.map((player) => (
                  <tr key={player.id} className="transition-all hover:bg-slate-950/20">
                    <td className="px-6 py-5">
                      <NameCell name={player.fullName} />
                    </td>
                    <td className="px-6 py-5 text-slate-300 text-xs font-mono uppercase">{player.registrationNo || "N/A"}</td>
                    <td className="px-6 py-5 text-slate-300 text-xs font-black uppercase tracking-wide">{player.teamName}</td>
                    <td className="px-6 py-5 text-slate-300 text-xs font-bold uppercase">{player.department}</td>
                    <td className="px-6 py-5 text-slate-400 text-xs font-bold">{player.sport || "N/A"}</td>
                    <td className="px-6 py-5 text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-600" />
                        <span>{formatCreatedAt(player.registeredAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <RolePill icon={UsersRound} label="Player" />
                    </td>
                    {onEdit && (
                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => onEdit(player)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-3 text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all hover:border-accent hover:bg-accent hover:text-accent-foreground"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EditPlayerModal({
  player, name, registrationNo, phone, semester, saving, error,
  onNameChange, onRegistrationNoChange, onPhoneChange, onSemesterChange, onSave, onClose,
}: {
  player: PlayerUser;
  name: string;
  registrationNo: string;
  phone: string;
  semester: string;
  saving: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onRegistrationNoChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSemesterChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm animate-fadeIn sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <h3 className="sport-heading text-lg font-black text-white">Edit Player</h3>
        <p className="mb-5 mt-1 text-xs font-semibold text-slate-400">
          {player.teamName} / {player.department}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">{error}</div>
        )}

        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Player full name"
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
          />
          <input
            type="text"
            value={registrationNo}
            onChange={(event) => onRegistrationNoChange(event.target.value)}
            placeholder="Registration number"
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold uppercase text-white outline-none placeholder:text-slate-500 focus:border-accent"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={semester}
              onChange={(event) => onSemesterChange(event.target.value)}
              placeholder="Semester"
              className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
            />
            <input
              type="tel"
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              placeholder="Phone"
              className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-white/5 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-slate-800 px-5 text-[10px] font-black uppercase tracking-wide text-slate-400 transition-colors hover:text-white sm:tracking-widest"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-6 text-[10px] font-black uppercase tracking-wide text-accent-foreground transition-all hover:scale-[1.01] disabled:opacity-50 sm:tracking-widest"
          >
            {saving ? "Saving..." : "Save Player"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NameCell({ name }: { name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-accent text-sm font-black">
        {name.slice(0, 1).toUpperCase()}
      </div>
      <span className="min-w-0 break-words font-bold text-white uppercase text-sm tracking-wide">{name}</span>
    </div>
  );
}

function RolePill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[9px] font-black uppercase tracking-wider">
      <Icon size={11} />
      {label}
    </span>
  );
}

function EditUserModal({
  user, name, email, password, sport, status, sportsList, saving, error, deleteConfirm,
  onNameChange, onEmailChange, onPasswordChange, onSportChange, onSportIdChange, onSportNameChange, onStatusChange,
  onSave, onDelete, onClose,
}: {
  user: AppUser;
  name: string; email: string; password: string; sport: string; status: string;
  sportsList: MongoSport[];
  saving: boolean; error: string; deleteConfirm: string | null;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSportChange: (v: string) => void;
  onSportIdChange: (v: string) => void;
  onSportNameChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onSave: () => void;
  onDelete: (user: AppUser) => void;
  onClose: () => void;
}) {
  const handleEditSportChange = (value: string) => {
    onSportChange(value);
    const selected = sportsList.find(
      (s) => normalizeSportValue(s.sportName || s.name || "") === value
    );
    if (selected) {
      onSportIdChange(selected._id);
      onSportNameChange(selected.sportName || selected.name || "");
    } else {
      onSportIdChange("");
      onSportNameChange("");
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-black sport-heading text-white mb-1">Edit {user.role} Account</h3>
        <p className="text-xs text-slate-400 mb-5">Update details for <strong className="text-white">{user.fullName}</strong></p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">{error}</div>
        )}

        <div className="space-y-3">
          <input
            type="text" value={name} onChange={(e) => onNameChange(e.target.value)}
            placeholder="Full name"
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
          />
          <input
            type="email" value={email} onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Email address"
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
          />
          <input
            type="text" value={password} onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="New password (leave blank to keep current)"
            className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
          />

          {(user.role === "coordinator" || user.role === "volunteer") && (
            <div className="grid grid-cols-2 gap-3">
              <select
                value={sport}
                onChange={(e) => handleEditSportChange(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent"
              >
                {sportsList.length === 0 ? (
                  <option value="" disabled>Loading sports...</option>
                ) : (
                  <>
                    <option value="" disabled>Select Assigned Sport</option>
                    {sportsList.map((s) => {
                      const id = normalizeSportValue(s.sportName || s.name || "");
                      return <option key={id} value={id}>{s.sportName || s.name}</option>;
                    })}
                  </>
                )}
              </select>
              <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => onDelete(user)}
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 text-[10px] font-black uppercase tracking-widest text-red-300 transition-all hover:bg-red-500/20 disabled:opacity-50"
            >
              {deleteConfirm === user.id ? "Confirm Delete?" : "Delete"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-slate-800 px-5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label, detail, spinning = false }: { label: string; detail?: string; spinning?: boolean }) {
  return (
    <div className="py-16 text-center text-slate-500">
      {spinning ? (
        <span className="mx-auto mb-4 block h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      ) : (
        <UserRoundCheck size={48} className="mx-auto text-slate-700 mb-4 animate-pulse" />
      )}
      <p className="font-semibold text-base">{label}</p>
      {detail && <p className="text-xs text-slate-600 mt-1">{detail}</p>}
    </div>
  );
}
