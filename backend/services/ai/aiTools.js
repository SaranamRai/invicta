import Announcement from "../../models/Announcement.js";
import Fixture from "../../models/Fixture.js";
import LiveScore from "../../models/LiveScore.js";
import Player from "../../models/Player.js";
import PointsTable from "../../models/PointsTable.js";
import Result from "../../models/Result.js";
import Rule from "../../models/Rule.js";
import Sport from "../../models/Sport.js";
import Team from "../../models/Team.js";
import Tournament from "../../models/Tournament.js";
import Venue from "../../models/Venue.js";

const MAX_ITEMS = 50;
const EVENT_TIMEZONE = process.env.INVICTA_TIMEZONE || "Asia/Kolkata";

function text(value, max = 180) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function name(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return text(value, 100);
  return text(value.teamName || value.sportName || value.name || fallback, 100);
}

function dateKey(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return text(value, 30);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function todayKey() {
  return dateKey(new Date());
}

function normalize(value) {
  return text(value, 100).toLowerCase().replace(/[-_]/g, " ");
}

function sportMatches(item, sport) {
  if (!sport) return true;
  return normalize(item.sportName || item.sport || item.sportId) === normalize(sport);
}

export async function getSports() {
  const sports = await Sport.find({ status: "active" })
    .select("sportName name type categories rules minPlayers maxPlayers")
    .sort({ sportName: 1, name: 1 })
    .lean();
  return sports.map((sport) => ({
    name: text(sport.sportName || sport.name, 80),
    type: text(sport.type, 30),
    categories: Array.isArray(sport.categories) ? sport.categories.map((item) => text(item, 30)) : [],
    playerLimits: { min: sport.minPlayers, max: sport.maxPlayers },
    rules: text(sport.rules, 400),
  }));
}

export async function getFixtures({ sport, date, status, team } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (date) filter.date = date;
  if (team) filter.$or = [
    { teamAName: new RegExp(text(team, 80), "i") },
    { teamBName: new RegExp(text(team, 80), "i") },
    { matchTitle: new RegExp(text(team, 80), "i") },
  ];
  const fixtures = await Fixture.find(filter)
    .select("_id matchTitle sport sportName category teamAName teamBName date time venue status round startTime")
    .sort({ startTime: 1, date: 1, time: 1 })
    .limit(MAX_ITEMS)
    .lean();
  return fixtures
    .filter((fixture) => sportMatches(fixture, sport))
    .map((fixture) => ({
      title: text(fixture.matchTitle, 120),
      fixtureId: String(fixture._id),
      sport: text(fixture.sportName || fixture.sport, 60),
      category: text(fixture.category, 40),
      teamA: text(fixture.teamAName, 80),
      teamB: text(fixture.teamBName, 80),
      date: text(fixture.date, 40),
      time: text(fixture.time, 40),
      venue: text(fixture.venue, 100),
      status: text(fixture.status, 30),
      round: text(fixture.round, 50),
    }));
}

export async function getTodaysFixtures({ sport } = {}) {
  const fixtures = await getFixtures({ sport });
  return fixtures.filter((fixture) => dateKey(fixture.date) === todayKey());
}

export async function getUpcomingFixtures({ sport, team } = {}) {
  const fixtures = await getFixtures({ sport, team });
  return fixtures.filter((fixture) => ["upcoming", "delayed"].includes(fixture.status));
}

export async function getLiveMatches({ sport } = {}) {
  const [fixtures, scores] = await Promise.all([
    getFixtures({ sport, status: "live" }),
    LiveScore.find({ currentStatus: { $in: ["live", "paused", "half-time"] } })
      .select("fixtureId teamAName teamBName teamAScore teamBScore currentStatus period updatedAt")
      .limit(MAX_ITEMS)
      .lean(),
  ]);
  const scoreByFixture = new Map(scores.map((score) => [String(score.fixtureId), score]));
  return fixtures.map((fixture) => ({ ...fixture, score: scoreByFixture.get(fixture.fixtureId) || null }));
}

export async function getLiveScores({ fixtureId } = {}) {
  const filter = fixtureId ? { fixtureId } : { currentStatus: { $in: ["live", "paused", "half-time"] } };
  const scores = await LiveScore.find(filter)
    .select("fixtureId teamAName teamBName teamAScore teamBScore currentStatus period updatedAt")
    .sort({ updatedAt: -1 })
    .limit(MAX_ITEMS)
    .lean();
  return scores.map((score) => ({
    fixtureId: String(score.fixtureId),
    teamA: text(score.teamAName, 80),
    teamB: text(score.teamBName, 80),
    scoreA: score.teamAScore,
    scoreB: score.teamBScore,
    status: text(score.currentStatus, 30),
    period: text(score.period, 40),
    updatedAt: score.updatedAt,
  }));
}

export async function getResults({ sport, team } = {}) {
  const results = await Result.find({})
    .select("fixtureId winnerTeam loserTeam finalScore createdAt")
    .populate("fixtureId", "matchTitle sport sportName category teamAName teamBName date time venue")
    .populate("winnerTeam", "teamName")
    .populate("loserTeam", "teamName")
    .sort({ createdAt: -1 })
    .limit(MAX_ITEMS)
    .lean();
  return results
    .filter((result) => result.fixtureId && sportMatches(result.fixtureId, sport))
    .filter((result) => !team || normalize(JSON.stringify(result)).includes(normalize(team)))
    .map((result) => ({
      title: text(result.fixtureId.matchTitle, 120),
      sport: text(result.fixtureId.sportName || result.fixtureId.sport, 60),
      date: text(result.fixtureId.date, 40),
      time: text(result.fixtureId.time, 40),
      venue: text(result.fixtureId.venue, 100),
      winner: name(result.winnerTeam),
      loser: name(result.loserTeam),
      score: text(result.finalScore, 60),
    }));
}

export async function getStandings({ sport } = {}) {
  const rows = await PointsTable.find({})
    .select("department sportId matchesPlayed wins losses draws points updatedAt")
    .populate("sportId", "sportName name")
    .sort({ points: -1, wins: -1, department: 1 })
    .limit(MAX_ITEMS)
    .lean();
  return rows
    .filter((row) => !sport || normalize(row.sportId?.sportName || row.sportId?.name) === normalize(sport))
    .map((row) => ({
      team: text(row.department, 80),
      sport: text(row.sportId?.sportName || row.sportId?.name, 60),
      played: row.matchesPlayed,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      points: row.points,
    }));
}

export async function getTeams({ sport, search } = {}) {
  const teams = await Team.find({ status: "approved" })
    .select("teamName department sport sportName sportId category members")
    .populate("sportId", "sportName name")
    .sort({ teamName: 1 })
    .limit(MAX_ITEMS)
    .lean();
  return teams
    .filter((team) => sportMatches({ ...team, sportName: team.sportName || team.sportId?.sportName }, sport))
    .filter((team) => !search || normalize(`${team.teamName} ${team.department}`).includes(normalize(search)))
    .map((team) => ({
      name: text(team.teamName, 80),
      department: text(team.department, 80),
      sport: text(team.sportName || team.sportId?.sportName || team.sport, 60),
      category: text(team.category, 30),
      players: Array.isArray(team.members) ? team.members.length : 0,
    }));
}

export async function getPlayers({ sport, team } = {}) {
  const players = await Player.find({})
    .select("name sportId teamId isCaptain")
    .populate("sportId", "sportName name")
    .populate("teamId", "teamName")
    .limit(MAX_ITEMS)
    .lean();
  return players
    .filter((player) => !sport || normalize(player.sportId?.sportName || player.sportId?.name) === normalize(sport))
    .filter((player) => !team || normalize(player.teamId?.teamName).includes(normalize(team)))
    .map((player) => ({
      name: text(player.name, 100),
      team: text(player.teamId?.teamName, 80),
      sport: text(player.sportId?.sportName || player.sportId?.name, 60),
      captain: Boolean(player.isCaptain),
    }));
}

export async function getAnnouncements() {
  const announcements = await Announcement.find({ visibleToPublic: true })
    .select("title message priority createdAt")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  return announcements.map((item) => ({
    title: text(item.title, 120),
    message: text(item.message, 300),
    priority: text(item.priority, 20),
    postedAt: item.createdAt,
  }));
}

export async function getRules({ sport } = {}) {
  const rules = await Rule.find({ $or: [{ status: "approved" }, { status: { $exists: false } }] })
    .select("title rules description sport sportName category")
    .sort({ createdAt: -1 })
    .limit(MAX_ITEMS)
    .lean();
  return rules
    .filter((rule) => !sport || normalize(rule.sportName || rule.sport).includes(normalize(sport)))
    .map((rule) => ({ title: text(rule.title, 120), sport: text(rule.sportName || rule.sport, 60), category: text(rule.category, 30), rules: text(rule.rules || rule.description, 800) }));
}

export async function getVenues() {
  const venues = await Venue.find({ status: { $ne: "inactive" } }).select("name venueName location sportType capacity").limit(MAX_ITEMS).lean();
  return venues.map((venue) => ({ name: text(venue.name || venue.venueName, 100), location: text(venue.location, 160), sport: text(venue.sportType, 60), capacity: venue.capacity }));
}

export async function getEventInfo() {
  const tournaments = await Tournament.find({}).select("name sport startDate endDate status registrationOpen").sort({ startDate: 1 }).limit(MAX_ITEMS).lean();
  return tournaments.map((tournament) => ({
    name: text(tournament.name, 120),
    sport: text(tournament.sport, 60),
    startDate: text(tournament.startDate, 40),
    endDate: text(tournament.endDate, 40),
    status: text(tournament.status, 30),
    registrationOpen: Boolean(tournament.registrationOpen),
  }));
}

export async function getTournamentStatistics() {
  const [sports, teams, fixtures, results, live] = await Promise.all([
    Sport.countDocuments({ status: "active" }),
    Team.countDocuments({ status: "approved" }),
    Fixture.countDocuments({}),
    Result.countDocuments({}),
    LiveScore.countDocuments({ currentStatus: { $in: ["live", "paused", "half-time"] } }),
  ]);
  const players = await Player.countDocuments({});
  return { sports, teams, players, matches: fixtures, completedMatches: results, liveMatches: live };
}

export const aiTools = {
  getEventInfo,
  getSports,
  getFixtures,
  getTodaysFixtures,
  getUpcomingFixtures,
  getLiveMatches,
  getLiveScores,
  getResults,
  getStandings,
  getTeams,
  getPlayers,
  getAnnouncements,
  getRules,
  getVenues,
  getTournamentStatistics,
};
