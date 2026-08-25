"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Trophy } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getPublicLeagueTable, getPublicTournaments, LeagueTableRow, TournamentPayload } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function StandingsPage() {
  const [standings, setStandings] = useState<LeagueTableRow[]>([]);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [activeSport, setActiveSport] = useState("");
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    let isMounted = true;

    void getPublicTournaments().then((data) => {
      if (isMounted) setTournaments(data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadStandingsData() {
      if (!selectedTournamentId) {
        setStandings([]);
        return;
      }

      const rows = await getPublicLeagueTable({ tournamentId: selectedTournamentId });
      if (isMounted) setStandings(rows);
    };

    void loadStandingsData();
    const interval = window.setInterval(loadStandingsData, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [selectedTournamentId]);

  const sports = useMemo(() => Array.from(new Map(standings.map((row) => [row.sportId || row.sport, row.sport])).entries()).map(([id, name]) => ({ id, name })), [standings]);
  const categories = useMemo(() => Array.from(new Set(standings.filter((row) => !activeSport || row.sportId === activeSport).map((row) => row.category))).filter(Boolean), [standings, activeSport]);

  const activeSportId = activeSport || sports[0]?.id || "";

  const visibleStandings = useMemo(() => standings.filter((row) => (!activeSportId || row.sportId === activeSportId || row.sport === activeSportId) && (!activeCategory || row.category === activeCategory)), [standings, activeSportId, activeCategory]);

  const handleExport = () => {
    const headers = "Rank,Team,Sport,Played,Won,Drawn,Lost,Goals For,Goals Against,Points\n";
    const rows = visibleStandings
      .map((team) => `${team.position},"${team.team}",${team.sport},${team.played},${team.wins},${team.draws},${team.losses},${team.goalsFor},${team.goalsAgainst},${team.points}`)
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
          disabled={visibleStandings.length === 0}
          className="flex items-center gap-3 rounded-xl border-2 border-border bg-card px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={18} /> Download Stats
        </button>
      </header>

      <div className="max-w-md space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tournament</label>
        <select
          value={selectedTournamentId}
          onChange={(event) => setSelectedTournamentId(event.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground outline-none focus:border-accent"
        >
          <option value="">Select tournament</option>
          {tournaments.map((tournament) => (
            <option key={tournament._id || tournament.id} value={tournament._id || tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedTournamentId ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm font-semibold text-muted-foreground">
          Please select a tournament.
        </div>
      ) : (
        <>

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
                  <th className="px-8 py-5 text-center">GF</th>
                  <th className="px-8 py-5 text-center">GA</th>
                  <th className="px-8 py-5 text-right">POINTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {visibleStandings.length > 0 ? visibleStandings.map((team, i) => (
                  <tr key={`${team.sport}-${team.team}`} className={cn("group transition-all hover:bg-secondary/30", i < 3 && "bg-accent/5")}>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl font-black sport-heading text-xl shadow-inner",
                        i === 0 ? "bg-accent text-accent-foreground border-2 border-accent/20" :
                        i === 1 ? "bg-slate-200 text-slate-800" :
                        i === 2 ? "bg-amber-700/20 text-amber-900 dark:text-amber-200" :
                        "bg-secondary text-muted-foreground"
                      )}>
                        {team.position}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-black sport-heading tracking-wide uppercase">{team.team}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-accent">{team.category}</p>
                    </td>
                    <td className="px-8 py-6 text-center text-lg font-bold">{team.played}</td>
                    <td className="px-8 py-6 text-center text-lg font-black sport-heading text-emerald-500">{team.wins}</td>
                    <td className="px-8 py-6 text-center text-lg font-black sport-heading text-rose-500">{team.losses}</td>
                    <td className="px-8 py-6 text-center font-bold text-muted-foreground">{team.draws}</td>
                    <td className="px-8 py-6 text-center font-bold">{team.goalsFor}</td>
                    <td className="px-8 py-6 text-center font-bold">{team.goalsAgainst}</td>
                    <td className="px-8 py-6 text-right">
                      <span className="inline-flex h-12 min-w-[80px] items-center justify-center rounded-xl bg-primary px-4 text-xl font-black sport-heading text-primary-foreground shadow-lg shadow-primary/20">
                        {team.points}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
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
        </>
      )}
    </div>
  );
}
