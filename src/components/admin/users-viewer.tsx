"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { createAdminCoordinator, createAdminVolunteer, getAdminRoleAccounts } from "@/lib/api";
import { Team } from "@/lib/fixture-generator";
import { sports } from "@/lib/mock-data";

interface AppUser {
  id: string;
  fullName: string;
  email: string;
  deptName: string;
  role: "admin" | "volunteer" | "coordinator" | string;
  assignedSport?: string;
  createdByRole?: string;
  createdAt?: unknown;
}

interface PlayerUser {
  id: string;
  fullName: string;
  teamName: string;
  department: string;
  sport: string;
  registeredAt?: number;
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

function getSportName(sportId: string) {
  return sports.find((sport) => sport.id === sportId)?.name || sportId || "Not assigned";
}

function sortByName<T extends { fullName: string }>(users: T[]) {
  return [...users].sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }));
}

export function UsersViewer({ teams, canManageAccounts = false }: { teams: Team[]; canManageAccounts?: boolean }) {
  const [activeSection, setActiveSection] = useState<"volunteers" | "players">("volunteers");
  const [roleAccounts, setRoleAccounts] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [accountRole, setAccountRole] = useState<"coordinator" | "volunteer">("coordinator");
  const [accountSport, setAccountSport] = useState("football");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("1234");
  const [accountError, setAccountError] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

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

  useEffect(() => {
    void Promise.resolve().then(fetchRoleAccounts);
  }, [fetchRoleAccounts]);

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError("");

    const payload = {
      name: accountName.trim(),
      email: accountEmail.trim().toLowerCase(),
      password: accountPassword.trim(),
      assignedSport: accountSport,
    };

    if (!payload.name || !payload.email || !payload.password || !payload.assignedSport) {
      setAccountError("Name, email, password, and sport are required.");
      return;
    }

    setIsCreatingAccount(true);

    try {
      if (accountRole === "coordinator") {
        await createAdminCoordinator(payload);
      } else {
        await createAdminVolunteer(payload);
      }

      setAccountName("");
      setAccountEmail("");
      setAccountPassword("1234");
      await fetchRoleAccounts();
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const players = useMemo<PlayerUser[]>(
    () =>
      sortByName(
        teams.flatMap((team) =>
          (team.members || [])
            .filter((member) => member.trim())
            .map((member, index) => ({
              id: `${team.id}-${index}`,
              fullName: member.trim(),
              teamName: team.name,
              department: team.department || team.name,
              sport: team.sport,
              registeredAt: team.playerRegisteredAt?.[index] || team.registeredAt,
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

            <form onSubmit={handleCreateAccount} className="grid gap-3 lg:grid-cols-[160px_160px_1fr_1fr_130px_auto]">
              <select
                value={accountRole}
                onChange={(event) => setAccountRole(event.target.value as "coordinator" | "volunteer")}
                className="h-12 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent"
              >
                <option value="coordinator">Coordinator</option>
                <option value="volunteer">Volunteer</option>
              </select>
              <select
                value={accountSport}
                onChange={(event) => setAccountSport(event.target.value)}
                className="h-12 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent"
              >
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>{sport.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Full name"
                className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
              />
              <input
                type="email"
                value={accountEmail}
                onChange={(event) => setAccountEmail(event.target.value)}
                placeholder={`${accountRole}${accountSport}@gmail.com`}
                className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
              />
              <input
                type="text"
                value={accountPassword}
                onChange={(event) => setAccountPassword(event.target.value)}
                placeholder="1234"
                className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
              />
              <button
                type="submit"
                disabled={isCreatingAccount}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.01] disabled:opacity-50"
              >
                <UserPlus size={15} />
                {isCreatingAccount ? "Adding" : "Add"}
              </button>
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
        <VolunteersTable volunteers={filteredVolunteers} loading={loading} />
      ) : (
        <PlayersTable players={filteredPlayers} />
      )}
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[130px] rounded-xl border border-white/5 bg-slate-900 px-4 py-2.5 text-center">
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <span className="scoreboard-number block text-2xl font-black text-white">{value}</span>
    </div>
  );
}

function VolunteersTable({ volunteers, loading }: { volunteers: AppUser[]; loading: boolean }) {
  return (
    <Card className="bg-slate-900/60 border-white/5 text-white">
      <CardContent className="p-0 overflow-hidden">
        {loading ? (
          <EmptyState label="Loading role accounts..." spinning />
        ) : volunteers.length === 0 ? (
          <EmptyState label="No Role Accounts Found" detail="Create role accounts from the admin dashboard." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Department / Group</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Role</th>
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
                        <span className="uppercase">{volunteer.assignedSport ? getSportName(volunteer.assignedSport) : volunteer.deptName}</span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlayersTable({ players }: { players: PlayerUser[] }) {
  return (
    <Card className="bg-slate-900/60 border-white/5 text-white">
      <CardContent className="p-0 overflow-hidden">
        {players.length === 0 ? (
          <EmptyState label="No Players Found" detail="Registered team members will appear here automatically." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Player Name</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Sport</th>
                  <th className="px-6 py-4">Registration Date</th>
                  <th className="px-6 py-4 text-right">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {players.map((player) => (
                  <tr key={player.id} className="transition-all hover:bg-slate-950/20">
                    <td className="px-6 py-5">
                      <NameCell name={player.fullName} />
                    </td>
                    <td className="px-6 py-5 text-slate-300 text-xs font-black uppercase tracking-wide">{player.teamName}</td>
                    <td className="px-6 py-5 text-slate-300 text-xs font-bold uppercase">{player.department}</td>
                    <td className="px-6 py-5 text-slate-400 text-xs font-bold">{getSportName(player.sport)}</td>
                    <td className="px-6 py-5 text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-600" />
                        <span>{formatCreatedAt(player.registeredAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <RolePill icon={UsersRound} label="Player" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NameCell({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-accent text-sm font-black">
        {name.slice(0, 1).toUpperCase()}
      </div>
      <span className="font-bold text-white uppercase text-sm tracking-wide">{name}</span>
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
