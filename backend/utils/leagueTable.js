import Team from "../models/Team.js";
import Fixture from "../models/Fixture.js";

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export async function buildLeagueTable(filters = {}) {
  const teamFilter = { status: { $in: ["draft", "approved"] }, ...filters };
  const fixtureFilter = { ...filters, status: "completed", isCompleted: { $in: [true, undefined] } };
  // Some older completed fixtures do not contain isCompleted.
  delete fixtureFilter.isCompleted;
  const [teams, fixtures] = await Promise.all([
    Team.find(teamFilter).lean(),
    Fixture.find({ ...filters, $or: [{ status: "completed" }, { isCompleted: true }] }).lean(),
  ]);
  const rows = new Map(teams.map((team) => [String(team._id), {
    teamId: String(team._id), team: team.teamName, department: team.department || "",
    sportId: team.sportId?.toString?.() || "", sport: team.sportName || team.sport || "",
    tournamentId: team.tournamentId?.toString?.() || "", tournamentName: team.tournamentName || "",
    category: team.category || "Male", played: 0, wins: 0, draws: 0, losses: 0,
    goalsFor: 0, goalsAgainst: 0, points: 0,
  }]));
  for (const fixture of fixtures) {
    const a = rows.get(String(fixture.teamA));
    const b = rows.get(String(fixture.teamB));
    if (!a || !b) continue;
    // Never allow a result to cross from one competition category into another.
    if (!fixture.category || fixture.category !== a.category || fixture.category !== b.category) continue;
    const scoreA = number(fixture.scoreA); const scoreB = number(fixture.scoreB);
    a.played += 1; b.played += 1; a.goalsFor += scoreA; a.goalsAgainst += scoreB; b.goalsFor += scoreB; b.goalsAgainst += scoreA;
    if (scoreA > scoreB) { a.wins += 1; b.losses += 1; a.points += 3; }
    else if (scoreB > scoreA) { b.wins += 1; a.losses += 1; b.points += 3; }
    else { a.draws += 1; b.draws += 1; a.points += 1; b.points += 1; }
  }
  const groups = new Map();
  for (const row of rows.values()) {
    const key = `${row.tournamentId}:${row.sportId}:${row.category}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const compare = (a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team);
  return [...groups.values()].flatMap((group) => group.sort(compare).map((row, index) => ({ ...row, position: index + 1, goalDifference: row.goalsFor - row.goalsAgainst })));
}
