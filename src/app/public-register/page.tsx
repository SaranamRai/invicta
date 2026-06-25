"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Upload, Users } from "lucide-react";

import {
  getPublicSports,
  getPublicTournaments,
  MongoSport,
  registerPublicTeam,
  TournamentPayload,
  verifyRegistrationIdCard,
} from "@/lib/api";

const normalizeDepartment = (value: string) => value.trim().replace(/\s+/g, " ").toUpperCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);
const normalizeRegNo = (value: string) => value.trim().replace(/\s+/g, "").toUpperCase();

type MemberInput = {
  fullName: string;
  registrationNumber: string;
  semester: string;
  gender: string;
  email: string;
  phone: string;
  idCardFile: File | null;
  verification: PlayerVerification;
};

type VerificationStatus = "not_uploaded" | "scanning" | "verified" | "mismatch" | "unreadable" | "manual_review";

type PlayerVerification = {
  status: VerificationStatus;
  extractedRegistrationNumber: string;
  message: string;
  verificationToken: string;
  confidence?: number;
};

const emptyVerification = (): PlayerVerification => ({
  status: "not_uploaded",
  extractedRegistrationNumber: "",
  message: "Upload each player's student ID card to verify the registration number.",
  verificationToken: "",
});

const emptyMember = (): MemberInput => ({
  fullName: "",
  registrationNumber: "",
  semester: "",
  gender: "",
  email: "",
  phone: "",
  idCardFile: null,
  verification: emptyVerification(),
});

export default function PublicRegisterPage() {
  const [captainName, setCaptainName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [captainRegNo, setCaptainRegNo] = useState("");
  const [department, setDepartment] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [sportId, setSportId] = useState("");
  const [category, setCategory] = useState<"Male" | "Female">("Male");
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [tournamentOptions, setTournamentOptions] = useState<TournamentPayload[]>([]);
  const [sportOptions, setSportOptions] = useState<MongoSport[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [nextTournament, setNextTournament] = useState<TournamentPayload | null>(null);
  const [captainIdCardFile, setCaptainIdCardFile] = useState<File | null>(null);
  const [captainVerification, setCaptainVerification] = useState<PlayerVerification>(emptyVerification());

  const selectedSport = useMemo(
    () => sportOptions.find((sport) => sport._id === sportId),
    [sportId, sportOptions]
  );
  const selectedTournament = useMemo(
    () => tournamentOptions.find((tournament) => tournament._id === tournamentId),
    [tournamentId, tournamentOptions]
  );
  const minPlayers = Math.max(1, Number(selectedSport?.minPlayers || 1));
  const maxPlayers = Math.max(minPlayers, Number(selectedSport?.maxPlayers || minPlayers));
  const requiredMembers = Math.max(0, minPlayers - 1);
  const maxMembers = Math.max(requiredMembers, maxPlayers - 1);
  const playerCountLabel = minPlayers === maxPlayers
    ? `${maxPlayers} Player${maxPlayers === 1 ? "" : "s"}`
    : `${minPlayers}-${maxPlayers} Players`;

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

    async function loadTournamentSettings() {
      const [tournaments, sports] = await Promise.all([
        getPublicTournaments(),
        getPublicSports(),
      ]);
      if (!isMounted) return;
      updateRegistrationWindow(tournaments);
      setSportOptions(sports);
      setSportId((current) => current || sports[0]?._id || "");
    }

    void loadTournamentSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateMember = (index: number, field: keyof MemberInput, value: string) => {
    const nextMembers = Array.from({ length: maxMembers }, (_, i) => members[i] || emptyMember());
    nextMembers[index] = {
      ...nextMembers[index],
      [field]: field === "registrationNumber" ? normalizeRegNo(value) : value,
      ...(field === "registrationNumber" ? { verification: emptyVerification() } : {}),
    };
    setMembers(nextMembers);
  };

  const updateMemberIdCard = (index: number, file: File | null) => {
    const nextMembers = Array.from({ length: maxMembers }, (_, i) => members[i] || emptyMember());
    nextMembers[index] = { ...nextMembers[index], idCardFile: file, verification: emptyVerification() };
    setMembers(nextMembers);
  };

  const setMemberVerification = (index: number, verification: PlayerVerification) => {
    const nextMembers = Array.from({ length: maxMembers }, (_, i) => members[i] || emptyMember());
    nextMembers[index] = { ...nextMembers[index], verification };
    setMembers(nextMembers);
  };

  const verifyPlayerId = async (playerRole: "captain" | "member", index: number) => {
    const typedRegistrationNumber = playerRole === "captain" ? normalizeRegNo(captainRegNo) : normalizeRegNo(members[index]?.registrationNumber);
    const idCardImage = playerRole === "captain" ? captainIdCardFile : members[index]?.idCardFile;
    if (!typedRegistrationNumber) {
      setStatus("error");
      setMessage("Registration number is required before ID verification.");
      return;
    }
    if (!idCardImage) {
      setStatus("error");
      setMessage("ID card image is required.");
      return;
    }
    const scanningState: PlayerVerification = { status: "scanning", extractedRegistrationNumber: "", message: "Scanning...", verificationToken: "" };
    if (playerRole === "captain") setCaptainVerification(scanningState);
    else setMemberVerification(index, scanningState);
    try {
      const result = await verifyRegistrationIdCard({ playerRole, playerIndex: index, typedRegistrationNumber, idCardImage });
      const nextVerification: PlayerVerification = {
        status: result.status,
        extractedRegistrationNumber: result.extractedRegistrationNumber || "",
        message: result.message,
        verificationToken: result.verificationToken || "",
        confidence: result.confidence,
      };
      if (playerRole === "captain") setCaptainVerification(nextVerification);
      else setMemberVerification(index, nextVerification);
    } catch (error) {
      const nextVerification: PlayerVerification = {
        status: "unreadable",
        extractedRegistrationNumber: "",
        message: error instanceof Error ? error.message : "Could not read registration number. Please upload a clearer image.",
        verificationToken: "",
      };
      if (playerRole === "captain") setCaptainVerification(nextVerification);
      else setMemberVerification(index, nextVerification);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const cleanDepartment = normalizeDepartment(department);
    const cleanMembers = members
      .slice(0, maxMembers)
      .map((member) => ({
        fullName: member.fullName.trim(),
        registrationNumber: normalizeRegNo(member.registrationNumber),
        department: cleanDepartment,
        gender: category,
        semester: member.semester.trim(),
        email: member.email.trim().toLowerCase(),
        phone: member.phone.trim(),
        verificationToken: member.verification.verificationToken,
      }))
      .filter((member) => member.fullName || member.registrationNumber);
    const cleanPhone = normalizePhone(phone);
    const cleanCaptainRegNo = normalizeRegNo(captainRegNo);

    if (!captainName.trim() || !cleanCaptainRegNo || !email.trim() || !phone.trim() || !cleanDepartment || !tournamentId || !sportId) {
      setStatus("error");
      setMessage("Please fill all required team contact details.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setStatus("error");
      setMessage("Phone number must be exactly 10 digits.");
      return;
    }
    if (captainVerification.status !== "verified" || !captainVerification.verificationToken) {
      setStatus("error");
      setMessage("Please verify ID card for every player before submitting the team registration.");
      return;
    }

    if (cleanMembers.length < requiredMembers) {
      setStatus("error");
      setMessage(`Please enter at least ${requiredMembers} other member${requiredMembers === 1 ? "" : "s"} for ${selectedSport?.sportName || selectedSport?.name || "this sport"}. Total players includes the captain.`);
      return;
    }

    if (cleanMembers.some((member) => !member.fullName || !member.registrationNumber)) {
      setStatus("error");
      setMessage("Each team member must include full name and registration number.");
      return;
    }
    if (cleanMembers.some((member) => !member.email)) {
      setStatus("error");
      setMessage("Each team member must include an email.");
      return;
    }
    if (cleanMembers.some((member) => !member.verificationToken)) {
      setStatus("error");
      setMessage("Please verify ID card for every player before submitting the team registration.");
      return;
    }
    const allRegNos = [cleanCaptainRegNo, ...cleanMembers.map((member) => member.registrationNumber)];
    if (new Set(allRegNos).size !== allRegNos.length) {
      setStatus("error");
      setMessage(allRegNos.slice(1).includes(cleanCaptainRegNo) ? "The captain is already included in the team. Please add only other members." : "This registration number is already used by another player.");
      return;
    }
    const allEmails = [email.trim().toLowerCase(), ...cleanMembers.map((member) => member.email)];
    if (new Set(allEmails).size !== allEmails.length) {
      setStatus("error");
      setMessage("This email is already used by another player.");
      return;
    }

    try {
      const registeredAt = Date.now();

      const teamData = {
        name: cleanDepartment,
        teamName: cleanDepartment,
        department: cleanDepartment,
        tournamentId,
        tournamentName: selectedTournament?.name || "",
        sportId,
        sportName: selectedSport?.sportName || selectedSport?.name,
        category,
        members: cleanMembers,
        playerRegisteredAt: cleanMembers.map(() => registeredAt),
        coachCaptain: captainName.trim(),
        contactNumber: cleanPhone,
        captainName: captainName.trim(),
        captainRegNo: cleanCaptainRegNo,
        email: email.trim(),
        captainEmail: email.trim(),
        captainVerificationToken: captainVerification.verificationToken,
        phone: cleanPhone,
        captainPhone: cleanPhone,
        status: "pending",
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        registeredAt,
        source: "public-registration",
      };

      const savedTeam = await registerPublicTeam(teamData);

      setStatus("success");
      setMessage(`${savedTeam.name || cleanDepartment} has been registered successfully and is pending approval from the supercoordinator.`);
      setCaptainName("");
      setEmail("");
      setPhone("");
      setCaptainRegNo("");
      setDepartment("");
      setMembers([]);
      setCaptainIdCardFile(null);
      setCaptainVerification(emptyVerification());
    } catch (error) {
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
                Use this form to register a team. Only the first two teams from each department are accepted.
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
                <div className="md:col-span-2">
                  <VerificationPanel
                    title="Captain ID Card Upload"
                    typedRegistrationNumber={normalizeRegNo(captainRegNo)}
                    file={captainIdCardFile}
                    verification={captainVerification}
                    onFileChange={(file) => {
                      setCaptainIdCardFile(file);
                      setCaptainVerification(emptyVerification());
                    }}
                    onVerify={() => verifyPlayerId("captain", 0)}
                  />
                </div>
                <Field label="Department *">
                  <input value={department} onChange={(event) => setDepartment(event.target.value)} required className="input-light uppercase" placeholder="CSE, Management, Applied Sciences" />
                </Field>
                <Field label="Tournament *">
                  <select value={tournamentId} onChange={(event) => setTournamentId(event.target.value)} className="input-light" required>
                    {tournamentOptions.map((item) => (
                      <option key={item._id} value={item._id}>{item.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Sport *">
                  <select value={sportId} onChange={(event) => { setSportId(event.target.value); setMembers([]); }} className="input-light" required>
                    {sportOptions.map((item) => (
                      <option key={item._id} value={item._id}>{item.sportName || item.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Category *">
                  <select value={category} onChange={(event) => { setCategory(event.target.value as "Male" | "Female"); setMembers([]); }} className="input-light" required>
                    {(selectedSport?.categories?.length ? selectedSport.categories : ["Male", "Female"]).map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Players Allowed</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{playerCountLabel}</p>
                  <p className="mt-1 text-xs font-bold text-amber-700">Total players includes the captain.</p>
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-950">Player Names</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">Captain is automatically included as a team member. Add only the remaining players.</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Upload each player&apos;s student ID card. The system will verify whether the typed registration number matches the ID card.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {maxMembers} member slots
                  </span>
                </div>

                <div className="space-y-4">
                  {Array.from({ length: maxMembers }).map((_, index) => (
                    <div key={`${sportId}-${category}-${index}`} className="rounded-xl border border-slate-200 p-3">
                      <div className="grid gap-3 md:grid-cols-4">
                        <input value={members[index]?.fullName || ""} onChange={(event) => updateMember(index, "fullName", event.target.value)} required={index < requiredMembers} className="input-light" placeholder={`Member ${index + 1} full name`} />
                        <input type="email" value={members[index]?.email || ""} onChange={(event) => updateMember(index, "email", event.target.value)} required={index < requiredMembers} className="input-light" placeholder="Member email" />
                        <input value={members[index]?.registrationNumber || ""} onChange={(event) => updateMember(index, "registrationNumber", event.target.value)} required={index < requiredMembers} className="input-light uppercase" placeholder="Registration no." />
                        <input value={members[index]?.semester || ""} onChange={(event) => updateMember(index, "semester", event.target.value)} className="input-light" placeholder="Semester" />
                      </div>
                      <div className="mt-3">
                        <VerificationPanel
                          title={`Member ${index + 1} ID Card Upload`}
                          typedRegistrationNumber={normalizeRegNo(members[index]?.registrationNumber || "")}
                          file={members[index]?.idCardFile || null}
                          verification={members[index]?.verification || emptyVerification()}
                          onFileChange={(file) => updateMemberIdCard(index, file)}
                          onVerify={() => verifyPlayerId("member", index)}
                        />
                      </div>
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
                The registration portal is currently disabled or outside the configured tournament window. Please check with the event staff.
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function VerificationPanel({
  title,
  typedRegistrationNumber,
  file,
  verification,
  onFileChange,
  onVerify,
}: {
  title: string;
  typedRegistrationNumber: string;
  file: File | null;
  verification: PlayerVerification;
  onFileChange: (file: File | null) => void;
  onVerify: () => void;
}) {
  const badgeClass =
    verification.status === "verified"
      ? "bg-emerald-100 text-emerald-700"
      : verification.status === "mismatch"
      ? "bg-red-100 text-red-700"
      : verification.status === "unreadable" || verification.status === "manual_review"
      ? "bg-yellow-100 text-yellow-800"
      : verification.status === "scanning"
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-600";
  const statusLabel = verification.status === "not_uploaded"
    ? "Not Uploaded"
    : verification.status === "manual_review"
    ? "Manual Review Required"
    : verification.status.charAt(0).toUpperCase() + verification.status.slice(1);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Typed Reg No: {typedRegistrationNumber || "Not entered"}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Extracted Reg No: {verification.extractedRegistrationNumber || "Not scanned"}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${badgeClass}`}>
          {statusLabel}
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-600">{verification.message}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-500 transition-colors hover:border-amber-400 hover:text-amber-600">
          <Upload size={16} />
          {file ? file.name : "Upload JPG, PNG, or WebP ID card"}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(event) => onFileChange(event.target.files?.[0] || null)}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          onClick={onVerify}
          disabled={verification.status === "scanning"}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {verification.status === "scanning" && <Loader2 className="animate-spin" size={16} />}
          Verify ID
        </button>
      </div>
    </div>
  );
}
