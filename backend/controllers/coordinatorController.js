import Team from "../models/Team.js";
import Player from "../models/Player.js";
import Fixture from "../models/Fixture.js";
import Issue from "../models/Issue.js";
import Announcement from "../models/Announcement.js";
import Rule from "../models/Rule.js";
import Sport from "../models/Sport.js";
import PointsTable from "../models/PointsTable.js";
import Volunteer from "../models/Volunteer.js";
import { createRoleAccount } from "./authController.js";
import bcrypt from "bcryptjs";

function normalizeSport(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function requireCoordinatorSport(req, sport) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const requestedSport = normalizeSport(sport);

  if (assignedSport && requestedSport !== assignedSport) {
    const error = new Error(`This coordinator can only manage ${assignedSport}`);
    error.status = 403;
    throw error;
  }
}

function mapCoordinatorVolunteer(volunteer) {
  return {
    id: volunteer._id.toString(),
    name: volunteer.name || volunteer.email,
    email: volunteer.email,
    assignedSport: volunteer.assignedSport || "",
    assignedSportId: volunteer.assignedSportId?.toString?.() || "",
    assignedSportName: volunteer.assignedSportName || "",
    registrationNumber: volunteer.registrationNumber || "",
    phone: volunteer.phone || "",
    status: volunteer.status || "active",
    createdAt: volunteer.createdAt,
  };
}

async function getAssignedSportIds(assignedSport) {
  if (!assignedSport) return [];
  const sports = await Sport.find().lean();
  return sports
    .filter((sport) => normalizeSport(sport.sportName || sport.name || sport._id) === assignedSport)
    .map((sport) => sport._id);
}

export async function myDepartment(req, res) {
  return res.json({
    department: req.user.department || "",
    assignedSport: req.user.assignedSport || "",
  });
}

export async function createTeam(req, res) {
  requireCoordinatorSport(req, req.body.sport);
  const team = await Team.create({ ...req.body, createdBy: req.user.id, status: "pending" });

  // Also create Player documents for members if provided
  try {
    const members = Array.isArray(team.members) ? team.members : [];
    for (const member of members) {
      const memberName = String(member || "").trim();
      if (!memberName) continue;
      await Player.create({
        name: memberName,
        department: team.department,
        phone: "",
        sportId: team.sportId,
        teamId: team._id,
        isCaptain: Boolean(team.captainName && memberName === team.captainName),
      });
    }
  } catch (err) {
    console.error("Failed to create player docs for coordinator team:", err);
  }

  return res.status(201).json(team);
}

export async function updateTeam(req, res) {
  const existingTeam = await Team.findById(req.params.id);
  if (!existingTeam) return res.status(404).json({ message: "Team not found" });
  requireCoordinatorSport(req, req.body.sport || existingTeam.sport);
  const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!team) return res.status(404).json({ message: "Team not found" });
  return res.json(team);
}

export async function createPlayer(req, res) {
  const player = await Player.create(req.body);
  return res.status(201).json(player);
}

export async function updatePlayer(req, res) {
  const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!player) return res.status(404).json({ message: "Player not found" });
  return res.json(player);
}

export async function coordinatorFixtures(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const query = assignedSport ? { sport: assignedSport } : {};
  if (req.query.tournamentId) query.tournamentId = req.query.tournamentId;
  if (req.query.category) query.category = String(req.query.category);
  const fixtures = await Fixture.find(query).sort({ date: 1, time: 1 }).lean();

  return res.json(fixtures.map((fixture) => ({
    id: fixture._id.toString(),
    teamA: fixture.teamA?.toString?.() || "",
    teamB: fixture.teamB?.toString?.() || "",
    teamAName: fixture.teamAName || "",
    teamBName: fixture.teamBName || "",
    sport: fixture.sport,
    sportName: fixture.sportName || "",
    tournamentId: fixture.tournamentId?.toString?.() || "",
    tournamentName: fixture.tournamentName || "",
    category: fixture.category || "",
    date: fixture.date || "",
    time: fixture.time || "",
    venue: fixture.venue || "",
    status: fixture.status === "completed" ? "completed" : fixture.status === "live" ? "live" : "scheduled",
    scoreA: fixture.scoreA || 0,
    scoreB: fixture.scoreB || 0,
    assignedVolunteer: fixture.assignedVolunteer?.toString?.() || "",
  })));
}

export async function coordinatorVolunteers(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const query = assignedSport ? { assignedSport } : { createdBy: req.user.id };
  const volunteers = await Volunteer.find(query).sort({ createdAt: -1 }).lean();

  return res.json(volunteers.map(mapCoordinatorVolunteer));
}

export async function updateCoordinatorVolunteer(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const volunteer = await Volunteer.findById(req.params.id);
  if (!volunteer) return res.status(404).json({ message: "Volunteer not found" });

  if (assignedSport && normalizeSport(volunteer.assignedSport) !== assignedSport) {
    return res.status(403).json({ message: `This coordinator can only edit volunteers for ${assignedSport}` });
  }

  const name = normalizeText(req.body.name);
  const email = normalizeText(req.body.email).toLowerCase();
  const registrationNumber = normalizeText(req.body.registrationNumber);
  const phone = normalizeText(req.body.phone || req.body.mobileNo || req.body.mobileNumber);

  if (!name || !email || !registrationNumber || !phone) {
    return res.status(400).json({ message: "Name, email, registration number, and mobile number are required" });
  }

  if (email !== volunteer.email) {
    const existingVolunteer = await Volunteer.findOne({ email, _id: { $ne: volunteer._id } }).lean();
    if (existingVolunteer) return res.status(409).json({ message: "A volunteer with this email already exists" });
  }

  volunteer.name = name;
  volunteer.email = email;
  volunteer.registrationNumber = registrationNumber;
  volunteer.phone = phone;
  if (req.body.status === "active" || req.body.status === "inactive") {
    volunteer.status = req.body.status;
  }
  if (req.body.password) {
    volunteer.password = await bcrypt.hash(String(req.body.password), 12);
  }

  await volunteer.save();
  return res.json(mapCoordinatorVolunteer(volunteer));
}

export async function coordinatorPointsTable(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const sportIds = await getAssignedSportIds(assignedSport);
  if (assignedSport && sportIds.length === 0) return res.json([]);

  const rows = await PointsTable.find(assignedSport ? { sportId: { $in: sportIds } } : {})
    .populate("sportId", "sportName name")
    .sort({ points: -1, wins: -1, updatedAt: -1 })
    .lean();

  return res.json(rows.map((row, index) => ({
    id: row._id.toString(),
    rank: index + 1,
    department: row.department,
    sportId: row.sportId?._id?.toString?.() || row.sportId?.toString?.() || "",
    sportName: row.sportId?.sportName || row.sportId?.name || "",
    matchesPlayed: row.matchesPlayed || 0,
    wins: row.wins || 0,
    losses: row.losses || 0,
    draws: row.draws || 0,
    points: row.points || 0,
    updatedAt: row.updatedAt,
  })));
}

export async function coordinatorAnnouncements(req, res) {
  const announcements = await Announcement.find({ visibleToPublic: true })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return res.json(announcements);
}

export async function createCoordinatorIssue(req, res) {
  const issue = await Issue.create({ ...req.body, reportedBy: req.user.id, reportedByRole: req.user.role });
  return res.status(201).json(issue);
}

export async function assignFixtureVolunteer(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const volunteerId = normalizeText(req.body.volunteerId);

  if (!volunteerId) {
    return res.status(400).json({ message: "Volunteer is required" });
  }

  const [fixture, volunteer] = await Promise.all([
    Fixture.findById(req.params.id),
    Volunteer.findById(volunteerId),
  ]);

  if (!fixture) return res.status(404).json({ message: "Fixture not found" });
  if (!volunteer) return res.status(404).json({ message: "Volunteer not found" });

  requireCoordinatorSport(req, fixture.sport);

  if (req.body.tournamentId && fixture.tournamentId?.toString?.() !== req.body.tournamentId) {
    return res.status(400).json({ message: "Selected fixture does not belong to this tournament" });
  }

  if (assignedSport && normalizeSport(volunteer.assignedSport) !== assignedSport) {
    return res.status(403).json({ message: `Volunteer must belong to ${assignedSport}` });
  }

  if (fixture.startTime && fixture.endTime) {
    const volunteerClash = await Fixture.findOne({
      _id: { $ne: fixture._id },
      assignedVolunteer: volunteer._id,
      status: { $ne: "cancelled" },
      startTime: { $lt: fixture.endTime },
      endTime: { $gt: fixture.startTime },
    }).lean();

    if (volunteerClash) {
      return res.status(400).json({ message: "Volunteer clash detected: this volunteer is already assigned to another match at this time." });
    }
  }

  fixture.assignedVolunteer = volunteer._id;
  await fixture.save();

  return res.json({
    id: fixture._id.toString(),
    assignedVolunteer: fixture.assignedVolunteer.toString(),
  });
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export async function publishRule(req, res) {
  const title = normalizeText(req.body.title);
  const description = normalizeText(req.body.description || req.body.rules);
  const sport = normalizeText(req.body.sport).toLowerCase();
  const sportName = normalizeText(req.body.sportName || sport);
  const tournamentId = normalizeText(req.body.tournamentId);
  const tournamentName = normalizeText(req.body.tournamentName);
  const category = normalizeText(req.body.category);

  if (!title || !description || !sport || !tournamentId) {
    return res.status(400).json({ message: "Tournament, sport, title, and rules are required" });
  }

  requireCoordinatorSport(req, sport);

  let sportDoc = await Sport.findOne({
    $or: [
      { sportName: new RegExp(`^${sportName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      { name: new RegExp(`^${sportName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    ],
  });
  if (!sportDoc) {
    sportDoc = await Sport.create({
      sportName,
      name: sportName,
      categories: ["Male", "Female"],
      status: "active",
    });
  }

  const rule = await Rule.create({
    sport,
    sportName,
    sportId: sportDoc._id,
    tournamentId,
    tournamentName,
    category,
    title,
    rules: description,
    description,
    attachmentData: req.body.attachmentData || "",
    attachmentName: req.body.attachmentName || "",
    attachmentType: req.body.attachmentType || "",
    attachmentKind: req.body.attachmentKind || undefined,
    createdByName: req.user.name || "Coordinator",
    createdByEmail: req.user.email || "",
  });

  await Announcement.create({
    title: `${sportName} Rules Published`,
    message: `${req.user.name || "Coordinator"} added rules for ${sportName}.`,
    visibleToPublic: true,
    postedBy: req.user.id,
    postedByRole: req.user.role,
  });

  return res.status(201).json(rule);
}

export async function createCoordinatorVolunteer(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const requestedSport = normalizeSport(req.body.assignedSport || req.body.sport || assignedSport);
  const registrationNumber = normalizeText(req.body.registrationNumber);
  const phone = normalizeText(req.body.phone || req.body.mobileNo || req.body.mobileNumber);

  if (!assignedSport) {
    return res.status(400).json({ message: "Coordinator must have an assigned sport before adding volunteers" });
  }

  if (requestedSport !== assignedSport) {
    return res.status(403).json({ message: `This coordinator can only add volunteers for ${assignedSport}` });
  }

  if (!registrationNumber || !phone) {
    return res.status(400).json({ message: "Registration number and mobile number are required" });
  }

  req.body.assignedSport = assignedSport;
  req.body.registrationNumber = registrationNumber;
  req.body.phone = phone;
  return createRoleAccount(Volunteer, "volunteer", req, res);
}
