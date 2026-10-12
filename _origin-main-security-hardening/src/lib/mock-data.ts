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

export const sports: { id: string; name: string }[] = [];

export const matches: Match[] = [];

export const standings: Standing[] = [];
