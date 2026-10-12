"use client";

import React, { useState } from "react";
import { Calendar, Clock, Zap } from "lucide-react";
import {
  Team,
  Fixture,
  generateFixtures as generateFixturesUtil,
} from "@/lib/fixture-generator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { sports } from "@/lib/mock-data";

const DEFAULT_TIMESLOTS = ["09:00", "11:00", "14:00", "16:00", "18:00"];

interface FixtureGeneratorProps {
  teams: Team[];
  onGenerateFixtures: (fixtures: Fixture[]) => void;
}

export function FixtureGenerator({
  teams,
  onGenerateFixtures,
}: FixtureGeneratorProps) {
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSports, setSelectedSports] = useState<string[]>(sports.map((sport) => sport.id));
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>(
    () => Object.fromEntries(sports.map((sport) => [sport.id, ["Male", "Female"]]))
  );
  const [timeslots, setTimeslots] = useState<string[]>(DEFAULT_TIMESLOTS);
  const [newTimeslot, setNewTimeslot] = useState("");
  const [fullMatchMinutes, setFullMatchMinutes] = useState(45);
  const [matchGapMinutes, setMatchGapMinutes] = useState(15);
  const [generating, setGenerating] = useState(false);

  const handleAddTimeslot = () => {
    if (newTimeslot && !timeslots.includes(newTimeslot)) {
      setTimeslots([...timeslots].sort());
      setTimeslots(([...timeslots, newTimeslot].sort()));
      setNewTimeslot("");
    }
  };

  const handleRemoveTimeslot = (slot: string) => {
    setTimeslots(timeslots.filter((t) => t !== slot));
  };

  const toggleSport = (sportId: string) => {
    setSelectedSports((current) =>
      current.includes(sportId)
        ? current.filter((item) => item !== sportId)
        : [...current, sportId]
    );
  };

  const toggleCategory = (sportId: string, category: string) => {
    setSelectedCategories((current) => {
      const sportCategories = current[sportId] || [];
      return {
        ...current,
        [sportId]: sportCategories.includes(category)
          ? sportCategories.filter((item) => item !== category)
          : [...sportCategories, category],
      };
    });
  };

  const handleGenerate = async () => {
    const targetTeams = teams.filter((team) =>
      selectedSports.includes(team.sport) &&
      (!(team.category) || (selectedCategories[team.sport] || []).includes(team.category))
    );

    if (targetTeams.length < 2) {
      alert("Need at least 2 teams to generate fixtures for the selected sports.");
      return;
    }

    setGenerating(true);

    try {
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const fixtures = generateFixturesUtil(targetTeams, startDate, timeslots, fullMatchMinutes, matchGapMinutes);
      onGenerateFixtures(fixtures);
      alert(`Generated ${fixtures.length} fixtures successfully!`);
    } catch {
      alert("Error generating fixtures");
    } finally {
      setGenerating(false);
    }
  };

  const teamsBySport = sports.reduce(
    (acc, sport) => {
      acc[sport.id] = teams.filter((t) => t.sport === sport.id).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black sport-heading text-white">
        Create Match Fixtures
      </h2>
      <p className="max-w-2xl text-sm font-semibold leading-relaxed text-slate-400">
        Choose the first match date, pick the sports to include, set time slots, and publish the schedule for visitors and volunteers.
      </p>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Date */}
        <Card className="bg-slate-900/60 border-white/5 text-white">
          <CardContent className="pt-6">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                First Match Date
              </div>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-accent"
            />
          </CardContent>
        </Card>

        {/* Sport Selection */}
        <Card className="bg-slate-900/60 border-white/5 text-white">
          <CardContent className="pt-6">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-3">
              <div className="flex items-center gap-2">
                <Zap size={16} />
                Sports to Schedule
              </div>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {sports.map((sport) => (
                <div key={sport.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white">
                    <input
                      type="checkbox"
                      checked={selectedSports.includes(sport.id)}
                      onChange={() => toggleSport(sport.id)}
                      className="accent-accent"
                    />
                    {sport.name}
                  </label>
                  <div className="mt-3 flex gap-2">
                    {["Male", "Female"].map((category) => (
                      <label key={category} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <input
                          type="checkbox"
                          checked={(selectedCategories[sport.id] || []).includes(category)}
                          onChange={() => toggleCategory(sport.id, category)}
                          disabled={!selectedSports.includes(sport.id)}
                          className="accent-accent disabled:opacity-50"
                        />
                        {category}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Teams Overview */}
        <Card className="bg-slate-900/60 border-white/5 text-white md:col-span-2">
          <CardContent className="pt-6">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-3">
              Teams Available for Scheduling
            </label>
            <div className="space-y-2">
              {sports.map((sport) => (
                <div key={sport.id} className="flex justify-between text-sm">
                  <span className="text-slate-400">{sport.name}</span>
                  <span className="font-bold text-white">
                    {teamsBySport[sport.id] || 0} teams
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeslots Configuration */}
      <Card className="bg-slate-900/60 border-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock size={20} />
            Match Time Slots
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="time"
              value={newTimeslot}
              onChange={(e) => setNewTimeslot(e.target.value)}
              className="flex-1 rounded-lg bg-slate-950/60 border border-white/10 px-4 py-2 text-white focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleAddTimeslot}
              className="px-4 py-2 rounded-lg bg-accent/20 border border-accent/50 text-accent hover:bg-accent/30 transition-colors font-bold"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {timeslots.map((slot) => (
              <div
                key={slot}
                className="flex items-center gap-2 rounded-lg bg-accent/20 border border-accent/50 px-3 py-2"
              >
                <span className="text-sm font-bold text-accent">{slot}</span>
                <button
                  onClick={() => handleRemoveTimeslot(slot)}
                  className="text-accent/60 hover:text-accent transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-white/5 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Clock size={20} />
            Match Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent">Full Time Minutes</span>
            <input
              type="number"
              min={1}
              value={fullMatchMinutes}
              onChange={(e) => setFullMatchMinutes(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-accent"
            />
          </label>
          <label className="space-y-2">
            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent">Gap After Match Minutes</span>
            <input
              type="number"
              min={0}
              value={matchGapMinutes}
              onChange={(e) => setMatchGapMinutes(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-accent"
            />
          </label>
        </CardContent>
      </Card>

      {/* Generation Info */}
      <Card className="bg-gradient-to-r from-accent/10 to-transparent border-accent/50 text-white">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Zap className="text-accent mt-1" size={18} />
              <div>
                <p className="font-bold text-white">What happens when you publish fixtures</p>
                <p className="text-sm text-slate-400">
                  The app creates match pairings and avoids assigning the same department to two matches at the same date and time.
                  The public Matches page and volunteer dashboard update after publishing.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || teams.length < 2}
        className="group relative w-full flex h-16 items-center justify-center overflow-hidden rounded-xl bg-accent text-accent-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-accent/10 disabled:opacity-50"
      >
        <span className="relative z-10 text-sm font-black uppercase tracking-[0.2em] sport-heading">
          {generating ? "Creating Fixtures..." : "Create and Publish Fixtures"}
        </span>
        <div className="absolute inset-0 translate-x-[-100%] bg-white/20 transition-transform group-hover:translate-x-0" />
      </button>
    </div>
  );
}
