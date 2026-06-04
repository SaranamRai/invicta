"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ref, set } from "firebase/database";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, Loader2, Users } from "lucide-react";

import { db, rtdb } from "@/lib/firebase";
import { sports } from "@/lib/mock-data";
import { Team } from "@/lib/fixture-generator";
import { ProtectedRoute } from "@/components/protected-route";

const DEPARTMENT_TEAM_LIMIT = 2;

const playerCountsBySport: Record<string, number> = {
  football: 11,
  cricket: 11,
  volleyball: 6,
  badminton: 2,
  "table-tennis": 2,
};

const normalizeDepartment = (value: string) => value.trim().replace(/\s+/g, " ").toUpperCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

function RegisterPageContent() {
  const [captainName, setCaptainName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [sport, setSport] = useState(sports[0]?.id || "football");
  const [members, setMembers] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const requiredPlayers = playerCountsBySport[sport] || 1;
  const teamName = useMemo(() => normalizeDepartment(department), [department]);

  const updateMember = (index: number, value: string) => {
    const nextMembers = Array.from({ length: requiredPlayers }, (_, i) => members[i] || "");
    nextMembers[index] = value;
    setMembers(nextMembers);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const cleanDepartment = normalizeDepartment(department);
    const cleanMembers = Array.from({ length: requiredPlayers }, (_, index) => members[index]?.trim() || "");
    const cleanPhone = normalizePhone(phone);

    if (!captainName.trim() || !email.trim() || !phone.trim() || !cleanDepartment) {
      setStatus("error");
      setMessage("Please fill all required team contact details.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setStatus("error");
      setMessage("Phone number must be exactly 10 digits.");
      return;
    }

    if (cleanMembers.some((member) => !member)) {
      setStatus("error");
      setMessage(`Please enter all ${requiredPlayers} player names for ${sports.find((item) => item.id === sport)?.name || "this sport"}.`);
      return;
    }

    try {
      const departmentTeamsQuery = query(
        collection(db, "teams"),
        where("department", "==", cleanDepartment)
      );
      const departmentTeamsSnapshot = await getDocs(departmentTeamsQuery);

      if (departmentTeamsSnapshot.size >= DEPARTMENT_TEAM_LIMIT) {
        setStatus("error");
        setMessage(`${cleanDepartment} team quota is full. Only the first ${DEPARTMENT_TEAM_LIMIT} registered teams from each department are allowed.`);
        return;
      }

      const registeredAt = Date.now();

      const teamData: Omit<Team, "id"> & {
        captainName: string;
        email: string;
        phone: string;
        registeredAt: number;
        playerRegisteredAt: number[];
        source: "public-registration";
      } = {
        name: cleanDepartment,
        department: cleanDepartment,
        sport,
        members: cleanMembers,
        playerRegisteredAt: cleanMembers.map(() => registeredAt),
        coachCaptain: captainName.trim(),
        contactNumber: cleanPhone,
        captainName: captainName.trim(),
        email: email.trim(),
        phone: cleanPhone,
        status: "approved",
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        registeredAt,
        source: "public-registration",
      };

      const teamRef = doc(collection(db, "teams"));
      await Promise.all([
        setDoc(teamRef, teamData),
        set(ref(rtdb, `teams/${teamRef.id}`), {
          id: teamRef.id,
          ...teamData,
        }),
      ]);
      setStatus("success");
      setMessage(`${cleanDepartment} has been registered successfully.`);
      setCaptainName("");
      setEmail("");
      setPhone("");
      setDepartment("");
      setMembers([]);
    } catch (error) {
      console.error("Team registration failed:", error);
      setStatus("error");
      setMessage("Registration failed. Please try again.");
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

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Name *">
                <input value={captainName} onChange={(event) => setCaptainName(event.target.value)} required className="input-light" placeholder="Captain or representative name" />
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
                <select value={sport} onChange={(event) => { setSport(event.target.value); setMembers([]); }} className="input-light">
                  {sports.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Players Required</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{requiredPlayers}</p>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-950">Player Names</h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">Enter exactly {requiredPlayers} player names for the selected sport.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                  {requiredPlayers} slots
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: requiredPlayers }).map((_, index) => (
                  <input
                    key={`${sport}-${index}`}
                    value={members[index] || ""}
                    onChange={(event) => updateMember(index, event.target.value)}
                    required
                    className="input-light"
                    placeholder={`Player ${index + 1} name`}
                  />
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
