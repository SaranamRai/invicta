import Sport from "../models/Sport.js";
import Fixture from "../models/Fixture.js";
import LiveScore from "../models/LiveScore.js";
import LiveFeed from "../models/LiveFeed.js";
import Result from "../models/Result.js";
import Announcement from "../models/Announcement.js";
import Rule from "../models/Rule.js";
import PointsTable from "../models/PointsTable.js";
import Gallery from "../models/Gallery.js";
import Tournament from "../models/Tournament.js";
import Team from "../models/Team.js";

const publicModels = {
  sports: Sport,
  fixtures: Fixture,
  "live-scores": LiveScore,
  "live-feeds": LiveFeed,
  results: Result,
  announcements: Announcement,
  rules: Rule,
  "points-table": PointsTable,
  gallery: Gallery,
  tournaments: Tournament,
  teams: Team,
};

function addQueryFilters(resource, req, filter) {
  const { tournamentId, sportId, category, teamId, fixtureId } = req.query || {};
  if (tournamentId) filter.tournamentId = tournamentId;
  if (sportId) filter.sportId = sportId;
  if (category) filter.category = String(category);
  if (fixtureId && (resource === "live-scores" || resource === "live-feeds")) filter.fixtureId = fixtureId;
  if (teamId && resource === "fixtures") filter.$or = [{ teamA: teamId }, { teamB: teamId }];
  if (teamId && resource === "teams") filter._id = teamId;
  return filter;
}

export function listPublic(resource) {
  return async (req, res) => {
    const model = publicModels[resource];
    const filter = addQueryFilters(resource, req, resource === "announcements" ? { visibleToPublic: true } : {});

    let query = model.find(filter).sort({ createdAt: -1 });

    if (resource === "fixtures") {
      query = query.populate("sportId", "name").populate("teamA", "teamName department").populate("teamB", "teamName department");
    }

    if (resource === "live-feeds") {
      query = query.populate("fixtureId", "matchTitle");
    }

    if (resource === "teams") {
      query = query.populate("sportId", "name");
    }

    const data = await query.lean();
    return res.json(data);
  };
}

const sportNames = {
  football: "Football",
  cricket: "Cricket",
  volleyball: "Volleyball",
  badminton: "Badminton",
  "table-tennis": "Table Tennis",
  chess: "Chess",
};

const playerCountsBySport = {
  football: 11,
  cricket: 11,
  volleyball: 6,
  badminton: 2,
  "table-tennis": 2,
  chess: 1,
};

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSport(value) {
  return normalizeText(value).toLowerCase();
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

export async function registerPublicTeam(req, res) {
  try {
    const department = normalizeText(req.body.department).toUpperCase();
    const sport = normalizeSport(req.body.sport);
    const captainName = normalizeText(req.body.captainName);
    const email = normalizeText(req.body.email);
    const phone = normalizeText(req.body.phone || req.body.contactNumber).replace(/\D/g, "");

    if (!department || !sport || !captainName || !email || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const expectedPlayerCount = playerCountsBySport[sport];
    if (expectedPlayerCount === undefined) {
      return res.status(400).json({ message: "Invalid sport selected" });
    }

    const members = Array.isArray(req.body.members)
      ? req.body.members.map((member) => {
        if (typeof member === "object" && member !== null) {
          return normalizeText(member.fullName || member.name || member.playerName);
        }
        return normalizeText(member);
      }).filter(Boolean)
      : [];

    if (members.length !== expectedPlayerCount) {
      return res.status(400).json({
        message: `Exactly ${expectedPlayerCount} players are required for ${getSportName(sport)}`
      });
    }

    // Count existing teams for this department and sport
    const existingTeamsCount = await Team.countDocuments({
      department,
      sport,
    });

    if (existingTeamsCount >= 2) {
      return res.status(400).json({
        message: `Only 2 teams from ${department} are allowed to register for ${getSportName(sport)}.`
      });
    }

    const sportDoc = await getOrCreateSport(sport);
    const tournamentId = normalizeText(req.body.tournamentId);
    const tournamentName = normalizeText(req.body.tournamentName);
    const category = normalizeText(req.body.category || req.body.gender);

    const team = await Team.create({
      teamName: department, // teamName will be department name
      department,
      sport,
      sportName: sportDoc.name,
      sportId: sportDoc._id,
      ...(tournamentId ? { tournamentId } : {}),
      ...(tournamentName ? { tournamentName } : {}),
      ...(category ? { category } : {}),
      captainName,
      contactNumber: phone,
      email,
      members,
      status: "approved", // auto approved
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      registeredAt: Date.now(),
      playerRegisteredAt: members.map(() => Date.now()),
    });

    // map team response (matching the API client structure)
    return res.status(201).json({
      id: team._id.toString(),
      name: team.teamName,
      department: team.department,
      sport: team.sport,
      members: team.members || [],
      coachCaptain: team.captainName || "",
      contactNumber: team.contactNumber || "",
      email: team.email || "",
      status: team.status,
      wins: team.wins || 0,
      losses: team.losses || 0,
      draws: team.draws || 0,
      points: team.points || 0,
      registeredAt: team.registeredAt,
    });
  } catch (error) {
    console.error("Public team registration failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
