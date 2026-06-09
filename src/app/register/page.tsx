"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Users } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import {
  createAdminTeam,
  createCoordinatorTeam,
  getPublicSports,
  getPublicTeams,
  getPublicTournaments,
  getStoredSession,
  MongoSport,
  TeamSyncPayload,
  TournamentPayload,
} from "@/lib/api";

const DEPARTMENT_TEAM_LIMIT = 2;

const normalizeDepartment = (value: string) => value.trim().replace(/\s+/g, " ").toUpperCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);
const normalizeRegNo = (value: string) => value.trim().replace(/\s+/g, "").toUpperCase();

type MemberInput = {
  fullName: string;
  registrationNumber: string;
};

const emptyMember = (): MemberInput => ({ fullName: "", registrationNumber: "" });

function RegisterPageContent() {
  const [captainName, setCaptainName] = useState("");
  const [captainRegNo, setCaptainRegNo] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [sportId, setSportId] = useState("");
  const [sportOptions, setSportOptions] = useState<MongoSport[]>([]);
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [nextTournament, setNextTournament] = useState<TournamentPayload | null>(null);

  const selectedSport = useMemo(
    () => sportOptions.find((s) => s._id === sportId),
    [sportId, sportOptions]
  );
  const requiredPlayers = Math.max(1, Number(selectedSport?.minPlayers || 1));
  const maxPlayers = Math.max(requiredPlayers, Number(selectedSport?.maxPlayers || requiredPlayers));
  const teamName = useMemo(() => normalizeDepartment(department), [department]);

  const updateRegistrationWindow = (tournaments: TournamentPayload[]) => {
    const nowTime = Date.now();
    const normalized = tournaments
      .map((tournament) => ({
        ...tournament,
        startTime: new Date(tournament.startDate).setHours(0, 0, 0, 0),
        endTime: new Date(tournament.endDate).setHours(23, 59, 59, 999),
      }))
      .filter((tournament) =>
        tournament.registrationOpen &&
        !Number.isNaN(tournament.startTime) &&
        !Number.isNaN(tournament.endTime)
      );

    const validOpenTournaments = normalized.filter((tournament) => nowTime <= tournament.endTime);
    const activeTournament = validOpenTournaments
      .sort((a, b) => a.startTime - b.startTime)[0] || null;

    const upcomingTournament = validOpenTournaments
      .filter((tournament) => tournament.startTime > nowTime)
      .sort((a, b) => a.startTime - b.startTime)[0] || null;

    setRegistrationOpen(Boolean(activeTournament));
    setNextTournament(upcomingTournament);
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const [tournaments, sports] = await Promise.all([
        getPublicTournaments(),
        getPublicSports(),
      ]);
      if (!isMounted) return;
      updateRegistrationWindow(tournaments);
      setSportOptions(sports);
      setSportId((current) => current || sports[0]?._id || "");
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateMember = (index: number, field: keyof MemberInput, value: string) => {
    const nextMembers = Array.from({ length: maxPlayers }, (_, i) => members[i] || emptyMember());
    nextMembers[index] = { ...nextMembers[index], [field]: field === "registrationNumber" ? normalizeRegNo(value) : value };
    setMembers(nextMembers);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const cleanDepartment = normalizeDepartment(department);
    const cleanMembers = members
      .slice(0, maxPlayers)
      .map((member) => ({
        fullName: member.fullName.trim(),
        registrationNumber: normalizeRegNo(member.registrationNumber),
      }))
      .filter((member) => member.fullName || member.registrationNumber);
    const cleanPhone = normalizePhone(phone);
    const cleanCaptainRegNo = normalizeRegNo(captainRegNo);

    if (!captainName.trim() || !cleanCaptainRegNo || !email.trim() || !phone.trim() || !cleanDepartment || !sportId) {
      setStatus("error");
      setMessage("Please fill all required team contact details.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setStatus("error");
      setMessage("Phone number must be exactly 10 digits.");
      return;
    }

    if (cleanMembers.length < requiredPlayers) {
      setStatus("error");
      setMessage(`Please enter at least ${requiredPlayers} player${requiredPlayers === 1 ? "" : "s"} for ${selectedSport?.sportName || selectedSport?.name || "this sport"}.`);
      return;
    }

    if (cleanMembers.some((member) => !member.fullName || !member.registrationNumber)) {
      setStatus("error");
      setMessage("Each team member must include full name and registration number.");
      return;
    }

    try {
      const existingTeams = await getPublicTeams();
      const departmentTeamsCount = existingTeams.filter((team) => {
        return normalizeDepartment(team.department || team.teamName || "") === cleanDepartment;
      }).length;

      if (departmentTeamsCount >= DEPARTMENT_TEAM_LIMIT) {
        setStatus("error");
        setMessage(`${cleanDepartment} team quota is full. Only the first ${DEPARTMENT_TEAM_LIMIT} registered teams from each department are allowed.`);
        return;
      }

      const registeredAt = Date.now();

      const sportName = selectedSport?.sportName || selectedSport?.name;

      const teamData: Omit<TeamSyncPayload, "id"> = {
        name: cleanDepartment,
        teamName: cleanDepartment,
        department: cleanDepartment,
        sportId,
        sportName: sportName || "",
        sport: sportName || "",
        members: cleanMembers,
        playerRegisteredAt: cleanMembers.map(() => registeredAt),
        coachCaptain: captainName.trim(),
        contactNumber: cleanPhone,
        captainName: captainName.trim(),
        captainRegNo: cleanCaptainRegNo,
        email: email.trim(),
        phone: cleanPhone,
        status: "pending",
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        registeredAt,
        source: "public-registration",
      };

      const session = getStoredSession();
      if (!session) {
        setStatus("error");
        setMessage("Please login again before registering a team.");
        return;
      }

      const savedTeam = session.role === "admin"
        ? await createAdminTeam(teamData)
        : await createCoordinatorTeam(teamData);

      setStatus("success");
      setMessage(`${savedTeam.name || cleanDepartment} has been registered and is pending approval.`);
      setCaptainName("");
      setCaptainRegNo("");
      setEmail("");
      setPhone("");
      setDepartment("");
      setSportId("");
      setMembers([]);
    } catch (error) {
      console.error("Team registration failed:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-950">
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <div className="mb-8 flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Users size={24} />
              </div>
              <h1 className="sport-heading text-3xl font-black tracking-tight text-slate-950">Team Registration</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
                Use this form to enter the department, sport, captain contact, and player names for MSU Invicta. Only the first two teams from each department are accepted.
              </p>
            </div>
            {teamName && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Team Name</p>
                <p className="font-black uppercase text-slate-950">{teamName}</p>
              </div>
            )}
          </div>

          {message && (
            <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-bold ${
              status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}>
              <div className="flex items-center gap-2">
                {status === "success" && <CheckCircle2 size={18} />}
                <span>{message}</span>
              </div>
            </div>
          )}

          {registrationOpen ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Name *">
                  <input value={captainName} onChange={(event) => setCaptainName(event.target.value)} required className="input-light" placeholder="Captain or representative name" />
                </Field>
                <Field label="Captain Registration No. *">
                  <input value={captainRegNo} onChange={(event) => setCaptainRegNo(normalizeRegNo(event.target.value))} required className="input-light uppercase" placeholder="UNIV2026001" />
                </Field>
                <Field label="Email *">
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="input-light" placeholder="name@university.edu" />
                </Field>
                <Field label="Phone *">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="\d{10}"
                    maxLength={10}
                    value={phone}
                    onChange={(event) => setPhone(normalizePhone(event.target.value))}
                    required
                    className="input-light"
                    placeholder="10 digit phone number"
                  />
                </Field>
                <Field label="Department *">
                  <input value={department} onChange={(event) => setDepartment(event.target.value)} required className="input-light uppercase" placeholder="CSE, Management, Applied Sciences" />
                </Field>
                <Field label="Sport *">
                  <select value={sportId} onChange={(event) => { setSportId(event.target.value); setMembers([]); }} className="input-light">
                    {sportOptions.map((item) => (
                      <option key={item._id} value={item._id}>{item.sportName || item.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Players Allowed</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{requiredPlayers}-{maxPlayers}</p>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-950">Player Names</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">Enter player names and registration numbers for the selected sport.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {maxPlayers} slots
                  </span>
                </div>

                <div className="space-y-4">
                  {Array.from({ length: maxPlayers }).map((_, index) => (
                    <div key={`${sportId}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-2">
                      <input value={members[index]?.fullName || ""} onChange={(event) => updateMember(index, "fullName", event.target.value)} required={index < requiredPlayers} className="input-light" placeholder={`Player ${index + 1} full name`} />
                      <input value={members[index]?.registrationNumber || ""} onChange={(event) => updateMember(index, "registrationNumber", event.target.value)} required={index < requiredPlayers} className="input-light uppercase" placeholder="Registration no." />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-slate-950 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" && <Loader2 className="animate-spin" size={18} />}
                Register Team
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-slate-700">
              <h2 className="text-2xl font-black text-slate-900">Registration Closed</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                The registration portal is currently disabled or outside the configured tournament window. Admins must enable the registration portal and ensure the current date falls between the tournament start and end dates.
              </p>
              {nextTournament ? (
                <p className="mt-4 text-sm text-slate-600">
                  Next registration window: {formatDate(nextTournament.startDate)} to {formatDate(nextTournament.endDate)}.
                </p>
              ) : (
                <p className="mt-4 text-sm text-slate-600">No upcoming registration window has been configured yet.</p>
              )}
              <Link
                href="/"
                className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-xl bg-slate-950 text-sm font-black uppercase tracking-[0.2em] text-white"
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <ProtectedRoute allowedRole="coordinator">
      <RegisterPageContent />
    </ProtectedRoute>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}
