/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Trophy, Download, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Team, Fixture } from "@/lib/fixture-generator";
import { sports } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// Shared key — user-facing standings page reads from here
export const STANDINGS_STORAGE_KEY = "admin_standings";

export interface LeaderboardRow {
  rank: number;
  teamId: string;
  name: string;
  sport: string;
  tournamentId?: string;
  tournamentName?: string;
  category?: string;
  department: string;
  logo?: string;
  played: number;
  won: number;
  lost: number;
  draws: number;
  pts: number;
  manualPts?: number; // kept in the type so user page still works if old data exists
}

type TournamentMeta = {
  tournamentId?: string;
  tournamentName?: string;
};

interface LeaderboardViewerProps {
  teams: Team[];
  fixtures: Fixture[];
  onRecalculate: () => void;
}

function computeLeaderboard(
  teams: Team[],
  fixtures: Fixture[],
  selectedTournament: string,
  selectedSport: string,
  selectedCategory: string
): LeaderboardRow[] {
  const sportTeams = teams.filter((t) => {
    const team = t as Team & { tournamentId?: string; tournamentName?: string; category?: string; sportId?: string };
    const teamTournament = team.tournamentId || team.tournamentName || "";
    const matchesTournament = teamTournament === selectedTournament;
    const matchesSport = !selectedSport || t.sport === selectedSport || team.sportId === selectedSport;
    const matchesCategory = !selectedCategory || team.category === selectedCategory;
    return matchesTournament && matchesSport && matchesCategory;
  });

  const rows: LeaderboardRow[] = sportTeams.map((team) => {
    const teamWithMeta = team as Team & { tournamentId?: string; tournamentName?: string; category?: string };
    let played = 0, won = 0, lost = 0, draws = 0;

    fixtures.forEach((fix) => {
      const fixture = fix as Fixture & { tournamentId?: string; tournamentName?: string; category?: string; sportId?: string };
      if (
        (fixture.tournamentId || fixture.tournamentName || "") === selectedTournament &&
        (!selectedSport || fix.sport === selectedSport || fixture.sportId === selectedSport) &&
        (!selectedCategory || fixture.category === selectedCategory) &&
        fix.status === "completed" &&
        fix.scoreA !== undefined &&
        fix.scoreB !== undefined
      ) {
        const isTeamA = fix.teamA === team.id || fix.teamA === team.name;
        const isTeamB = fix.teamB === team.id || fix.teamB === team.name;

        if (isTeamA) {
          played++;
          if (fix.scoreA > fix.scoreB) won++;
          else if (fix.scoreA < fix.scoreB) lost++;
          else draws++;
        } else if (isTeamB) {
          played++;
          if (fix.scoreB > fix.scoreA) won++;
          else if (fix.scoreB < fix.scoreA) lost++;
          else draws++;
        }
      }
    });

    // 3 pts for win, 1 for draw, 0 for loss
    const pts = won * 3 + draws;

    return {
      rank: 0,
      teamId: team.id,
      name: team.name,
      sport: team.sport,
      tournamentId: teamWithMeta.tournamentId,
      tournamentName: teamWithMeta.tournamentName,
      category: teamWithMeta.category,
      department: team.department || "General",
      logo: team.logo,
      played,
      won,
      lost,
      draws,
      pts,
    };
  });

  const sorted = rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.won !== a.won) return b.won - a.won;
    return a.name.localeCompare(b.name);
  });

  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
}

export function LeaderboardViewer({ teams, fixtures, onRecalculate }: LeaderboardViewerProps) {
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);

  const tournamentOptions = useMemo(() => {
    const pairs = [...teams, ...fixtures].map((item) => {
      const value = item as TournamentMeta;
      const id = value.tournamentId || value.tournamentName || "";
      return [id, value.tournamentName || id] as const;
    }).filter(([id]) => Boolean(id));
    return Array.from(new Map(pairs).entries());
  }, [teams, fixtures]);

  const sportOptions = useMemo(() => {
    const fromData = teams
      .filter((team) => {
        const value = team as Team & { tournamentId?: string; tournamentName?: string };
        return selectedTournament && (value.tournamentId || value.tournamentName || "") === selectedTournament;
      })
      .map((team) => {
        const value = team as Team & { sportId?: string; sportName?: string };
        return [value.sportId || team.sport, value.sportName || sports.find((s) => s.id === team.sport)?.name || team.sport] as const;
      });
    return Array.from(new Map(fromData).entries());
  }, [teams, selectedTournament]);

  // Recompute whenever deps change
  useEffect(() => {
    if (!selectedTournament) {
      setLeaderboard([]);
      return;
    }
    const rows = computeLeaderboard(teams, fixtures, selectedTournament, selectedSport, selectedCategory);
    setLeaderboard(rows);
  }, [teams, fixtures, selectedTournament, selectedSport, selectedCategory]);

  // Persist to localStorage so user-facing standings page stays in sync
  useEffect(() => {
    if (leaderboard.length === 0) return;

    const saved = localStorage.getItem(STANDINGS_STORAGE_KEY);
    const existing: LeaderboardRow[] = saved ? JSON.parse(saved) : [];
    // Replace entries for the current sport, keep other sports intact
    const others = existing.filter((r) => r.tournamentId !== selectedTournament || r.sport !== selectedSport || r.category !== selectedCategory);
    localStorage.setItem(STANDINGS_STORAGE_KEY, JSON.stringify([...others, ...leaderboard]));
  }, [leaderboard, selectedTournament, selectedSport, selectedCategory]);

  const handleExportCSV = () => {
    if (leaderboard.length === 0) {
      alert("No data available to export");
      return;
    }
    const sportName = sportOptions.find(([id]) => id === selectedSport)?.[1] || "All Sports";
    const tournamentName = tournamentOptions.find(([id]) => id === selectedTournament)?.[1] || "Tournament";
    const headers = "Rank,Tournament,Sport,Category,Team,Department,Played,Won,Lost,Draws,Points\n";
    const rows = leaderboard
      .map(
        (r) =>
          `${r.rank},"${r.tournamentName || tournamentName}","${sportName}","${r.category || selectedCategory || "All"}","${r.name}","${r.department}",${r.played},${r.won},${r.lost},${r.draws},${r.pts}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Leaderboard_${tournamentName.replace(/\s+/g, "_")}_${sportName.replace(/\s+/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black sport-heading text-white">Team Standings</h2>
          <p className="text-sm text-slate-400">
            Check the ranking table that comes from completed match scores. Use recalculate after editing old results.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={onRecalculate}
            className="flex items-center gap-2 rounded-xl bg-slate-800 border border-white/10 hover:bg-slate-700 text-xs font-bold px-4 py-3 transition-all cursor-pointer"
          >
            <RefreshCw size={14} /> Recalculate Standings
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl bg-accent text-accent-foreground hover:scale-[1.02] active:scale-95 text-xs font-black uppercase tracking-wider px-4 py-3 transition-all shadow-lg shadow-accent/10 cursor-pointer"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/5 bg-slate-900/60 p-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">Tournament</span>
          <select
            value={selectedTournament}
            onChange={(event) => {
              setSelectedTournament(event.target.value);
              setSelectedSport("");
              setSelectedCategory("");
            }}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm font-bold text-white outline-none focus:border-accent"
          >
            <option value="">Select tournament...</option>
            {tournamentOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sport</span>
          <select
            value={selectedSport}
            onChange={(event) => setSelectedSport(event.target.value)}
            disabled={!selectedTournament}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm font-bold text-white outline-none focus:border-accent disabled:opacity-50"
          >
            <option value="">All Sports</option>
            {sportOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            disabled={!selectedTournament}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm font-bold text-white outline-none focus:border-accent disabled:opacity-50"
          >
            <option value="">All Categories</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
      </div>

      {/* Standings table */}
      <Card className="bg-slate-900/60 border-white/5 text-white">
        <CardContent className="p-0 overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Trophy size={48} className="mx-auto text-slate-700 mb-4 animate-pulse" />
              <p className="font-semibold text-base">{selectedTournament ? "No standings recorded yet" : "Please select a tournament."}</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Register teams for this sport and complete matches with saved scores to populate the table.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/80 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4">POS</th>
                    <th className="px-6 py-4">TEAM / COLLEGE</th>
                    <th className="px-6 py-4 text-center">PLAYED</th>
                    <th className="px-6 py-4 text-center text-green-400">WON</th>
                    <th className="px-6 py-4 text-center text-red-400">LOST</th>
                    <th className="px-6 py-4 text-center text-blue-400">DRAWS</th>
                    <th className="px-6 py-4 text-right">POINTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.map((row, index) => (
                    <tr
                      key={row.teamId}
                      className={cn(
                        "transition-all hover:bg-slate-950/20",
                        index === 0 && "bg-accent/5",
                        index === 1 && "bg-slate-200/5",
                        index === 2 && "bg-amber-700/5"
                      )}
                    >
                      {/* Position */}
                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl font-black text-sm shadow-inner scoreboard-number",
                            index === 0
                              ? "bg-accent text-accent-foreground border border-accent/20"
                              : index === 1
                              ? "bg-slate-200 text-slate-800"
                              : index === 2
                              ? "bg-amber-700 text-amber-100"
                              : "bg-slate-950 text-slate-400"
                          )}
                        >
                          {row.rank}
                        </span>
                      </td>

                      {/* Team */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {row.logo ? (
                            <img
                              src={row.logo}
                              alt=""
                              className="h-10 w-10 object-contain rounded-lg bg-slate-950 p-1 border border-white/10"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-slate-950 border border-white/10 flex items-center justify-center font-black text-xs text-accent">
                              {row.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white uppercase text-sm tracking-wide">{row.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{row.department}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-center font-bold text-slate-300">{row.played}</td>
                      <td className="px-6 py-5 text-center text-green-400 font-black">{row.won}</td>
                      <td className="px-6 py-5 text-center text-red-400 font-black">{row.lost}</td>
                      <td className="px-6 py-5 text-center text-blue-400 font-bold">{row.draws}</td>

                      {/* Points */}
                      <td className="px-6 py-5 text-right">
                        <span
                          className={cn(
                            "inline-flex h-9 min-w-[55px] items-center justify-center rounded-xl font-black text-sm px-3 shadow",
                            index === 0
                              ? "bg-accent text-accent-foreground"
                              : "bg-slate-950 text-white"
                          )}
                        >
                          {row.pts} PTS
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
