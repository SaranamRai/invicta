import mongoose from "mongoose";

import Fixture from "../models/Fixture.js";
import Sport from "../models/Sport.js";
import Team from "../models/Team.js";
import Player from "../models/Player.js";

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
  return normalizeText(sport) || "General";
}

async function getOrCreateSport(sport) {
  const normalizedSport = normalizeSport(sport);
  const name = getSportName(normalizedSport);
  let sportDoc = await Sport.findOne({
    $or: [
      { sportName: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    ],
  });

  if (!sportDoc) {
    sportDoc = await Sport.create({
      sportName: name,
      name,
      categories: ["Male", "Female"],
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
    sportId: team.sportId?.toString?.() || "",
    category: team.category || "Male",
    members: team.members || [],
    coachCaptain: team.captainName || "",
    captainRegNo: team.captainRegNo || "",
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
    sportId: fixture.sportId?.toString?.() || "",
    category: fixture.category || "Male",
    date: fixture.date,
    time: fixture.time,
    startTime: fixture.startTime,
    endTime: fixture.endTime,
    venue: fixture.venue,
    status: fixture.status === "completed" ? "completed" : fixture.status === "live" ? "live" : "scheduled",
    scoreA: fixture.scoreA || 0,
    scoreB: fixture.scoreB || 0,
    endedAt: fixture.endedAt,
  };
}

function getFixtureWindow(fixture) {
  const start = fixture.startTime
    ? new Date(fixture.startTime)
    : fixture.date && fixture.time
      ? new Date(`${fixture.date}T${fixture.time}`)
      : null;
  const end = fixture.endTime ? new Date(fixture.endTime) : start ? new Date(start.getTime() + 60 * 60 * 1000) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    const error = new Error("Fixture startTime and endTime are required and must form a valid time range");
    error.status = 400;
    throw error;
  }

  return { start, end };
}

async function assertFixtureNoClash(payload, excludeId) {
  const { start, end } = getFixtureWindow(payload);
  const teamIds = [payload.teamA, payload.teamB].filter(Boolean).map(String);
  const departments = [payload.departmentA, payload.departmentB].filter(Boolean).map(normalizeText);
  const query = {
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    status: { $ne: "cancelled" },
    startTime: { $lt: end },
    endTime: { $gt: start },
  };

  const overlapping = await Fixture.find(query).lean();
  const teamClash = overlapping.find((fixture) => {
    const existingTeamIds = [fixture.teamA?.toString?.(), fixture.teamB?.toString?.()].filter(Boolean);
    return teamIds.some((id) => existingTeamIds.includes(id));
  });
  if (teamClash) {
    const error = new Error("Fixture clash detected: this team already has another match at this time.");
    error.status = 400;
    throw error;
  }

  const departmentClash = overlapping.find((fixture) => {
    const existingDepartments = [fixture.departmentA, fixture.departmentB].filter(Boolean).map(normalizeText);
    return departments.some((department) => existingDepartments.includes(department));
  });
  if (departmentClash) {
    const error = new Error("Fixture clash detected: this department already has another match at this time.");
    error.status = 400;
    throw error;
  }

  const venueClash = payload.venue ? overlapping.find((fixture) => {
    return payload.venue && normalizeText(fixture.venue).toLowerCase() === normalizeText(payload.venue).toLowerCase();
  }) : null;
  if (venueClash) {
    const error = new Error("Venue clash detected: this venue is already booked at this time.");
    error.status = 400;
    throw error;
  }

  const volunteerClash = payload.assignedVolunteer ? overlapping.find((fixture) => {
    return payload.assignedVolunteer && fixture.assignedVolunteer?.toString?.() === String(payload.assignedVolunteer);
  }) : null;
  if (volunteerClash) {
    const error = new Error("Volunteer clash detected: this volunteer is already assigned to another match at this time.");
    error.status = 400;
    throw error;
  }

  return { start, end };
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
  const assignedSportId = req.user?.assignedSportId?.toString?.() || "";
  let query = {};
  if (req.user?.role === "coordinator") {
    if (assignedSportId) {
      query = { sportId: assignedSportId };
    } else if (assignedSport) {
      query = { sport: assignedSport };
    }
  }
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
      matchTitle: `${teamA.teamName} vs ${teamB.teamName}`,
      teamA: teamA._id,
      teamB: teamB._id,
      teamAName: teamA.teamName,
      teamBName: teamB.teamName,
      date: fixture.date,
      time: fixture.time,
      venue: fixture.venue,
      status: fixture.status === "completed" ? "completed" : fixture.status === "live" ? "live" : "upcoming",
      scoreA: Number(fixture.scoreA || 0),
      scoreB: Number(fixture.scoreB || 0),
      endedAt: fixture.endedAt,
    });

    createdFixtures.push(mapFixture(created));
  }

  return res.status(201).json(createdFixtures);
}

export async function createFixture(req, res) {
  requireObjectId(req.body.teamA, "Team A id");
  requireObjectId(req.body.teamB, "Team B id");

  const [teamA, teamB] = await Promise.all([
    Team.findById(req.body.teamA),
    Team.findById(req.body.teamB),
  ]);

  if (!teamA || !teamB) {
    return res.status(400).json({ message: "Both teams must exist" });
  }

  const sportId = req.body.sportId || teamA.sportId;
  requireObjectId(sportId, "Sport id");
  const sportDoc = await Sport.findById(sportId);
  if (!sportDoc) return res.status(400).json({ message: "Sport not found" });

  const sportName = sportDoc.sportName || sportDoc.name;
  const payload = {
    sport: normalizeSport(sportName),
    sportName,
    sportId: sportDoc._id,
    category: req.body.category || teamA.category || "Male",
    matchTitle: normalizeText(req.body.matchTitle || `${teamA.teamName} vs ${teamB.teamName}`),
    teamA: teamA._id,
    teamB: teamB._id,
    teamAName: teamA.teamName,
    teamBName: teamB.teamName,
    departmentA: teamA.department,
    departmentB: teamB.department,
    venue: normalizeText(req.body.venue),
    date: req.body.date,
    time: req.body.time,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    round: normalizeText(req.body.round),
    status: req.body.status || "upcoming",
    assignedVolunteer: req.body.assignedVolunteer || undefined,
    createdBy: req.user?.id,
  };

  const { start, end } = await assertFixtureNoClash(payload);
  const fixture = await Fixture.create({ ...payload, startTime: start, endTime: end });
  return res.status(201).json(mapFixture(fixture));
}

export async function updateFixture(req, res) {
  requireObjectId(req.params.id, "Fixture id");
  const existing = await Fixture.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Fixture not found" });

  const updatePayload = {
    ...existing.toObject(),
    ...req.body,
  };
  const { start, end } = await assertFixtureNoClash(updatePayload, req.params.id);

  const fixture = await Fixture.findByIdAndUpdate(
    req.params.id,
    {
      date: req.body.date,
      time: req.body.time,
      venue: req.body.venue,
      startTime: start,
      endTime: end,
      status: req.body.status === "completed" ? "completed" : req.body.status === "live" ? "live" : "upcoming",
      scoreA: Number(req.body.scoreA || 0),
      scoreB: Number(req.body.scoreB || 0),
      endedAt: req.body.endedAt,
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
