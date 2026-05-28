export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  sport: string;
  type: string;
  scoreA: number;
  scoreB: number;
  status: string;
  time?: string;
}

export interface Standing {
  team: string;
  rank: number;
  played: number;
  won: number;
  lost: number;
  pts: number;
}

export const sports = [
  { id: "football", name: "Football" },
  { id: "cricket", name: "Cricket" },
  { id: "volleyball", name: "Volleyball" },
  { id: "badminton", name: "Badminton" },
  { id: "table-tennis", name: "Table Tennis" },
];

export const matches: Match[] = [];

export const standings: Standing[] = [];
