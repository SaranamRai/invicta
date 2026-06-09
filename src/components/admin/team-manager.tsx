/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState, useRef } from "react";
import {
  Plus, Trash2, Users, Search, Filter,
  Upload, X, Edit, Phone, User,
  Award, RefreshCw, Calendar
} from "lucide-react";
import { Team } from "@/lib/fixture-generator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { sports } from "@/lib/mock-data";

interface ExtendedTeam extends Team {
  coachCaptain?: string;
  contactNumber?: string;
  logo?: string; // base64 representation
  status?: "approved" | "pending" | "rejected";
  wins?: number;
  losses?: number;
  registeredAt?: number;
  playerRegisteredAt?: number[];
}

interface TeamManagerProps {
  teams: Team[];
  onAddTeam?: (team: Team) => void;
  onRemoveTeam?: (teamId: string) => void;
  onUpdateTeam?: (team: Team) => void; // Made optional just in case, but we will write it in page.tsx
}

export function TeamManager({
  teams,
  onAddTeam,
  onRemoveTeam,
  onUpdateTeam
}: TeamManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [sport, setSport] = useState("football");
  const [department, setDepartment] = useState("");
  const [coachCaptain, setCoachCaptain] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [logo, setLogo] = useState("");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [registeredAt, setRegisteredAt] = useState<number | undefined>();
  const [playerRegisteredAt, setPlayerRegisteredAt] = useState<number[]>([]);

  // Members input (tag style)
  const [memberInput, setMemberInput] = useState("");
  const [membersList, setMembersList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddMember = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && memberInput.trim()) {
      e.preventDefault();
      if (!membersList.includes(memberInput.trim())) {
        setMembersList([...membersList, memberInput.trim()]);
      }
      setMemberInput("");
    }
  };

  const handleAddMemberBtn = () => {
    if (memberInput.trim()) {
      if (!membersList.includes(memberInput.trim())) {
        setMembersList([...membersList, memberInput.trim()]);
      }
      setMemberInput("");
    }
  };

  const handleRemoveMember = (memberToRemove: string) => {
    setMembersList(membersList.filter((m) => m !== memberToRemove));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setName("");
    setSport("football");
    setDepartment("");
    setCoachCaptain("");
    setContactNumber("");
    setLogo("");
    setWins(0);
    setLosses(0);
    setRegisteredAt(undefined);
    setPlayerRegisteredAt([]);
    setMembersList([]);
    setMemberInput("");
    setEditingTeamId(null);
    setShowForm(false);
  };

  const openEditModal = (team: ExtendedTeam) => {
    setEditingTeamId(team.id);
    setName(team.name);
    setSport(team.sport);
    setDepartment(team.department || "");
    setCoachCaptain(team.coachCaptain || "");
    setContactNumber(team.contactNumber || "");
    setLogo(team.logo || "");
    setWins(team.wins || 0);
    setLosses(team.losses || 0);
    setMembersList(team.members || []);
    setRegisteredAt(team.registeredAt);
    setPlayerRegisteredAt(team.playerRegisteredAt || []);
    setShowForm(true);
  };

  const formatDate = (value?: number) => {
    if (!value) {
      return "Not recorded";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not recorded";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Team Name is required");
      return;
    }

    const savedRegisteredAt = registeredAt || Date.now();
    const savedPlayerRegisteredAt = membersList.map((_, index) => playerRegisteredAt[index] || savedRegisteredAt);

    const teamData: ExtendedTeam = {
      id: editingTeamId || `team-${Date.now()}`,
      name: name.trim(),
      sport,
      department: department.trim(),
      members: membersList,
      playerRegisteredAt: savedPlayerRegisteredAt,
      coachCaptain: coachCaptain.trim(),
      contactNumber: contactNumber.trim(),
      logo,
      status: "approved",
      wins,
      losses,
      registeredAt: savedRegisteredAt,
    };

    if (editingTeamId && onUpdateTeam) {
      onUpdateTeam(teamData);
      alert("Team details updated successfully!");
    } else if (onAddTeam) {
      onAddTeam(teamData);
      alert("New team registered successfully!");
    } else {
      alert("You don't have permission to add teams.");
    }

    resetForm();
  };

  // Get departments for filter dropdown
  const uniqueDepartments = Array.from(
    new Set(teams.map((t) => t.department).filter(Boolean))
  ) as string[];

  // Filter & Search Logic
  const filteredTeams = teams.filter((team: ExtendedTeam) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.department && team.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (team.coachCaptain && team.coachCaptain.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSport = selectedSport ? team.sport === selectedSport : true;
    const matchesDept = selectedDepartment ? team.department === selectedDepartment : true;

    return matchesSearch && matchesSport && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black sport-heading text-white">
            Teams and Players
          </h2>
          <p className="text-sm text-slate-400">
            Add new department teams, edit captain contact details, and review player lists before fixtures are created.
          </p>
        </div>
        {!showForm && onAddTeam && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-accent px-6 py-3 text-accent-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-accent/15 self-start sm:self-auto"
          >
            <Plus size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">
              Add Team
            </span>
            <div className="absolute inset-0 translate-x-[-100%] bg-white/20 transition-transform group-hover:translate-x-0" />
          </button>
        )}
      </div>

      {/* Add / Edit Team Form */}
      {showForm && (
        <Card className="bg-slate-900 border border-accent/30 shadow-2xl relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-amber-500" />
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              {editingTeamId ? <Edit className="text-accent" size={20} /> : <Plus className="text-accent" size={20} />}
              {editingTeamId ? `Edit Team: ${name}` : "Add a New Team"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* Logo upload (Base64) */}
                <div className="md:col-span-2 lg:col-span-1 flex flex-col justify-center items-center p-4 border border-dashed border-white/10 rounded-xl bg-slate-950/40">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-3">Team Crest / Logo</span>
                  {logo ? (
                    <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-2 border-accent/50 bg-slate-900 flex items-center justify-center mb-3">
                      <img src={logo} alt="Team logo" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setLogo("")}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-2xl border border-white/10 bg-slate-900 flex flex-col items-center justify-center gap-1 text-slate-500 mb-3 hover:border-accent/40 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={20} />
                      <span className="text-[9px] uppercase font-bold tracking-wider">Upload PNG</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <p className="text-[9px] text-slate-500 text-center uppercase tracking-wide">Max size: 1MB. Recommended square ratio.</p>
                </div>

                {/* Main credentials fields */}
                <div className="space-y-4 md:col-span-1">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter team name"
                      className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                      Sport Category
                    </label>
                    <select
                      value={sport}
                      onChange={(e) => setSport(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-all"
                    >
                      {sports.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-950 text-white">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                      Department / Wing
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="E.g., CSE, Management, Applied Sciences"
                      className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                  </div>
                </div>

                {/* Coach & Captain, Wins / Losses */}
                <div className="space-y-4 md:col-span-1">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                      Coach / Team Captain
                    </label>
                    <input
                      type="text"
                      value={coachCaptain}
                      onChange={(e) => setCoachCaptain(e.target.value)}
                      placeholder="Enter lead captain/coach name"
                      className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="10 digit contact details"
                      className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                        Wins Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={wins}
                        onChange={(e) => setWins(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">
                        Losses Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={losses}
                        onChange={(e) => setLosses(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded-xl bg-slate-950/60 border border-white/15 px-4 py-2.5 text-white focus:outline-none focus:border-accent transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Squad Members Tag Creator */}
                <div className="md:col-span-2 lg:col-span-3 space-y-2 border-t border-white/5 pt-4">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                    Squad Members ({membersList.length} registered)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyDown={handleAddMember}
                      placeholder="Type player name and hit Enter or click Add"
                      className="flex-1 rounded-xl bg-slate-950/60 border border-white/15 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleAddMemberBtn}
                      className="px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/40 text-accent font-bold text-xs uppercase tracking-wider hover:bg-accent/20 transition-all"
                    >
                      Add
                    </button>
                  </div>

                  {/* Render Tags list */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {membersList.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">No squad members added yet. Type and add players above.</span>
                    ) : (
                      membersList.map((m, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/95 border border-white/10 text-xs font-semibold text-slate-200">
                          <span>{m}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Form Action buttons */}
              <div className="flex gap-3 border-t border-white/5 pt-5 justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 rounded-xl bg-slate-800 border border-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-700 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 rounded-xl bg-accent text-accent-foreground font-black text-xs uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-95 shadow-lg shadow-accent/15 transition-all"
                >
                  {editingTeamId ? "Update Details" : "Register Team"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Toolbar - Search, Sort, Filters */}
      <Card className="bg-slate-900/60 border-white/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">

            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3.5 text-slate-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams by name, department, or coach/captain..."
                className="w-full rounded-xl bg-slate-950/60 border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-accent transition-all"
              />
            </div>

            {/* Filter selectors */}
            <div className="flex flex-wrap gap-2">
              {/* Sport filter */}
              <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/10 rounded-xl px-3 py-1">
                <Filter size={12} className="text-slate-400" />
                <select
                  value={selectedSport}
                  onChange={(e) => setSelectedSport(e.target.value)}
                  className="bg-transparent border-0 text-xs font-bold text-white uppercase focus:outline-none pr-6 cursor-pointer"
                >
                  <option value="" className="bg-slate-950">All Sports</option>
                  {sports.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-950 text-white">{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Department filter */}
              <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/10 rounded-xl px-3 py-1">
                <Users size={12} className="text-slate-400" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="bg-transparent border-0 text-xs font-bold text-white uppercase focus:outline-none pr-6 cursor-pointer"
                >
                  <option value="" className="bg-slate-950">All Wings</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept} className="bg-slate-950 text-white">{dept}</option>
                  ))}
                </select>
              </div>

              {/* Reset button */}
              {(selectedSport || selectedDepartment || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedSport("");
                    setSelectedDepartment("");
                    setSearchQuery("");
                  }}
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1 self-center px-2 py-1"
                >
                  <RefreshCw size={12} /> Reset
                </button>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Grid of Team Cards */}
      <div className="space-y-6">
        {filteredTeams.length === 0 ? (
          <Card className="bg-slate-900/60 border-dashed border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users size={48} className="text-slate-600 mb-4 animate-pulse" />
              <p className="text-slate-400 font-semibold text-lg">No Teams Found</p>
              <p className="text-slate-500 text-sm max-w-sm mt-1">
                Try modifying your query filters or search terms, or click "Register Team" to add a new team.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team: ExtendedTeam) => {
              const sportName = sports.find((s) => s.id === team.sport)?.name || team.sport;
              return (
                <Card
                  key={team.id}
                  className="bg-slate-900/60 border border-white/10 hover:border-white/20 transition-all duration-300 relative flex flex-col justify-between overflow-hidden shadow-xl"
                >
                  {/* Status indicator bar */}
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-accent" />

                  <CardContent className="p-6 space-y-4 flex-1">
                    {/* Upper row: Logo & info */}
                    <div className="flex items-start gap-4">
                      {/* Logo or Initials */}
                      {team.logo ? (
                        <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shrink-0 flex items-center justify-center">
                          <img src={team.logo} alt={team.name} className="h-full w-full object-contain" />
                        </div>
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-accent/20 to-amber-500/20 border border-accent/30 text-accent font-black text-xl shrink-0 flex items-center justify-center uppercase tracking-tighter">
                          {team.name.slice(0, 2)}
                        </div>
                      )}

                      {/* Header details */}
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-black text-white text-base truncate leading-snug uppercase">{team.name}</h4>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          {team.department || "No Department"}
                        </span>

                        {/* Sport Category badge */}
                        <span className="inline-block text-[9px] font-black uppercase tracking-widest text-accent border border-accent/20 bg-accent/5 px-2 py-0.5 rounded mt-1.5">
                          {sportName}
                        </span>
                      </div>

                    </div>

                    {/* Contact & Coach details */}
                    <div className="space-y-2 text-xs border-t border-white/5 pt-3">
                      {team.coachCaptain && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <User size={14} className="text-slate-500" />
                          <span className="font-semibold truncate">C/C: {team.coachCaptain}</span>
                        </div>
                      )}

                      {team.contactNumber && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Phone size={14} className="text-slate-500" />
                          <span className="text-[11px] font-mono">{team.contactNumber}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar size={14} className="text-slate-500" />
                        <span className="text-[11px] font-semibold">Registered: {formatDate(team.registeredAt)}</span>
                      </div>

                      {/* Wins / Losses and overall record */}
                      <div className="flex items-center gap-2 text-slate-300 bg-slate-950/40 rounded-lg p-2 border border-white/5 w-fit">
                        <Award size={14} className="text-accent" />
                        <span className="font-black uppercase tracking-wider text-[10px]">
                          Record: <span className="text-green-400">{team.wins || 0}W</span> - <span className="text-red-400">{team.losses || 0}L</span>
                        </span>
                      </div>
                    </div>

                    {/* Squad size & mini-avatars block */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <Users size={14} />
                        <span className="font-bold">{team.members?.length || 0} Squad members</span>
                      </div>

                      {/* Short summary of members tags */}
                      {team.members && team.members.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {team.members.slice(0, 4).map((member, mIdx) => (
                            <span key={mIdx} className="text-[9px] font-medium px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-white/5">
                              {member}
                            </span>
                          ))}
                          {team.members.length > 4 && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent">
                              +{team.members.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>

                  {/* Actions Bar inside card */}
                  <div className="p-4 border-t border-white/5 bg-slate-950/30 flex gap-2">
                    <div className="flex-1 flex gap-2">
                      {onUpdateTeam ? (
                        <button
                          onClick={() => openEditModal(team)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 border border-white/10 text-white hover:bg-slate-700 transition-colors py-2 text-xs font-bold"
                        >
                          <Edit size={13} /> Edit
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-800/30 border border-white/5 text-slate-500 py-2 text-xs font-bold">Observer</div>
                      )}

                      {onRemoveTeam ? (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove "${team.name}"?`)) {
                              onRemoveTeam(team.id);
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors py-2 text-xs font-bold"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      ) : (
                        <div className="text-xs font-bold px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400/40 transition-all">&nbsp;</div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
