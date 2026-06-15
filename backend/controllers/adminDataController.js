import mongoose from "mongoose";

import Fixture from "../models/Fixture.js";
import Sport from "../models/Sport.js";
import Team from "../models/Team.js";
import Player from "../models/Player.js";
import Tournament from "../models/Tournament.js";
import Venue from "../models/Venue.js";
import Announcement from "../models/Announcement.js";

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSport(value) {
  return normalizeText(value).toLowerCase();
}

function getAssignedSport(req) {
  return normalizeSport(req.user?.assignedSport);
}

function getSportSlug(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "-");
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    tournamentId: team.tournamentId?.toString?.() || "",
    tournamentName: team.tournamentName || "",
    category: team.category || "Male",
    members: team.members || [],
    coachCaptain: team.captainName || "",
    captainRegNo: team.captainRegNo || "",
    contactNumber: team.contactNumber || "",
    logo: team.logo || "",
    status: team.status,
    reviewedAt: team.reviewedAt,
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
    tournamentId: fixture.tournamentId?.toString?.() || "",
    tournamentName: fixture.tournamentName || "",
    teamA: fixture.teamA?.toString?.() || "",
    teamB: fixture.teamB?.toString?.() || "",
    teamAName: fixture.teamAName || "",
    teamBName: fixture.teamBName || "",
    departmentA: fixture.departmentA || "",
    departmentB: fixture.departmentB || "",
    sport: fixture.sport,
    sportName: fixture.sportName,
    sportId: fixture.sportId?.toString?.() || "",
    category: fixture.category || "Male",
    date: fixture.date,
    time: fixture.time,
    startTime: fixture.startTime,
    endTime: fixture.endTime,
    fullMatchSeconds: fixture.fullMatchSeconds || 90 * 60,
    matchGapMinutes: fixture.matchGapMinutes || 0,
    venue: fixture.venue,
    status: fixture.status === "completed" ? "completed" : fixture.status === "live" ? "live" : "scheduled",
    scoreA: fixture.scoreA || 0,
    scoreB: fixture.scoreB || 0,
    endedAt: fixture.endedAt,
    assignedVolunteer: fixture.assignedVolunteer?.toString?.() || "",
  };
}

function parsePositiveMinutes(value, label) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    const error = new Error(`${label} must be greater than 0`);
    error.status = 400;
    throw error;
  }
  return Math.floor(minutes);
}

function parseTimeToMinutes(value, label) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    const error = new Error(`${label} must use HH:MM format`);
    error.status = 400;
    throw error;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    const error = new Error(`${label} is invalid`);
    error.status = 400;
    throw error;
  }

  return hours * 60 + minutes;
}

function formatMinutesAsTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseDateOnly(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const error = new Error("Start date must use YYYY-MM-DD format");
    error.status = 400;
    throw error;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) {
    const error = new Error("Start date is invalid");
    error.status = 400;
    throw error;
  }
  return date;
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isSameFixtureSport(fixture, sportDoc) {
  const sportName = sportDoc.sportName || sportDoc.name || "";
  const sport = normalizeSport(sportName);
  return fixture.sportId?.toString?.() === sportDoc._id.toString() || normalizeSport(fixture.sport || fixture.sportName) === sport;
}

function getSportDateMatchCount(dateString, sportDoc, fixtures) {
  return fixtures.filter((fixture) => (
    fixture.status !== "cancelled" &&
    fixture.date === dateString &&
    isSameFixtureSport(fixture, sportDoc)
  )).length;
}

function getDateTime(date, minutes) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minutes / 60), minutes % 60, 0, 0);
}

function hasFixtureClash(payload, existingFixtures) {
  const { start, end } = getFixtureWindow(payload);
  const teamIds = [payload.teamA, payload.teamB].filter(Boolean).map(String);
  const departments = [payload.departmentA, payload.departmentB].filter(Boolean).map((department) => normalizeText(department).toLowerCase());
  const venue = normalizeText(payload.venue).toLowerCase();
  const assignedVolunteer = payload.assignedVolunteer ? String(payload.assignedVolunteer) : "";

  return existingFixtures.some((fixture) => {
    if (fixture.status === "cancelled") return false;
    const fixtureStart = fixture.startTime
      ? new Date(fixture.startTime)
      : fixture.date && fixture.time
        ? new Date(`${fixture.date}T${fixture.time}`)
        : null;
    const fixtureEnd = fixture.endTime
      ? new Date(fixture.endTime)
      : fixtureStart
        ? new Date(fixtureStart.getTime() + 60 * 60 * 1000)
        : null;
    const fixtureEndWithGap = fixtureEnd
      ? new Date(fixtureEnd.getTime() + Math.max(0, Number(fixture.matchGapMinutes || 0)) * 60 * 1000)
      : null;
    if (!fixtureStart || !fixtureEndWithGap || fixtureStart >= end || fixtureEndWithGap <= start) return false;

    const existingTeamIds = [fixture.teamA?.toString?.(), fixture.teamB?.toString?.()].filter(Boolean);
    if (teamIds.some((id) => existingTeamIds.includes(id))) return true;

    const existingDepartments = [fixture.departmentA, fixture.departmentB].filter(Boolean).map((department) => normalizeText(department).toLowerCase());
    if (departments.some((department) => existingDepartments.includes(department))) return true;

    if (venue && normalizeText(fixture.venue).toLowerCase() === venue) return true;

    if (assignedVolunteer && fixture.assignedVolunteer?.toString?.() === assignedVolunteer) return true;

    return false;
  });
}

function buildRoundRobinPairs(teams) {
  const pairs = [];
  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      pairs.push([teams[i], teams[j]]);
    }
  }
  return pairs;
}

function buildFixturePayload({ teamA, teamB, sportDoc, tournament, venueName, category, date, startMinutes, durationMinutes, gapMinutes, round, userId }) {
  const endMinutes = startMinutes + durationMinutes;
  const startTime = getDateTime(date, startMinutes);
  const endTime = getDateTime(date, endMinutes);
  const dateString = toDateInputValue(date);
  const timeString = formatMinutesAsTime(startMinutes);
  const sportName = sportDoc.sportName || sportDoc.name || "Sport";

  return {
    tournamentId: tournament._id,
    tournamentName: tournament.name,
    sport: normalizeSport(sportName),
    sportName,
    sportId: sportDoc._id,
    category,
    matchTitle: `${teamA.teamName} vs ${teamB.teamName}`,
    teamA: teamA._id,
    teamB: teamB._id,
    teamAName: teamA.teamName,
    teamBName: teamB.teamName,
    departmentA: teamA.department,
    departmentB: teamB.department,
    venue: venueName,
    date: dateString,
    time: timeString,
    startTime,
    endTime,
    fullMatchSeconds: durationMinutes * 60,
    matchGapMinutes: gapMinutes,
    round,
    status: "upcoming",
    createdBy: userId,
  };
}

function getNextWeekendDate(date) {
  const nextDate = new Date(date);
  while (!isWeekend(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  return nextDate;
}

function buildByeFixturePayload({ team, sportDoc, tournament, venueName, category, date, round, userId }) {
  const sportName = sportDoc.sportName || sportDoc.name || "Sport";
  const dateString = toDateInputValue(getNextWeekendDate(date));
  const now = Date.now();

  return {
    tournamentId: tournament._id,
    tournamentName: tournament.name,
    sport: normalizeSport(sportName),
    sportName,
    sportId: sportDoc._id,
    category,
    matchTitle: `${team.teamName} advances by bye`,
    teamA: team._id,
    teamAName: team.teamName,
    teamBName: "BYE",
    departmentA: team.department,
    venue: venueName || "BYE",
    date: dateString,
    time: "",
    scoreA: 1,
    scoreB: 0,
    round,
    status: "completed",
    isCompleted: true,
    completedAt: now,
    endedAt: new Date(now).toISOString(),
    createdBy: userId,
  };
}

function getFixtureWindow(fixture) {
  const start = fixture.startTime
    ? new Date(fixture.startTime)
    : fixture.date && fixture.time
      ? new Date(`${fixture.date}T${fixture.time}`)
      : null;
  const rawEnd = fixture.endTime ? new Date(fixture.endTime) : start ? new Date(start.getTime() + 60 * 60 * 1000) : null;
  const end = rawEnd
    ? new Date(rawEnd.getTime() + Math.max(0, Number(fixture.matchGapMinutes || 0)) * 60 * 1000)
    : null;

  if (!start || !rawEnd || Number.isNaN(start.getTime()) || Number.isNaN(rawEnd.getTime()) || rawEnd <= start || !end || Number.isNaN(end.getTime())) {
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
  const assignedSportSlug = getSportSlug(req.user?.assignedSport);
  const assignedSportId = req.user?.assignedSportId?.toString?.() || "";
  let query = {};
  if (req.user?.role === "coordinator") {
    if (assignedSportId) {
      query = {
        $or: [
          { sportId: assignedSportId },
          ...(assignedSport ? [{ sport: assignedSport }, { sport: assignedSportSlug }] : []),
        ],
      };
    } else if (assignedSport) {
      query = {
        $or: [
          { sport: assignedSport },
          { sport: assignedSportSlug },
          { sportName: new RegExp(`^${escapeRegExp(assignedSport).replace(/-/g, "[-\\s]+")}$`, "i") },
        ],
      };
    }
  }
  const teams = await Team.find(query).sort({ createdAt: -1 }).lean();
  return res.json(teams.map(mapTeam));
}

function normalizeMember(member) {
  if (typeof member === "string") {
    const text = normalizeText(member);
    return text || null;
  }
  if (member && typeof member === "object") {
    const fullName = normalizeText(member.fullName || member.name || "");
    const registrationNumber = member.registrationNumber || member.registrationNo || member.regNo ? normalizeText(String(member.registrationNumber || member.registrationNo || member.regNo)).toUpperCase() : "";
    const phone = normalizeText(member.phone || "");
    const semester = normalizeText(member.semester || "");
    if (!fullName && !registrationNumber) return null;
    return {
      fullName: fullName || undefined,
      registrationNo: registrationNumber || undefined,
      registrationNumber: registrationNumber || undefined,
      phone: phone || undefined,
      semester: semester || undefined,
    };
  }
  return null;
}

function exceedsSportDailyLimit(payload, sportDoc, fixtures, maxMatchesPerDay) {
  return getSportDateMatchCount(payload.date, sportDoc, fixtures) >= maxMatchesPerDay;
}

async function syncTeamPlayers(team) {
  await Player.deleteMany({ teamId: team._id });

  const members = Array.isArray(team.members) ? team.members : [];
  const playerDocs = members
    .map((member) => {
      const normalized = normalizeMember(member);
      if (!normalized) return null;
      const memberName = typeof normalized === "string" ? normalized : normalized.fullName;
      if (!memberName) return null;

      return {
        name: memberName,
        registrationNo: typeof normalized === "string" ? "" : normalized.registrationNo || normalized.registrationNumber || "",
        department: team.department,
        semester: typeof normalized === "string" ? "" : normalized.semester || "",
        phone: typeof normalized === "string" ? "" : normalized.phone || "",
        sportId: team.sportId,
        teamId: team._id,
        isCaptain: Boolean(team.captainName && memberName === team.captainName),
      };
    })
    .filter(Boolean);

  if (playerDocs.length > 0) {
    await Player.insertMany(playerDocs);
  }
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
    captainRegNo: req.body.captainRegNo ? normalizeText(req.body.captainRegNo).toUpperCase() : "",
    contactNumber: normalizeText(req.body.contactNumber || req.body.phone),
    members: Array.isArray(req.body.members) ? req.body.members.map(normalizeMember) : [],
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

  try {
    await syncTeamPlayers(team);
  } catch (err) {
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
    captainRegNo: req.body.captainRegNo ? normalizeText(req.body.captainRegNo).toUpperCase() : existingTeam.captainRegNo,
    contactNumber: normalizeText(req.body.contactNumber || existingTeam.contactNumber),
    members: Array.isArray(req.body.members) ? req.body.members.map(normalizeMember).filter(Boolean) : existingTeam.members,
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
  try {
    await syncTeamPlayers(existingTeam);
  } catch (err) {
    console.error("Failed to sync player docs for team:", err);
  }
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
      fullMatchSeconds: parsePositiveMinutes(fixture.fullMatchMinutes || fixture.matchDurationMinutes || 90, "Full match time") * 60,
      matchGapMinutes: Math.max(0, Math.floor(Number(fixture.matchGapMinutes || fixture.gapMinutes || 0))),
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
    fullMatchSeconds: parsePositiveMinutes(req.body.fullMatchMinutes || req.body.matchDurationMinutes || 90, "Full match time") * 60,
    matchGapMinutes: Math.max(0, Math.floor(Number(req.body.matchGapMinutes || req.body.gapMinutes || 0))),
    round: normalizeText(req.body.round),
    status: req.body.status || "upcoming",
    assignedVolunteer: req.body.assignedVolunteer || undefined,
    createdBy: req.user?.id,
  };

  const { start, end } = await assertFixtureNoClash(payload);
  const fixture = await Fixture.create({ ...payload, startTime: start, endTime: end });
  return res.status(201).json(mapFixture(fixture));
}

export async function generateFixtures(req, res) {
  requireObjectId(req.body.tournamentId, "Tournament id");
  requireObjectId(req.body.sportId, "Sport id");

  const category = req.body.category === "Female" ? "Female" : req.body.category === "Male" ? "Male" : "";
  if (!category) {
    return res.status(400).json({ message: "Category must be Male or Female" });
  }

  const [tournament, sportDoc] = await Promise.all([
    Tournament.findById(req.body.tournamentId),
    Sport.findById(req.body.sportId),
  ]);

  if (!tournament) return res.status(400).json({ message: "Tournament not found" });
  if (!sportDoc) return res.status(400).json({ message: "Sport not found" });

  const venueName = normalizeText(req.body.venue);
  if (!venueName && !req.body.venueId) {
    return res.status(400).json({ message: "Venue is required" });
  }

  let selectedVenueName = venueName;
  if (req.body.venueId) {
    requireObjectId(req.body.venueId, "Venue id");
    const venueDoc = await Venue.findById(req.body.venueId).lean();
    if (!venueDoc) return res.status(400).json({ message: "Venue not found" });
    selectedVenueName = venueDoc.name;
  }

  const startDate = parseDateOnly(req.body.startDate);
  const dayStartMinutes = parseTimeToMinutes(req.body.dayStartTime, "Day start time");
  const dayEndMinutes = parseTimeToMinutes(req.body.dayEndTime, "Day end time");
  const matchDurationMinutes = parsePositiveMinutes(req.body.matchDurationMinutes, "Match duration");
  const rawGapMinutes = Number(req.body.gapMinutes || 0);
  const gapMinutes = Number.isFinite(rawGapMinutes) && rawGapMinutes > 0 ? Math.floor(rawGapMinutes) : 0;

  if (dayEndMinutes <= dayStartMinutes) {
    return res.status(400).json({ message: "Day end time must be after day start time" });
  }

  if (dayStartMinutes + matchDurationMinutes > dayEndMinutes) {
    return res.status(400).json({ message: "The match duration does not fit inside the selected day window" });
  }

  const sportName = sportDoc.sportName || sportDoc.name || "";
  const sport = normalizeSport(sportName);
  const teams = await Team.find({
    status: "approved",
    tournamentId: tournament._id,
    category,
    $or: [
      { sportId: sportDoc._id },
      { sport },
    ],
  }).sort({ teamName: 1 }).lean();

  const byeFixtures = [];
  let fixtureTeams = teams;
  if (teams.length === 0) {
    return res.status(400).json({ message: "At least one approved team is required to generate fixtures" });
  }

  if (teams.length === 1) {
    byeFixtures.push(buildByeFixturePayload({
      team: teams[0],
      sportDoc,
      tournament,
      venueName: selectedVenueName,
      category,
      date: startDate,
      round: "Default Winner",
      userId: req.user?.id,
    }));
  } else if (teams.length % 2 === 1) {
    const byeTeam = teams[teams.length - 1];
    fixtureTeams = teams.slice(0, -1);
    byeFixtures.push(buildByeFixturePayload({
      team: byeTeam,
      sportDoc,
      tournament,
      venueName: selectedVenueName,
      category,
      date: startDate,
      round: "Bye",
      userId: req.user?.id,
    }));
  }

  const pairs = fixtureTeams.length > 1 ? buildRoundRobinPairs(fixtureTeams) : [];
  const existingFixtures = await Fixture.find({ status: { $ne: "cancelled" } }).lean();
  const scheduledFixtures = [...byeFixtures];
  const maxMatchesPerSportPerDay = 2;
  let cursorDate = new Date(startDate);
  let cursorMinutes = dayStartMinutes;

  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
    const [teamA, teamB] = pairs[pairIndex];
    let placed = false;

    for (let dayOffset = 0; dayOffset < 365 && !placed; dayOffset += 1) {
      while (!isWeekend(cursorDate)) {
        cursorDate.setDate(cursorDate.getDate() + 1);
        cursorMinutes = dayStartMinutes;
      }

      const dateString = toDateInputValue(cursorDate);
      if (getSportDateMatchCount(dateString, sportDoc, [...existingFixtures, ...scheduledFixtures]) >= maxMatchesPerSportPerDay) {
        cursorDate.setDate(cursorDate.getDate() + 1);
        cursorMinutes = dayStartMinutes;
        continue;
      }

      if (cursorMinutes + matchDurationMinutes > dayEndMinutes) {
        cursorDate.setDate(cursorDate.getDate() + 1);
        cursorMinutes = dayStartMinutes;
        continue;
      }

      const payload = buildFixturePayload({
        teamA,
        teamB,
        sportDoc,
        tournament,
        venueName: selectedVenueName,
        category,
        date: cursorDate,
        startMinutes: cursorMinutes,
        durationMinutes: matchDurationMinutes,
        gapMinutes,
        round: `Round ${pairIndex + 1}`,
        userId: req.user?.id,
      });

      if (
        !exceedsSportDailyLimit(payload, sportDoc, [...existingFixtures, ...scheduledFixtures], maxMatchesPerSportPerDay) &&
        !hasFixtureClash(payload, [...existingFixtures, ...scheduledFixtures])
      ) {
        scheduledFixtures.push(payload);
        cursorMinutes += matchDurationMinutes + gapMinutes;
        placed = true;
        break;
      }

      cursorMinutes += matchDurationMinutes + gapMinutes;
    }

    if (!placed) {
      return res.status(400).json({
        message: `Could not place ${teamA.teamName} vs ${teamB.teamName} without a clash inside the next 365 weekend days.`,
      });
    }
  }

  const createdFixtures = scheduledFixtures.length ? await Fixture.insertMany(scheduledFixtures) : [];
  if (createdFixtures.length > 0) {
    await Announcement.create({
      title: `${sportName || "Sport"} Fixtures Published`,
      message: `${createdFixtures.length} ${category} ${sportName || "sport"} fixture${createdFixtures.length === 1 ? "" : "s"} for ${tournament.name} ${createdFixtures.length === 1 ? "has" : "have"} been published.`,
      priority: "important",
      visibleToPublic: true,
      postedBy: req.user?.id,
      postedByRole: req.user?.role || "supercoordinator",
    });
  }

  return res.status(201).json({
    message: teams.length === 1
      ? `${teams[0].teamName} marked as default winner.`
      : `Generated ${createdFixtures.length} fixture${createdFixtures.length === 1 ? "" : "s"}${byeFixtures.length ? " including bye/default winner entries" : ""}.`,
    totalMatches: createdFixtures.length,
    fixtures: createdFixtures.map(mapFixture),
  });
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
      fullMatchSeconds: existing.fullMatchSeconds || 90 * 60,
      matchGapMinutes: existing.matchGapMinutes || 0,
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
