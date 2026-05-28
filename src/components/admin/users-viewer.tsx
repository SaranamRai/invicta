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
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";

import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { Team } from "@/lib/fixture-generator";
import { sports } from "@/lib/mock-data";

interface AppUser {
  id: string;
  fullName: string;
  email: string;
  deptName: string;
  role: string;
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

const VOLUNTEER_EMAIL = "volunteer@gmail.com";

const fallbackVolunteer: AppUser = {
  id: "default-volunteer",
  fullName: "Volunteer",
  email: VOLUNTEER_EMAIL,
  deptName: "Tournament Operations",
  role: "volunteer",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function isVolunteer(user: AppUser) {
  const email = user.email.toLowerCase();
  const role = user.role.toLowerCase();
  return role === "volunteer" || email === VOLUNTEER_EMAIL;
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

export function UsersViewer({ teams }: { teams: Team[] }) {
  const [activeSection, setActiveSection] = useState<"volunteers" | "players">("volunteers");
  const [volunteers, setVolunteers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVolunteers() {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const fetchedUsers: AppUser[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedUsers.push({
            id: docSnap.id,
            fullName: data.fullName || data.displayName || "Unknown",
            email: data.email || "No email",
            deptName: data.deptName || data.department || "Not assigned",
            role: data.role || "",
            createdAt: data.createdAt,
          });
        });

        const fetchedVolunteers = fetchedUsers.filter(isVolunteer);
        setVolunteers(fetchedVolunteers.length > 0 ? fetchedVolunteers : [fallbackVolunteer]);
      } catch (error) {
        console.error("Firestore users fetch error", error);
        setVolunteers([fallbackVolunteer]);
      } finally {
        setLoading(false);
      }
    }

    fetchVolunteers();
  }, []);

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
    volunteers.filter((volunteer) =>
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
          <h2 className="text-2xl font-black sport-heading text-white">Users Directory</h2>
          <p className="text-sm text-slate-400">
            Admin can review volunteers with portal access and players registered under teams.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
          <CountCard label="Volunteers" value={volunteers.length} />
          <CountCard label="Players" value={players.length} />
        </div>
      </div>

      <Card className="bg-slate-900/60 border-white/5">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-1 lg:w-[320px]">
              {[
                { id: "volunteers" as const, label: "Volunteers", icon: ShieldCheck },
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
                placeholder={`Search ${activeSection} by name, email, team, or department...`}
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
          <EmptyState label="Loading volunteers..." spinning />
        ) : volunteers.length === 0 ? (
          <EmptyState label="No Volunteers Match Search" detail="Try searching by volunteer name, email, or department." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Volunteer Name</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Department / Group</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Access</th>
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
                        <span className="uppercase">{volunteer.deptName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-600" />
                        <span>{formatCreatedAt(volunteer.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <RolePill icon={ShieldCheck} label="Volunteer" />
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
