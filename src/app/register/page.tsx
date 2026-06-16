"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Upload, Users, X } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import {
  getPublicSports,
  getPublicTournaments,
  MongoSport,
  submitTeamRegistration,
  TeamRegistrationWritePayload,
  TeamRegistrationMember,
  TournamentPayload,
} from "@/lib/api";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

const normalizeDepartment = (value: string) => value.trim().replace(/\s+/g, " ").toUpperCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);
const normalizeRegNo = (value: string) => value.trim().replace(/\s+/g, "").toUpperCase();

type MemberInput = {
  fullName: string;
  registrationNo: string;
  department: string;
  semester: string;
  gender: string;
  email: string;
  phone: string;
};

const emptyMember = (): MemberInput => ({
  fullName: "",
  registrationNo: "",
  department: "",
  semester: "",
  gender: "",
  email: "",
  phone: "",
});

function RegisterPageContent() {
  const [captainName, setCaptainName] = useState("");
  const [captainRegNo, setCaptainRegNo] = useState("");
  const [captainEmail, setCaptainEmail] = useState("");
  const [captainPhone, setCaptainPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [teamName, setTeamName] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [sportId, setSportId] = useState("");
  const [category, setCategory] = useState<"Male" | "Female">("Male");
  const [tournamentOptions, setTournamentOptions] = useState<TournamentPayload[]>([]);
  const [sportOptions, setSportOptions] = useState<MongoSport[]>([]);
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [teamLogo, setTeamLogo] = useState<string>("");
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [nextTournament, setNextTournament] = useState<TournamentPayload | null>(null);

  const selectedSport = useMemo(
    () => sportOptions.find((s) => s._id === sportId),
    [sportId, sportOptions]
  );
  const selectedTournament = useMemo(
    () => tournamentOptions.find((tournament) => tournament._id === tournamentId),
    [tournamentId, tournamentOptions]
  );
  const requiredPlayers = Math.max(1, Number(selectedSport?.minPlayers || 1));
  const maxPlayers = Math.max(requiredPlayers, Number(selectedSport?.maxPlayers || requiredPlayers));
  const sportCategories = selectedSport?.categories?.length ? selectedSport.categories : ["Male", "Female"];

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

    setTournamentOptions(validOpenTournaments);
    setRegistrationOpen(Boolean(activeTournament));
    setNextTournament(upcomingTournament);
    setTournamentId((current) => {
      if (current && validOpenTournaments.some((tournament) => tournament._id === current)) return current;
      return activeTournament?._id || validOpenTournaments[0]?._id || "";
    });
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
      if (sports.length > 0 && !sportId) {
        setSportId(sports[0]._id);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [sportId]);

  const handleLogoUpload = (file: File | null) => {
    if (!file) {
      setTeamLogoFile(null);
      setTeamLogo("");
      return;
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      setStatus("error");
      setMessage("Logo must be a JPG, JPEG, PNG, or WebP image.");
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setStatus("error");
      setMessage("Logo must be a JPG, JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setStatus("error");
      setMessage("Logo must be under 2MB.");
      return;
    }

    setTeamLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setTeamLogo(String(e.target?.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const updateMember = (index: number, field: keyof MemberInput, value: string) => {
    const nextMembers = Array.from({ length: maxPlayers }, (_, i) => members[i] || emptyMember());
    nextMembers[index] = {
      ...nextMembers[index],
      [field]: field === "registrationNo" ? normalizeRegNo(value) : value,
    };
    setMembers(nextMembers);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const cleanDepartment = normalizeDepartment(department);
    const cleanTeamName = teamName.trim();
    const cleanCaptainName = captainName.trim();
    const cleanCaptainRegNo = normalizeRegNo(captainRegNo);
    const cleanCaptainEmail = captainEmail.trim().toLowerCase();
    const cleanCaptainPhone = normalizePhone(captainPhone);

    const cleanMembers: TeamRegistrationMember[] = members
      .slice(0, maxPlayers)
      .map((member) => ({
        fullName: member.fullName.trim(),
        registrationNo: normalizeRegNo(member.registrationNo),
        department: member.department.trim() || cleanDepartment,
        semester: member.semester.trim(),
        gender: member.gender || category,
        email: member.email.trim(),
        phone: member.phone.trim(),
      }))
      .filter((member) => member.fullName || member.registrationNo);

    // Validation
    if (!tournamentId) { setStatus("error"); setMessage("Please select a tournament."); return; }
    if (!sportId) { setStatus("error"); setMessage("Please select a sport."); return; }
    if (!category) { setStatus("error"); setMessage("Please select a category."); return; }
    if (!cleanDepartment) { setStatus("error"); setMessage("Department is required."); return; }
    if (!cleanTeamName) { setStatus("error"); setMessage("Team name is required."); return; }
    if (!cleanCaptainName) { setStatus("error"); setMessage("Captain name is required."); return; }
    if (!cleanCaptainRegNo) { setStatus("error"); setMessage("Captain registration number is required."); return; }
    if (!cleanCaptainEmail) { setStatus("error"); setMessage("Captain email is required."); return; }
    if (!cleanCaptainPhone || cleanCaptainPhone.length !== 10) { setStatus("error"); setMessage("Captain phone must be exactly 10 digits."); return; }

    if (cleanMembers.length < requiredPlayers) {
      setStatus("error");
      setMessage(`Please enter at least ${requiredPlayers} player${requiredPlayers === 1 ? "" : "s"} for ${selectedSport?.sportName || "this sport"}.`);
      return;
    }

    if (cleanMembers.some((member) => !member.fullName || !member.registrationNo)) {
      setStatus("error");
      setMessage("Each team member must include full name and registration number.");
      return;
    }

    // Check duplicates within submission
    const allRegNos = [cleanCaptainRegNo, ...cleanMembers.map((m) => m.registrationNo)];
    if (new Set(allRegNos).size !== allRegNos.length) {
      setStatus("error");
      setMessage("Duplicate registration number found in the same team submission.");
      return;
    }

    try {
      const sportName = selectedSport?.sportName || selectedSport?.name || "";
      const tournamentName = selectedTournament?.name || "";

      const payload: TeamRegistrationWritePayload = {
        tournamentId,
        tournamentName,
        sportId,
        sportName,
        category,
        department: cleanDepartment,
        teamName: cleanTeamName,
        teamLogo,
        captainName: cleanCaptainName,
        captainRegNo: cleanCaptainRegNo,
        captainEmail: cleanCaptainEmail,
        captainPhone: cleanCaptainPhone,
        members: cleanMembers,
      };

      await submitTeamRegistration(payload);

      setStatus("success");
      setMessage(`${cleanTeamName} has been registered successfully and is pending approval.`);
      setCaptainName("");
      setCaptainRegNo("");
      setCaptainEmail("");
      setCaptainPhone("");
      setDepartment("");
      setTeamName("");
      setMembers([]);
      setTeamLogo("");
      setTeamLogoFile(null);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6 text-slate-950 sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-950 sm:mb-8">
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 md:p-10">
          <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:mb-8 sm:pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Users size={24} />
              </div>
              <h1 className="sport-heading text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Team Registration</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
                Register your team with sport, category, captain details, and player information.
              </p>
            </div>
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
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
                <Field label="Department *">
                  <input value={department} onChange={(e) => setDepartment(e.target.value)} required className="input-light uppercase" placeholder="CSE, Management, Applied Sciences" />
                </Field>
                <Field label="Team Name *">
                  <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required className="input-light" placeholder="e.g. CSE Warriors" />
                </Field>
                <Field label="Tournament *">
                  <select value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} className="input-light" required>
                    {tournamentOptions.map((item) => (
                      <option key={item._id} value={item._id}>{item.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Sport *">
                  <select value={sportId} onChange={(e) => { setSportId(e.target.value); setMembers([]); }} className="input-light" required>
                    {sportOptions.map((item) => (
                      <option key={item._id} value={item._id}>{item.sportName || item.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Category *">
                  <select value={category} onChange={(e) => { setCategory(e.target.value as "Male" | "Female"); setMembers([]); }} className="input-light" required>
                    {sportCategories.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Captain Name *">
                  <input value={captainName} onChange={(e) => setCaptainName(e.target.value)} required className="input-light" placeholder="Captain full name" />
                </Field>
                <Field label="Captain Registration No. *">
                  <input value={captainRegNo} onChange={(e) => setCaptainRegNo(normalizeRegNo(e.target.value))} required className="input-light uppercase" placeholder="UNIV2026001" />
                </Field>
                <Field label="Captain Email *">
                  <input type="email" value={captainEmail} onChange={(e) => setCaptainEmail(e.target.value)} required className="input-light" placeholder="name@university.edu" />
                </Field>
                <Field label="Captain Phone *">
                  <input type="tel" inputMode="numeric" pattern="\d{10}" maxLength={10} value={captainPhone} onChange={(e) => setCaptainPhone(normalizePhone(e.target.value))} required className="input-light" placeholder="10 digit phone number" />
                </Field>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Players Required</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{requiredPlayers}-{maxPlayers}</p>
                </div>
                <Field label="Team Logo (optional)">
                  <div className="flex flex-col gap-2">
                    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 transition-colors hover:border-amber-400 hover:text-amber-600">
                      <Upload size={16} />
                      {teamLogoFile ? teamLogoFile.name : "Upload JPG, PNG, or WebP"}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                        className="sr-only"
                      />
                    </label>
                    {teamLogoFile && (
                      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                        <span className="flex-1 truncate">{teamLogoFile.name}</span>
                        <button type="button" onClick={() => { setTeamLogoFile(null); setTeamLogo(""); }} className="text-red-500 hover:text-red-700">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </Field>
              </div>

              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-950">Team Members</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">Enter each player&apos;s details. Registration no. is a unique player ID and cannot be used in another sport.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {maxPlayers} slots
                  </span>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {Array.from({ length: maxPlayers }).map((_, index) => (
                    <div key={`${sportId}-${category}-${index}`} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      <input
                        value={members[index]?.fullName || ""}
                        onChange={(e) => updateMember(index, "fullName", e.target.value)}
                        required={index < requiredPlayers}
                        className="input-light"
                        placeholder={`Player ${index + 1} full name *`}
                      />
                      <input
                        value={members[index]?.registrationNo || ""}
                        onChange={(e) => updateMember(index, "registrationNo", e.target.value)}
                        required={index < requiredPlayers}
                        className="input-light uppercase"
                        placeholder="Registration no. *"
                      />
                      <input
                        value={members[index]?.semester || ""}
                        onChange={(e) => updateMember(index, "semester", e.target.value)}
                        className="input-light"
                        placeholder="Semester"
                      />
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
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-slate-700 sm:p-8">
              <h2 className="text-xl font-black text-slate-900 sm:text-2xl">Registration Closed</h2>
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
    <ProtectedRoute allowedRole={["coordinator", "admin", "supercoordinator"]}>
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
