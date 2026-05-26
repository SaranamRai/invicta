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

export const matches: Match[] = [
  {
    id: "match-001",
    teamA: "Phoenix FC",
    teamB: "Thunder Hawks",
    sport: "Football",
    type: "Group Stage",
    scoreA: 2,
    scoreB: 1,
    status: "Live",
    time: "14:00",
  },
  {
    id: "match-002",
    teamA: "Storm Riders",
    teamB: "Iron Wolves",
    sport: "Volleyball",
    type: "Knockout",
    scoreA: 1,
    scoreB: 0,
    status: "Live",
    time: "15:30",
  },
  {
    id: "match-003",
    teamA: "Golden Eagles",
    teamB: "Silver Foxes",
    sport: "Cricket",
    type: "Group Stage",
    scoreA: 0,
    scoreB: 0,
    status: "Upcoming",
    time: "17:00",
  },
  {
    id: "match-004",
    teamA: "Blue Arrows",
    teamB: "Red Titans",
    sport: "Badminton",
    type: "Semi-Final",
    scoreA: 21,
    scoreB: 18,
    status: "Finished",
    time: "10:00",
  },
  {
    id: "match-005",
    teamA: "Night Owls",
    teamB: "Solar Bears",
    sport: "Table Tennis",
    type: "Quarter-Final",
    scoreA: 3,
    scoreB: 2,
    status: "Finished",
    time: "11:00",
  },
  {
    id: "match-006",
    teamA: "Blaze United",
    teamB: "Frost Giants",
    sport: "Football",
    type: "Group Stage",
    scoreA: 0,
    scoreB: 0,
    status: "Upcoming",
    time: "19:00",
  },
];

export const standings: Standing[] = [
  { team: "Phoenix FC", rank: 1, played: 3, won: 3, lost: 0, pts: 9 },
  { team: "Thunder Hawks", rank: 2, played: 3, won: 2, lost: 1, pts: 6 },
  { team: "Golden Eagles", rank: 3, played: 2, won: 1, lost: 1, pts: 3 },
  { team: "Storm Riders", rank: 4, played: 2, won: 1, lost: 1, pts: 3 },
  { team: "Blue Arrows", rank: 5, played: 3, won: 0, lost: 3, pts: 0 },
];
