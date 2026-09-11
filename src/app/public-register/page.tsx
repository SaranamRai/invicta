"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { AppToast } from "@/components/ui/app-toast";
import { getPublicSports, getPublicTournaments, MongoSport, registerPublicTeam, TournamentPayload } from "@/lib/api";

type Member = { fullName: string; registrationNumber: string; semester: string; email: string; phone: string };
const emptyMember = (): Member => ({ fullName: "", registrationNumber: "", semester: "", email: "", phone: "" });
const text = (value: string) => value.trim().replace(/\s+/g, " ");
const regNo = (value: string) => value.trim().replace(/\s+/g, "").toUpperCase();
const phoneNumber = (value: string) => value.replace(/\D/g, "").slice(0, 10);

export default function PublicRegisterPage() {
  const [captainName, setCaptainName] = useState(""); const [captainRegNo, setCaptainRegNo] = useState("");
  const [captainSemester, setCaptainSemester] = useState("");
  const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [department, setDepartment] = useState("");
  const [tournamentId, setTournamentId] = useState(""); const [sportId, setSportId] = useState(""); const [category, setCategory] = useState<"Male" | "Female" | "Mixed">("Male");
  const [members, setMembers] = useState<Member[]>([]); const [tournaments, setTournaments] = useState<TournamentPayload[]>([]); const [sports, setSports] = useState<MongoSport[]>([]);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle"); const [message, setMessage] = useState("");
  const openTournaments = useMemo(() => tournaments.filter((item) => item.registrationOpen), [tournaments]);
  const selectedSport = sports.find((item) => item._id === sportId); const selectedTournament = openTournaments.find((item) => (item._id || item.id) === tournamentId);
  const minPlayers = Math.max(1, Number(selectedSport?.minPlayers || 1)); const maxPlayers = Math.max(minPlayers, Number(selectedSport?.maxPlayers || minPlayers));
  const requiredMembers = minPlayers - 1; const maxMembers = maxPlayers - 1;

  useEffect(() => { let active = true; void Promise.all([getPublicTournaments(), getPublicSports()]).then(([nextTournaments, nextSports]) => {
    if (!active) return; setTournaments(nextTournaments); setSports(nextSports);
    const first = nextTournaments.find((item) => item.registrationOpen && Date.now() <= new Date(item.endDate).setHours(23, 59, 59, 999));
    setTournamentId(first?._id || first?.id || ""); setSportId(nextSports[0]?._id || "");
  }).catch(() => active && setMessage("Could not load registration options. Please try again.")); return () => { active = false; }; }, []);

  const updateMember = (index: number, key: keyof Member, value: string) => {
    const next = Array.from({ length: maxMembers }, (_, i) => members[i] || emptyMember());
    next[index] = { ...next[index], [key]: key === "registrationNumber" ? regNo(value) : key === "phone" ? phoneNumber(value) : value }; setMembers(next);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanMembers = members.slice(0, maxMembers).map((member) => ({ fullName: text(member.fullName), registrationNumber: regNo(member.registrationNumber), semester: text(member.semester), email: member.email.trim().toLowerCase(), phone: phoneNumber(member.phone), department: text(department).toUpperCase(), gender: category })).filter((member) => member.fullName || member.registrationNumber);
    const captain = { name: text(captainName), registrationNo: regNo(captainRegNo), email: email.trim().toLowerCase(), phone: phoneNumber(phone) };
    if (!tournamentId || !sportId || !text(department) || !captain.name || !captain.registrationNo || !captain.email || captain.phone.length !== 10 || !text(captainSemester)) { setStatus("error"); setMessage("Please complete all required captain details, including semester."); return; }
    if (cleanMembers.length < requiredMembers || cleanMembers.length > maxMembers || cleanMembers.some((member) => !member.fullName || !member.registrationNumber)) { setStatus("error"); setMessage(`Please enter ${requiredMembers} to ${maxMembers} team members with name and registration number. Member email, phone, and semester are optional.`); return; }
    const registrationNumbers = [captain.registrationNo, ...cleanMembers.map((member) => member.registrationNumber)]; const emails = [captain.email, ...cleanMembers.map((member) => member.email).filter(Boolean)];
    if (new Set(registrationNumbers).size !== registrationNumbers.length || new Set(emails).size !== emails.length) { setStatus("error"); setMessage("Each player must have a unique registration number. Entered email addresses must also be unique."); return; }
    setStatus("submitting"); setMessage("");
    try {
      const departmentName = text(department).toUpperCase(); const result = await registerPublicTeam({ name: departmentName, teamName: departmentName, department: departmentName, tournamentId, tournamentName: selectedTournament?.name || "", sportId, sportName: selectedSport?.sportName || selectedSport?.name || "", category, members: cleanMembers, captainName: captain.name, captainRegNo: captain.registrationNo, captainSemester: text(captainSemester), captainEmail: captain.email, captainPhone: captain.phone, contactNumber: captain.phone, email: captain.email, phone: captain.phone, status: "pending" });
      setStatus("success"); setMessage(`${result.name || "Your team"} is registered and awaiting super coordinator approval.`); setCaptainName(""); setCaptainRegNo(""); setCaptainSemester(""); setEmail(""); setPhone(""); setDepartment(""); setMembers([]);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Registration failed. Please try again."); }
  };

  return <main className="min-h-screen bg-white px-4 py-10 text-slate-950"><div className="mx-auto max-w-4xl"><Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-950"><ArrowLeft size={16} /> Back to Home</Link><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10"><div className="mb-8 border-b border-slate-200 pb-6"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Users size={24} /></div><h1 className="sport-heading text-3xl font-black">Team Registration</h1><p className="mt-2 text-sm font-medium text-slate-500">Register your team using official tournament details. Student ID verification is not required.</p></div><AppToast message={message} variant={status === "success" ? "success" : status === "error" ? "error" : "info"} onClose={() => setMessage("")} />
  {openTournaments.length ? <form onSubmit={submit} className="space-y-7"><div className="grid gap-4 md:grid-cols-2"><Field label="Department *"><input value={department} onChange={(e) => setDepartment(e.target.value)} required className="input-light" /></Field><Field label="Captain name *"><input value={captainName} onChange={(e) => setCaptainName(e.target.value)} required className="input-light" /></Field><Field label="Captain registration number *"><input value={captainRegNo} onChange={(e) => setCaptainRegNo(regNo(e.target.value))} required className="input-light uppercase" /></Field><Field label="Captain semester *"><input value={captainSemester} onChange={(e) => setCaptainSemester(e.target.value)} required className="input-light" placeholder="e.g. 4" /></Field><Field label="Captain email *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-light" /></Field><Field label="Captain phone *"><input value={phone} onChange={(e) => setPhone(phoneNumber(e.target.value))} required className="input-light" /></Field><Field label="Tournament *"><select value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} className="input-light" required>{openTournaments.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.name}</option>)}</select></Field><Field label="Sport *"><select value={sportId} onChange={(e) => { setSportId(e.target.value); setMembers([]); }} className="input-light" required>{sports.map((item) => <option key={item._id} value={item._id}>{item.sportName || item.name}</option>)}</select></Field><Field label="Category *"><select value={category} onChange={(e) => setCategory(e.target.value as "Male" | "Female")} className="input-light">{(selectedSport?.categories || ["Male", "Female"]).map((item) => <option key={item} value={item}>{item}</option>)}</select></Field></div><div><h2 className="text-sm font-black uppercase tracking-widest">Team members</h2><p className="mt-1 text-xs text-slate-500">Add {requiredMembers}–{maxMembers} members. The captain is included in the total player count.</p><div className="mt-4 space-y-3">{Array.from({ length: maxMembers }).map((_, index) => <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-5"><input value={members[index]?.fullName || ""} onChange={(e) => updateMember(index, "fullName", e.target.value)} required={index < requiredMembers} className="input-light" placeholder={`Member ${index + 1} name`} /><input value={members[index]?.registrationNumber || ""} onChange={(e) => updateMember(index, "registrationNumber", e.target.value)} required={index < requiredMembers} className="input-light uppercase" placeholder="Registration no." /><input type="email" value={members[index]?.email || ""} onChange={(e) => updateMember(index, "email", e.target.value)} required={index < requiredMembers} className="input-light" placeholder="Email" /><input value={members[index]?.semester || ""} onChange={(e) => updateMember(index, "semester", e.target.value)} className="input-light" placeholder="Semester" /><input value={members[index]?.phone || ""} onChange={(e) => updateMember(index, "phone", e.target.value)} className="input-light" placeholder="Phone" /></div>)}</div></div><button disabled={status === "submitting"} className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-slate-950 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60">{status === "submitting" && <Loader2 size={18} className="animate-spin" />} Register Team</button></form> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">Registration is currently closed. Please check back when a tournament registration window opens.</p>}</section></div></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>{children}</label>; }
