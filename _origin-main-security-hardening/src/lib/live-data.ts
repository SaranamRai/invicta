import { MatchData } from "@/lib/types";
import { Team } from "@/lib/fixture-generator";

export interface StandingRow {
  team: string;
  sport: string;
  rank: number;
  played: number;
  won: number;
  lost: number;
  draws: number;
  pts: number;
}

export const getSportLabel = (sport: string) => {
  return sport
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const getAvailableSports = (teams: Team[], matches: MatchData[]) => {
  const sports = new Map<string, string>();

  teams.forEach((team) => {
    if (team.sport) sports.set(team.sport, getSportLabel(team.sport));
  });

  matches.forEach((match) => {
    if (match.sport) sports.set(match.sport, getSportLabel(match.sport));
  });

  return Array.from(sports.entries()).map(([id, name]) => ({ id, name }));
};

export const buildStandings = (matches: MatchData[], teams: Team[] = [], sport?: string): StandingRow[] => {
  const rows = new Map<string, StandingRow>();

  const ensureRow = (team: string, teamSport: string) => {
    const key = `${teamSport}:${team}`;
    if (!rows.has(key)) {
      rows.set(key, {
        team,
        sport: teamSport,
        rank: 0,
        played: 0,
        won: 0,
        lost: 0,
        draws: 0,
        pts: 0,
      });
    }

    return rows.get(key)!;
  };

  teams.forEach((team) => {
    if (!sport || team.sport === sport) ensureRow(team.name, team.sport);
  });

  matches.forEach((match) => {
    if (sport && match.sport !== sport) return;

    const rowA = ensureRow(match.teamA, match.sport);
    const rowB = ensureRow(match.teamB, match.sport);

    if (match.status !== "Finished") return;

    rowA.played += 1;
    rowB.played += 1;

    if ((match.scoreA ?? 0) > (match.scoreB ?? 0)) {
      rowA.won += 1;
      rowA.pts += 3;
      rowB.lost += 1;
    } else if ((match.scoreB ?? 0) > (match.scoreA ?? 0)) {
      rowB.won += 1;
      rowB.pts += 3;
      rowA.lost += 1;
    } else {
      rowA.draws += 1;
      rowB.draws += 1;
      rowA.pts += 1;
      rowB.pts += 1;
    }
  });

  return Array.from(rows.values())
    .sort((a, b) => b.pts - a.pts || b.won - a.won || a.team.localeCompare(b.team))
    .map((row, index) => ({ ...row, rank: index + 1 }));
};
