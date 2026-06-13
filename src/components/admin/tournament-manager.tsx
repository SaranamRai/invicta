/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Download, MapPin, Plus, Trophy, Calendar, AlignLeft, Activity, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { sports } from "@/lib/mock-data";
import {
  createAdminSport,
  createAdminTournament,
  createAdminVenue,
  deleteAdminSport,
  deleteAdminTournament,
  getAdminSports,
  getAdminTournamentReport,
  getAdminTournaments,
  getAdminVenues,
  toggleAdminTournamentRegistration,
  getStoredSession,
  MongoSport,
  VenuePayload,
} from "@/lib/api";

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
  const [venues, setVenues] = useState<VenuePayload[]>([]);
  const [sportRecords, setSportRecords] = useState<MongoSport[]>([]);
  const [sportName, setSportName] = useState("");
  const [sportType, setSportType] = useState<"indoor" | "outdoor">("outdoor");
  const [sportStatus, setSportStatus] = useState<"active" | "inactive">("active");
  const [sportCategories, setSportCategories] = useState<("Male" | "Female")[]>(["Male", "Female"]);
  const [venueName, setVenueName] = useState("");
  const [venueLocation, setVenueLocation] = useState("");
  const [venueSportType, setVenueSportType] = useState("both");
  const [venueCapacity, setVenueCapacity] = useState("");
  const [venueStatus, setVenueStatus] = useState("active");

  const sportOptions = [{ id: "all", name: "All Sports" }, ...sports];
  const getSportName = (sportId: string) => {
    return sportOptions.find((item) => item.id === sportId)?.name || sportId;
  };

  useEffect(() => {
    let isMounted = true;

    async function loadTournaments() {
      const [nextTournaments, nextVenues, nextSports] = await Promise.all([
        getAdminTournaments(),
        getAdminVenues().catch(() => []),
        getAdminSports().catch(() => []),
      ]);
      if (!isMounted) return;
      setTournaments(nextTournaments.map((tournament) => ({
        ...tournament,
        id: String(tournament.id || tournament._id || ""),
      })));
      setVenues(nextVenues);
      setSportRecords(nextSports);
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

  const handleCreateVenue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!venueName.trim()) {
      setErrorMessage("Venue name is required.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const savedVenue = await createAdminVenue({
      venueName: venueName.trim(),
      name: venueName.trim(),
      location: venueLocation.trim(),
      sportType: venueSportType,
      capacity: venueCapacity ? Number(venueCapacity) : undefined,
      status: venueStatus,
    });

    setVenues((current) => [savedVenue, ...current]);
    setVenueName("");
    setVenueLocation("");
    setVenueCapacity("");
    setSuccessMessage("Venue created successfully.");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleCreateSport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sportName.trim()) {
      setErrorMessage("Sport name is required.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    if (sportCategories.length === 0) {
      setErrorMessage("Select at least one category for this sport.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    const savedSport = await createAdminSport({
      sportName: sportName.trim(),
      categories: sportCategories,
      type: sportType,
      status: sportStatus,
    });

    setSportRecords((current) => [savedSport, ...current.filter((item) => item._id !== savedSport._id)]);
    setSportName("");
    setSportType("outdoor");
    setSportStatus("active");
    setSportCategories(["Male", "Female"]);
    setSuccessMessage("Sport created successfully.");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDeleteSport = async (id?: string) => {
    if (!id) return;
    if (!confirm("Remove this sport from setup?")) return;
    await deleteAdminSport(id);
    setSportRecords((current) => current.filter((item) => item._id !== id));
  };

  const handleDownloadReport = async (tournament: Tournament) => {
    const report = await getAdminTournamentReport(tournament.id);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${tournament.name.replace(/\s+/g, "-").toLowerCase()}-report.json`;
    link.click();
    URL.revokeObjectURL(link.href);
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

      <Card className="bg-slate-900/60 border border-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="text-accent" size={20} />
            Sport Creation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSport} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_150px_150px_220px_auto]">
            <input
              type="text"
              value={sportName}
              onChange={(event) => setSportName(event.target.value)}
              placeholder="Sport name"
              className="h-12 rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
            />
            <select
              value={sportType}
              onChange={(event) => setSportType(event.target.value as "indoor" | "outdoor")}
              className="h-12 rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm font-bold text-white outline-none focus:border-accent"
            >
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
            </select>
            <select
              value={sportStatus}
              onChange={(event) => setSportStatus(event.target.value as "active" | "inactive")}
              className="h-12 rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm font-bold text-white outline-none focus:border-accent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3">
              {(["Male", "Female"] as const).map((category) => (
                <label key={category} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <input
                    type="checkbox"
                    checked={sportCategories.includes(category)}
                    onChange={(event) => {
                      setSportCategories((current) =>
                        event.target.checked
                          ? [...new Set([...current, category])]
                          : current.filter((item) => item !== category)
                      );
                    }}
                    className="accent-accent"
                  />
                  {category}
                </label>
              ))}
            </div>
            <button className="h-12 rounded-xl bg-accent px-5 text-xs font-black uppercase tracking-widest text-accent-foreground">
              Save Sport
            </button>
          </form>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sportRecords.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm font-bold text-slate-500">No sports created yet.</p>
            ) : sportRecords.map((item) => (
              <div key={item._id || item.sportName || item.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-white">{item.sportName || item.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {(item.categories || []).join(" / ") || "No categories"} / {item.type || "type"} / {item.status || "active"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSport(item._id)}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                  aria-label="Delete sport"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border border-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MapPin className="text-accent" size={20} />
            Venue Creation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateVenue} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_150px_130px_130px_auto]">
            <input
              type="text"
              value={venueName}
              onChange={(event) => setVenueName(event.target.value)}
              placeholder="Venue name"
              className="h-12 rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
            />
            <input
              type="text"
              value={venueLocation}
              onChange={(event) => setVenueLocation(event.target.value)}
              placeholder="Location"
              className="h-12 rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
            />
            <select
              value={venueSportType}
              onChange={(event) => setVenueSportType(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm font-bold text-white outline-none focus:border-accent"
            >
              <option value="both">Both</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
            <input
              type="number"
              min="0"
              value={venueCapacity}
              onChange={(event) => setVenueCapacity(event.target.value)}
              placeholder="Capacity"
              className="h-12 rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-accent"
            />
            <select
              value={venueStatus}
              onChange={(event) => setVenueStatus(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm font-bold text-white outline-none focus:border-accent"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="h-12 rounded-xl bg-accent px-5 text-xs font-black uppercase tracking-widest text-accent-foreground">
              Save Venue
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {venues.map((venue) => (
              <span key={venue._id || venue.id || venue.venueName} className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                {venue.venueName || venue.name} / {venue.sportType}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

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
                      onClick={() => handleDownloadReport(tour)}
                      className="px-3.5 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 text-xs font-bold transition-all"
                    >
                      <Download size={12} className="inline" /> Report
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
