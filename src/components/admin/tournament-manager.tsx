/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trophy, Calendar, AlignLeft, RefreshCw, Eye, Tag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { sports } from "@/lib/mock-data";
import { db } from "@/lib/firebase";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";

export interface Tournament {
  id: string;
  name: string;
  sport: string;
  startDate: string;
  endDate: string;
  type: "round-robin" | "knockout";
  status: "upcoming" | "ongoing" | "completed";
  teamsCount: number;
}

interface TournamentManagerProps {
  teamsCountBySport: Record<string, number>;
  canEdit?: boolean;
}

export function TournamentManager({ teamsCountBySport, canEdit = true }: TournamentManagerProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("football");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<"round-robin" | "knockout">("round-robin");
  const [status, setStatus] = useState<"upcoming" | "ongoing" | "completed">("upcoming");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tournaments"), (snapshot) => {
      setTournaments(snapshot.docs.map((tournamentDoc) => ({ id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament)));
    });

    return () => unsubscribe();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Tournament Name is required");
      return;
    }

    const newTour: Tournament = {
      id: `tour-${Date.now()}`,
      name: name.trim(),
      sport,
      startDate,
      endDate,
      type,
      status,
      teamsCount: teamsCountBySport[sport] || 0
    };

    setDoc(doc(db, "tournaments", newTour.id), newTour);

    setName("");
    setSport("football");
    setShowForm(false);
    alert(`Tournament "${newTour.name}" created successfully!`);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this tournament?")) {
      deleteDoc(doc(db, "tournaments", id));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black sport-heading text-white">Tournaments Manager</h2>
          <p className="text-sm text-slate-400">Create new tournaments, configure settings and track active events.</p>
        </div>
        {!showForm && canEdit && (
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
                    {sports.map(s => (
                      <option key={s.id} value={s.id} className="bg-slate-950 text-white">{s.name}</option>
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
              </div>

              {canEdit && (
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
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tournaments.map((tour) => {
          const sName = sports.find(s => s.id === tour.sport)?.name || tour.sport;
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

                {canEdit && (
                  <div className="flex gap-2 pt-2 border-t border-white/5 justify-end">
                    <button
                      onClick={() => handleDelete(tour.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
