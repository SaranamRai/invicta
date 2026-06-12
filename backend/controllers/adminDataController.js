import mongoose from "mongoose";

import Fixture from "../models/Fixture.js";
import Sport from "../models/Sport.js";
import Team from "../models/Team.js";
import Player from "../models/Player.js";

const sportNames = {
  football: "Football",
  cricket: "Cricket",
  volleyball: "Volleyball",
  badminton: "Badminton",
  "table-tennis": "Table Tennis",
  chess: "Chess",
};

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSport(value) {
  return normalizeText(value).toLowerCase();
}

function getAssignedSport(req) {
  return normalizeSport(req.user?.assignedSport);
}

function assertSportAccess(req, sport) {
  const assignedSport = getAssignedSport(req);
  const requestedSport = normalizeSport(sport);

  if (req.user?.role === "coordinator" && assignedSport && requestedSport !== assignedSport) {
    const error = new Error(`This coordinator can only manage ${assignedSport} teams`);
    error.status = 403;
    throw error;
  }
}

function getSportName(sport) {
  return sportNames[sport] || normalizeText(sport) || "General";
}

async function getOrCreateSport(sport) {
  const normalizedSport = normalizeSport(sport);
  const name = getSportName(normalizedSport);
  let sportDoc = await Sport.findOne({ name });

  if (!sportDoc) {
      sportDoc = await Sport.create({
        sportName: name,
        name,
        category: "Inter-Department",
        status: "active",
    });
  }

  return sportDoc;
}

function mapTeam(team) {
  return {
    id: team._id.toString(),
    name: team.teamName,
    department: team.department,
    sport: team.sport,
    sportName: team.sportName,
    tournamentId: team.tournamentId?.toString?.() || "",
    tournamentName: team.tournamentName || "",
    category: team.category || "",
    members: team.members || [],
    coachCaptain: team.captainName || "",
    contactNumber: team.contactNumber || "",
    logo: team.logo || "",
    status: team.status,
    wins: team.wins || 0,
    losses: team.losses || 0,
    draws: team.draws || 0,
    points: team.points || 0,
    registeredAt: team.registeredAt,
    playerRegisteredAt: team.playerRegisteredAt || [],
  };
}

function mapFixture(fixture) {
  return {
    id: fixture._id.toString(),
    teamA: fixture.teamA?.toString?.() || "",
    teamB: fixture.teamB?.toString?.() || "",
    teamAName: fixture.teamAName || "",
    teamBName: fixture.teamBName || "",
    sport: fixture.sport,
    sportName: fixture.sportName,
    tournamentId: fixture.tournamentId?.toString?.() || "",
    tournamentName: fixture.tournamentName || "",
    category: fixture.category || "",
    date: fixture.date,
    time: fixture.time,
    venue: fixture.venue,
    status: fixture.status === "completed" ? "completed" : fixture.status === "live" || fixture.status === "paused" ? "live" : "scheduled",
    scoreA: fixture.scoreA || 0,
    scoreB: fixture.scoreB || 0,
    endedAt: fixture.endedAt,
  };
}

function requireObjectId(id, label) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`${label} is invalid`);
    error.status = 400;
    throw error;
  }
}

export async function listTeams(req, res) {
  const assignedSport = getAssignedSport(req);
  const query = req.user?.role === "coordinator" && assignedSport ? { sport: assignedSport } : {};
  if (req.query.tournamentId) query.tournamentId = req.query.tournamentId;
  if (req.query.sportId) query.sportId = req.query.sportId;
  if (req.query.category) query.category = String(req.query.category);
  const teams = await Team.find(query).sort({ createdAt: -1 }).lean();
  return res.json(teams.map(mapTeam));
}

export async function createTeam(req, res) {
  const teamName = normalizeText(req.body.name || req.body.teamName);
  const department = normalizeText(req.body.department || req.body.name || req.body.teamName);
  const sport = normalizeSport(req.body.sport);

  if (!teamName || !department || !sport) {
    return res.status(400).json({ message: "Team name, department, and sport are required" });
  }

  assertSportAccess(req, sport);

  const sportDoc = await getOrCreateSport(sport);
  const team = await Team.create({
    teamName,
    department,
    sport,
    sportName: sportDoc.name,
    sportId: sportDoc._id,
    tournamentId: req.body.tournamentId || undefined,
    tournamentName: normalizeText(req.body.tournamentName),
    category: normalizeText(req.body.category),
    captainName: normalizeText(req.body.coachCaptain || req.body.captainName),
    contactNumber: normalizeText(req.body.contactNumber || req.body.phone),
    members: Array.isArray(req.body.members) ? req.body.members.map(normalizeText).filter(Boolean) : [],
    logo: req.body.logo || "",
    status: req.body.status || "approved",
    wins: Number(req.body.wins || 0),
    losses: Number(req.body.losses || 0),
    draws: Number(req.body.draws || 0),
    points: Number(req.body.points || 0),
    registeredAt: Number(req.body.registeredAt || Date.now()),
    playerRegisteredAt: Array.isArray(req.body.playerRegisteredAt) ? req.body.playerRegisteredAt : [],
    createdBy: req.user?.id,
  });

  // Create Player documents for each member string so players collection is populated
  try {
    const members = Array.isArray(team.members) ? team.members : [];
    const createdPlayers = [];
    for (let i = 0; i < members.length; i++) {
      const memberName = String(members[i] || "").trim();
      if (!memberName) continue;
      const player = await Player.create({
        name: memberName,
        department: team.department,
        phone: "",
        sportId: team.sportId,
        teamId: team._id,
        isCaptain: Boolean(team.captainName && memberName === team.captainName),
      });
      createdPlayers.push(player);
    }
  } catch (err) {
    // don't block team creation on player creation failures; log for visibility
    console.error("Failed to create player docs for team:", err);
  }

  return res.status(201).json(mapTeam(team));
}

export async function updateTeam(req, res) {
  requireObjectId(req.params.id, "Team id");

  const existingTeam = await Team.findById(req.params.id);
  if (!existingTeam) return res.status(404).json({ message: "Team not found" });

  const sport = req.body.sport ? normalizeSport(req.body.sport) : existingTeam.sport;
  const sportDoc = await getOrCreateSport(sport);

  existingTeam.set({
    teamName: normalizeText(req.body.name || req.body.teamName || existingTeam.teamName),
    department: normalizeText(req.body.department || existingTeam.department),
    sport,
    sportName: sportDoc.name,
    sportId: sportDoc._id,
    tournamentId: req.body.tournamentId ?? existingTeam.tournamentId,
    tournamentName: normalizeText(req.body.tournamentName || existingTeam.tournamentName),
    category: normalizeText(req.body.category || existingTeam.category),
    captainName: normalizeText(req.body.coachCaptain || req.body.captainName || existingTeam.captainName),
    contactNumber: normalizeText(req.body.contactNumber || existingTeam.contactNumber),
    members: Array.isArray(req.body.members) ? req.body.members.map(normalizeText).filter(Boolean) : existingTeam.members,
    logo: req.body.logo ?? existingTeam.logo,
    status: req.body.status || existingTeam.status,
    wins: Number(req.body.wins ?? existingTeam.wins ?? 0),
    losses: Number(req.body.losses ?? existingTeam.losses ?? 0),
    draws: Number(req.body.draws ?? existingTeam.draws ?? 0),
    points: Number(req.body.points ?? existingTeam.points ?? 0),
    registeredAt: Number(req.body.registeredAt || existingTeam.registeredAt || Date.now()),
    playerRegisteredAt: Array.isArray(req.body.playerRegisteredAt) ? req.body.playerRegisteredAt : existingTeam.playerRegisteredAt,
  });

  await existingTeam.save();
  return res.json(mapTeam(existingTeam));
}

export async function deleteTeam(req, res) {
  requireObjectId(req.params.id, "Team id");
  const team = await Team.findByIdAndDelete(req.params.id);
  if (!team) return res.status(404).json({ message: "Team not found" });
  await Fixture.deleteMany({ $or: [{ teamA: team._id }, { teamB: team._id }] });
  return res.json({ message: "Team deleted successfully" });
}

export async function listFixtures(req, res) {
  const assignedSport = getAssignedSport(req);
  const query = req.user?.role === "volunteer" && assignedSport ? { sport: assignedSport } : {};
  if (req.query.tournamentId) query.tournamentId = req.query.tournamentId;
  if (req.query.sportId) query.sportId = req.query.sportId;
  if (req.query.category) query.category = String(req.query.category);
  if (req.query.teamId) query.$or = [{ teamA: req.query.teamId }, { teamB: req.query.teamId }];
  const fixtures = await Fixture.find(query).sort({ date: 1, time: 1 }).lean();
  return res.json(fixtures.map(mapFixture));
}

export async function replaceFixtures(req, res) {
  const fixtures = Array.isArray(req.body.fixtures) ? req.body.fixtures : [];

  await Fixture.deleteMany({});

  const createdFixtures = [];
  for (const fixture of fixtures) {
    requireObjectId(fixture.teamA, "Team A id");
    requireObjectId(fixture.teamB, "Team B id");

    const [teamA, teamB] = await Promise.all([
      Team.findById(fixture.teamA),
      Team.findById(fixture.teamB),
    ]);

    if (!teamA || !teamB) continue;

    const sport = normalizeSport(fixture.sport || teamA.sport);
    const sportDoc = await getOrCreateSport(sport);

    const created = await Fixture.create({
      sport,
      sportName: sportDoc.name,
      sportId: sportDoc._id,
      tournamentId: fixture.tournamentId || teamA.tournamentId || undefined,
      tournamentName: fixture.tournamentName || teamA.tournamentName || "",
      category: fixture.category || teamA.category || "",
      matchTitle: `${teamA.teamName} vs ${teamB.teamName}`,
      teamA: teamA._id,
      teamB: teamB._id,
      teamAName: teamA.teamName,
      teamBName: teamB.teamName,
      date: fixture.date,
      time: fixture.time,
      venue: fixture.venue,
      status: fixture.status === "completed" ? "completed" : fixture.status === "live" ? "live" : fixture.status === "paused" ? "paused" : "upcoming",
      scoreA: Number(fixture.scoreA || 0),
      scoreB: Number(fixture.scoreB || 0),
      endedAt: fixture.endedAt,
    });

    createdFixtures.push(mapFixture(created));
  }

  return res.status(201).json(createdFixtures);
}

export async function updateFixture(req, res) {
  requireObjectId(req.params.id, "Fixture id");
  const fixture = await Fixture.findByIdAndUpdate(
    req.params.id,
    {
      date: req.body.date,
      time: req.body.time,
      venue: req.body.venue,
      status: req.body.status === "completed" ? "completed" : req.body.status === "live" ? "live" : req.body.status === "paused" ? "paused" : "upcoming",
      scoreA: Number(req.body.scoreA || 0),
      scoreB: Number(req.body.scoreB || 0),
      endedAt: req.body.endedAt,
      tournamentId: req.body.tournamentId || undefined,
      tournamentName: normalizeText(req.body.tournamentName),
      category: normalizeText(req.body.category),
    },
    { new: true }
  );

  if (!fixture) return res.status(404).json({ message: "Fixture not found" });
  return res.json(mapFixture(fixture));
}

export async function deleteFixture(req, res) {
  requireObjectId(req.params.id, "Fixture id");
  const fixture = await Fixture.findByIdAndDelete(req.params.id);
  if (!fixture) return res.status(404).json({ message: "Fixture not found" });
  return res.json({ message: "Fixture deleted successfully" });
}

export async function listPlayers(_req, res) {
  const players = await Player.find().sort({ createdAt: -1 }).lean();
  return res.json(players);
}
