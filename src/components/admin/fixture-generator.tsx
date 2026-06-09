"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Zap } from "lucide-react";
import {
  Team,
  Fixture,
  generateFixtures as generateFixturesUtil,
} from "@/lib/fixture-generator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPublicSports, MongoSport } from "@/lib/api";

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
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [timeslots, setTimeslots] = useState<string[]>(DEFAULT_TIMESLOTS);
  const [newTimeslot, setNewTimeslot] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sportsList, setSportsList] = useState<MongoSport[]>([]);

  useEffect(() => {
    getPublicSports().then(setSportsList).catch(() => {});
  }, []);

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

  const handleGenerate = async () => {
    const targetTeams = selectedSport === "all" 
      ? teams 
      : teams.filter(t => t.sport === selectedSport);

    if (targetTeams.length < 2) {
      alert("Need at least 2 teams to generate fixtures for the selected sport.");
      return;
    }

    setGenerating(true);

    try {
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const fixtures = generateFixturesUtil(targetTeams, startDate, timeslots);
      onGenerateFixtures(fixtures);
      alert(`Generated ${fixtures.length} fixtures successfully!`);
    } catch (error) {
      alert("Error generating fixtures");
    } finally {
      setGenerating(false);
    }
  };

  const teamsBySport = (sportsList.length > 0 ? sportsList : []).reduce(
    (acc, sport) => {
      const id = (sport.sportName || sport.name || "").trim().toLowerCase().replace(/\s+/g, "-");
      acc[id] = teams.filter((t) => t.sport === id).length;
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
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-4 py-3 text-white focus:outline-none focus:border-accent appearance-none cursor-pointer"
            >
              <option value="all">All Sports</option>
              {sportsList.map((sport) => {
                const id = (sport.sportName || sport.name || "").trim().toLowerCase().replace(/\s+/g, "-");
                return <option key={id} value={id}>{sport.sportName || sport.name}</option>;
              })}
            </select>
          </CardContent>
        </Card>

        {/* Teams Overview */}
        <Card className="bg-slate-900/60 border-white/5 text-white md:col-span-2">
          <CardContent className="pt-6">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-3">
              Teams Available for Scheduling
            </label>
            <div className="space-y-2">
              {sportsList.map((sport) => {
                const id = (sport.sportName || sport.name || "").trim().toLowerCase().replace(/\s+/g, "-");
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span className="text-slate-400">{sport.sportName || sport.name}</span>
                    <span className="font-bold text-white">
                      {teamsBySport[id] || 0} teams
                    </span>
                  </div>
                );
              })}
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
