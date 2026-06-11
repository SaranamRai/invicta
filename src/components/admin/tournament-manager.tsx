/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Trophy, Calendar, AlignLeft, Dumbbell, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createAdminTournament, deleteAdminTournament, getAdminTournaments, toggleAdminTournamentRegistration, getStoredSession, getAdminSports, createAdminSport, updateAdminSport, deleteAdminSport, MongoSport } from "@/lib/api";

export interface Tournament {
  id: string;
  name: string;
  sport: string;
  startDate: string;
  endDate: string;
  registrationOpen?: boolean;
  type: "round-robin" | "knockout";
  status: "upcoming" | "ongoing" | "completed";
  teamsCount: number;
}

interface TournamentManagerProps {
  teamsCountBySport: Record<string, number>;
}

export function TournamentManager({ teamsCountBySport }: TournamentManagerProps) {
  // Sports management state
  const [mongoSports, setMongoSports] = useState<MongoSport[]>([]);
  const [showSportForm, setShowSportForm] = useState(false);
  const [sportFormName, setSportFormName] = useState("");
  const [sportFormCategories, setSportFormCategories] = useState<("Male" | "Female")[]>(["Male", "Female"]);
  const [sportFormType, setSportFormType] = useState<"indoor" | "outdoor">("outdoor");
  const [sportFormMinPlayers, setSportFormMinPlayers] = useState(5);
  const [sportFormMaxPlayers, setSportFormMaxPlayers] = useState(15);
  const [sportFormRules, setSportFormRules] = useState("");
  const [sportFormStatus, setSportFormStatus] = useState<"active" | "inactive">("active");
  const [editingSportId, setEditingSportId] = useState<string | null>(null);

  // Tournaments state
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("football");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [type, setType] = useState<"round-robin" | "knockout">("round-robin");
  const [status, setStatus] = useState<"upcoming" | "ongoing" | "completed">("upcoming");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalizeSportValue = (value?: string) =>
    String(value || "").trim().toLowerCase().replace(/\s+/g, "-");

  const sportOptions = [
    { id: "all", name: "All Sports" },
    ...mongoSports.map((s) => ({
      id: normalizeSportValue(s.sportName || s.name || ""),
      name: s.sportName || s.name || "",
    })),
  ];
  const getSportName = (sportId: string) => {
    return sportOptions.find((item) => item.id === sportId)?.name || sportId;
  };

  const sportsLoaded = useRef(false);
  const initialSport = useRef(sport);

  useEffect(() => {
    async function loadSports() {
      try {
        const list = await getAdminSports();
        setMongoSports(list);
        if (!sportsLoaded.current && list.length > 0) {
          sportsLoaded.current = true;
          if (!list.some((s) => normalizeSportValue(s.sportName || s.name || "") === initialSport.current)) {
            setSport(normalizeSportValue(list[0].sportName || list[0].name || ""));
          }
        }
      } catch { /* ignore */ }
    }
    void loadSports();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTournaments() {
      const nextTournaments = await getAdminTournaments();
      if (!isMounted) return;
      setTournaments(nextTournaments.map((tournament) => ({
        ...tournament,
        id: String(tournament.id || tournament._id || ""),
      })));
    }

    void loadTournaments();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Tournament Name is required");
      return;
    }

    const newTour = {
      name: name.trim(),
      sport,
      startDate,
      endDate,
      registrationOpen,
      type,
      status,
      teamsCount: teamsCountBySport[sport] || 0
    };

    const savedTournament = await createAdminTournament(newTour);
    setTournaments((current) => [{ ...savedTournament, id: String(savedTournament.id || savedTournament._id || "") }, ...current]);

    setName("");
    setSport("football");
    setShowForm(false);
    setSuccessMessage(`Tournament "${newTour.name}" created successfully!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this tournament?")) {
      await deleteAdminTournament(id);
      setTournaments((current) => current.filter((tournament) => tournament.id !== id));
    }
  };

  const toggleRegistrationOpen = async (tournament: Tournament) => {
    try {
      if (!tournament.id) {
        setErrorMessage("Tournament identifier missing — cannot open portal.");
        setTimeout(() => setErrorMessage(null), 4000);
        return;
      }
      const session = getStoredSession();
      if (!session?.token) {
        setErrorMessage("Admin login required to change registration portal state.");
        setTimeout(() => setErrorMessage(null), 4000);
        return;
      }
      const updated = await toggleAdminTournamentRegistration(tournament.id, !tournament.registrationOpen);
      setTournaments((current) => current.map((item) => {
        if (item.id !== tournament.id) return item;
        return {
          ...item,
          registrationOpen: updated.registrationOpen,
        };
      }));
    } catch (error) {
      console.error("Failed to toggle registration portal:", error);
      setErrorMessage(error instanceof Error ? error.message : "Could not update registration status.");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Sport CRUD handlers
  const resetSportForm = () => {
    setSportFormName("");
    setSportFormCategories(["Male", "Female"]);
    setSportFormType("outdoor");
    setSportFormMinPlayers(5);
    setSportFormMaxPlayers(15);
    setSportFormRules("");
    setSportFormStatus("active");
    setEditingSportId(null);
  };

  const handleCreateSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sportFormName.trim()) {
      setErrorMessage("Sport name is required");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    try {
      if (editingSportId) {
        await updateAdminSport(editingSportId, {
          sportName: sportFormName.trim(),
          categories: sportFormCategories,
          type: sportFormType,
          minPlayers: sportFormMinPlayers,
          maxPlayers: sportFormMaxPlayers,
          rules: sportFormRules.trim() || undefined,
          status: sportFormStatus,
        });
      } else {
        await createAdminSport({
          sportName: sportFormName.trim(),
          categories: sportFormCategories,
          type: sportFormType,
          minPlayers: sportFormMinPlayers,
          maxPlayers: sportFormMaxPlayers,
          rules: sportFormRules.trim() || undefined,
          status: sportFormStatus,
        });
      }
      const list = await getAdminSports();
      setMongoSports(list);
      resetSportForm();
      setShowSportForm(false);
      setSuccessMessage(editingSportId ? "Sport updated successfully!" : "Sport created successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save sport");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleEditSport = (sport: MongoSport) => {
    setSportFormName(sport.sportName || sport.name || "");
    setSportFormCategories(sport.categories || ["Male", "Female"]);
    setSportFormType(sport.type || "outdoor");
    setSportFormMinPlayers(sport.minPlayers || 5);
    setSportFormMaxPlayers(sport.maxPlayers || 15);
    setSportFormRules(sport.rules || "");
    setSportFormStatus(sport.status || "active");
    setEditingSportId(sport._id);
    setShowSportForm(true);
  };

  const handleDeleteSport = async (id: string, name: string) => {
    if (confirm(`Delete sport "${name}"? This cannot be undone.`)) {
      try {
        await deleteAdminSport(id);
        setMongoSports((prev) => prev.filter((s) => s._id !== id));
        setSuccessMessage(`Sport "${name}" deleted.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not delete sport");
        setTimeout(() => setErrorMessage(null), 4000);
      }
    }
  };

  const toggleCategory = (cat: "Male" | "Female") => {
    setSportFormCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {successMessage}
        </div>
      )}

      {/* Sports Management Section */}
      <Card className="bg-slate-900/60 border-white/5">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Dumbbell size={19} />
              </div>
              <div>
                <h3 className="sport-heading text-lg font-black text-white">Sports</h3>
                <p className="text-xs font-semibold text-slate-400">Manage sport categories for fixtures and tournaments.</p>
              </div>
            </div>
            {!showSportForm && (
              <button
                onClick={() => { resetSportForm(); setShowSportForm(true); }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.01]"
              >
                <Plus size={15} />
                Add Sport
              </button>
            )}
          </div>

          {showSportForm && (
            <form onSubmit={handleCreateSport} className="mb-5 rounded-xl border border-accent/20 bg-slate-950/40 p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1.5">Sport Name *</label>
                  <input
                    type="text"
                    value={sportFormName}
                    onChange={(e) => setSportFormName(e.target.value)}
                    placeholder="e.g. Football"
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1.5">Type</label>
                  <select
                    value={sportFormType}
                    onChange={(e) => setSportFormType(e.target.value as "indoor" | "outdoor")}
                    className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-slate-950 px-4 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent"
                  >
                    <option value="outdoor">Outdoor</option>
                    <option value="indoor">Indoor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1.5">Status</label>
                  <select
                    value={sportFormStatus}
                    onChange={(e) => setSportFormStatus(e.target.value as "active" | "inactive")}
                    className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-slate-950 px-4 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-accent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1.5">Min Players</label>
                  <input
                    type="number"
                    value={sportFormMinPlayers}
                    onChange={(e) => setSportFormMinPlayers(Number(e.target.value))}
                    min={1}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1.5">Max Players</label>
                  <input
                    type="number"
                    value={sportFormMaxPlayers}
                    onChange={(e) => setSportFormMaxPlayers(Number(e.target.value))}
                    min={1}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1.5">Categories</label>
                  <div className="flex h-11 items-center gap-4 rounded-xl border border-white/10 bg-slate-950 px-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                      <input type="checkbox" checked={sportFormCategories.includes("Male")} onChange={() => toggleCategory("Male")} className="accent-accent" />
                      Male
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                      <input type="checkbox" checked={sportFormCategories.includes("Female")} onChange={() => toggleCategory("Female")} className="accent-accent" />
                      Female
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1.5">Rules (optional)</label>
                <textarea
                  value={sportFormRules}
                  onChange={(e) => setSportFormRules(e.target.value)}
                  placeholder="Describe rules or upload a document link..."
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-accent resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => { resetSportForm(); setShowSportForm(false); }}
                  className="h-10 rounded-xl border border-white/10 bg-slate-800 px-5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.01]"
                >
                  {editingSportId ? "Update Sport" : "Create Sport"}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mongoSports.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-slate-950/30 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white uppercase truncate">{s.sportName || s.name}</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">
                    {s.categories?.join(" / ") || "N/A"} &middot; {s.type || "outdoor"} &middot; {s.minPlayers || "?"}-{s.maxPlayers || "?"} players
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEditSport(s)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-400 hover:text-white transition-all"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteSport(s._id, s.sportName || s.name || "")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {mongoSports.length === 0 && (
              <p className="col-span-full text-center text-sm text-slate-500 py-6">No sports configured yet. Add your first sport above.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tournaments Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black sport-heading text-white">Tournaments Manager</h2>
          <p className="text-sm text-slate-400">Create new tournaments, configure settings and track active events.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 py-3 text-accent-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-accent/15 cursor-pointer"
          >
            <Plus size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Create Tournament</span>
            <div className="absolute inset-0 translate-x-[-100%] bg-white/20 transition-transform group-hover:translate-x-0" />
          </button>
        )}
      </div>

      {showForm && (
        <Card className="bg-slate-900 border border-accent/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-amber-500" />
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Trophy className="text-accent" size={20} />
              Configure New Tournament
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                    Tournament Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., Spring Football Cup 2026"
                    className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-accent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                    Sport Category
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-3 text-white focus:outline-none focus:border-accent cursor-pointer"
                  >
                    {sportOptions.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-950 text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-3 text-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-3 text-white focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                    Tournament Format
                  </label>
                  <div className="flex gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-300">
                      <input
                        type="radio"
                        checked={type === "round-robin"}
                        onChange={() => setType("round-robin")}
                        className="accent-accent"
                      />
                      Round Robin (Leagues)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-300">
                      <input
                        type="radio"
                        checked={type === "knockout"}
                        onChange={() => setType("knockout")}
                        className="accent-accent"
                      />
                      Knockout (Playoffs)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-3 text-white focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="upcoming" className="bg-slate-950 text-white">Upcoming</option>
                    <option value="ongoing" className="bg-slate-950 text-white">Ongoing</option>
                    <option value="completed" className="bg-slate-950 text-white">Completed</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <input
                    id="registration-open-toggle"
                    type="checkbox"
                    checked={registrationOpen}
                    onChange={(e) => setRegistrationOpen(e.target.checked)}
                    className="h-4 w-4 accent-accent"
                  />
                  <label htmlFor="registration-open-toggle" className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                    Open Registration Portal
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 rounded-xl bg-slate-800 border border-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-700 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-accent text-accent-foreground font-black text-xs uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-95 shadow-lg shadow-accent/15 transition-all"
                >
                  Publish Tournament
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tournaments.map((tour) => {
          const sName = getSportName(tour.sport);
          return (
            <Card key={tour.id} className="bg-slate-900/60 border border-white/5 text-white hover:border-white/15 transition-all relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-[3px] ${
                tour.status === "ongoing" ? "bg-green-500" :
                tour.status === "completed" ? "bg-blue-500" : "bg-amber-500"
              }`} />
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-black text-white text-lg uppercase tracking-wide">{tour.name}</h3>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-accent border border-accent/20 bg-accent/5 px-2.5 py-0.5 rounded">
                        {sName}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-950 border border-white/5 px-2.5 py-0.5 rounded">
                        {tour.type === "round-robin" ? "Round Robin" : "Knockout"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                    tour.status === "ongoing" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                    tour.status === "completed" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                    "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  }`}>
                    {tour.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs border-t border-white/5 pt-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar size={14} className="text-slate-500" />
                    <span>{tour.startDate} to {tour.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <AlignLeft size={14} className="text-slate-500" />
                    <span>{tour.teamsCount} teams configured</span>
                  </div>
                </div>

                <div className="grid gap-2 pt-2 border-t border-white/5 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                      tour.registrationOpen ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                      "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}>
                      {tour.registrationOpen ? "Registration Open" : "Registration Closed"}
                    </span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => toggleRegistrationOpen(tour)}
                      disabled={!tour.id}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${!tour.id ? "opacity-50 cursor-not-allowed" : (tour.registrationOpen ? "bg-slate-700 border border-white/10 text-white hover:bg-slate-600" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20")}`}
                      aria-disabled={!tour.id}
                    >
                      {tour.registrationOpen ? "Close Portal" : "Open Portal"}
                    </button>
                    <button
                      onClick={() => handleDelete(tour.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
