"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Trophy } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Team } from "@/lib/fixture-generator";
import { MatchData } from "@/lib/types";
import { getPublicFixtures, getPublicLiveScores, getPublicTeams, mapMongoFixture, mapMongoTeam } from "@/lib/api";
import { buildStandings, getAvailableSports } from "@/lib/live-data";
import { cn } from "@/lib/utils";

const categories = ["Inter-Department"];

export default function StandingsPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeSport, setActiveSport] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0] || "");

  useEffect(() => {
    let isMounted = true;

    async function loadStandingsData() {
      const [fixtures, liveScores, publicTeams] = await Promise.all([
        getPublicFixtures(),
        getPublicLiveScores(),
        getPublicTeams(),
      ]);

      if (!isMounted) return;

      const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
      setMatches(fixtures.map((fixture) => mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData));
      setTeams(publicTeams.map((team) => mapMongoTeam(team) as Team));
    };

    void loadStandingsData();
    const interval = window.setInterval(loadStandingsData, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const sports = useMemo(() => getAvailableSports(teams, matches), [teams, matches]);

  const activeSportId = activeSport || sports[0]?.id || "";

  const standings = useMemo(
    () => buildStandings(matches, teams, activeSportId),
    [matches, teams, activeSportId]
  );

  const handleExport = () => {
    const headers = "Rank,Team,Sport,Played,Won,Lost,Draws,Points\n";
    const rows = standings
      .map((team) => `${team.rank},"${team.team}",${team.sport},${team.played},${team.won},${team.lost},${team.draws},${team.pts}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "invicta-league-tables.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary">League Tables</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
            Compare departments by sport. Wins, losses, draws, and points update after match results are recorded.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={standings.length === 0}
          className="flex items-center gap-3 rounded-xl border-2 border-border bg-card px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={18} /> Download Stats
        </button>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {sports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => setActiveSport(sport.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                activeSportId === sport.id
                  ? "bg-primary border-primary text-primary-foreground shadow-xl"
                  : "bg-card border-border text-muted-foreground hover:border-accent hover:text-accent"
              )}
            >
              {sport.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-secondary/50 p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        key={`${activeSportId}-${activeCategory}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden border-2 p-0 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary text-[10px] font-black uppercase tracking-[0.2em] text-secondary-foreground">
                <tr>
                  <th className="px-8 py-5">Rank</th>
                  <th className="px-8 py-5">Department / Team</th>
                  <th className="px-8 py-5 text-center">Played</th>
                  <th className="px-8 py-5 text-center text-emerald-500">Won</th>
                  <th className="px-8 py-5 text-center text-rose-500">Lost</th>
                  <th className="px-8 py-5 text-center">Drawn</th>
                  <th className="px-8 py-5 text-right">POINTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {standings.length > 0 ? standings.map((team, i) => (
                  <tr key={`${team.sport}-${team.team}`} className={cn("group transition-all hover:bg-secondary/30", i < 3 && "bg-accent/5")}>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl font-black sport-heading text-xl shadow-inner",
                        i === 0 ? "bg-accent text-accent-foreground border-2 border-accent/20" :
                        i === 1 ? "bg-slate-200 text-slate-800" :
                        i === 2 ? "bg-amber-700/20 text-amber-900 dark:text-amber-200" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {team.rank}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-black sport-heading tracking-wide uppercase">{team.team}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-accent">{activeCategory}</p>
                    </td>
                    <td className="px-8 py-6 text-center text-lg font-bold">{team.played}</td>
                    <td className="px-8 py-6 text-center text-lg font-black sport-heading text-emerald-500">{team.won}</td>
                    <td className="px-8 py-6 text-center text-lg font-black sport-heading text-rose-500">{team.lost}</td>
                    <td className="px-8 py-6 text-center font-bold text-muted-foreground">{team.draws}</td>
                    <td className="px-8 py-6 text-right">
                      <span className="inline-flex h-12 min-w-[80px] items-center justify-center rounded-xl bg-primary px-4 text-xl font-black sport-heading text-primary-foreground shadow-lg shadow-primary/20">
                        {team.pts}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Trophy size={48} className="mx-auto mb-4 text-slate-700 opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        No league table data yet. Registered teams and completed matches will appear here automatically.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
