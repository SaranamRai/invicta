import Admin from "../models/Admin.js";
import SuperCoordinator from "../models/SuperCoordinator.js";
import Volunteer from "../models/Volunteer.js";
import Coordinator from "../models/Coordinator.js";
import bcrypt from "bcryptjs";
import Sport from "../models/Sport.js";
import Department from "../models/Department.js";
import Fixture from "../models/Fixture.js";
import Announcement from "../models/Announcement.js";
import Rule from "../models/Rule.js";
import Result from "../models/Result.js";
import Issue from "../models/Issue.js";
import Tournament from "../models/Tournament.js";
import Team from "../models/Team.js";
import LiveScore from "../models/LiveScore.js";
import Venue from "../models/Venue.js";
import { createRoleAccount } from "./authController.js";

export function createDoc(model) {
  return async (req, res) => {
    const doc = await model.create(req.body);
    return res.status(201).json(doc);
  };
}

export function updateDoc(model) {
  return async (req, res) => {
    const doc = await model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ message: "Record not found" });
    return res.json(doc);
  };
}

export function deleteDoc(model) {
  return async (req, res) => {
    const doc = await model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Record not found" });
    return res.json({ message: "Deleted successfully" });
  };
}

export async function verifyResult(req, res) {
  const result = await Result.findByIdAndUpdate(
    req.params.id,
    { verifiedByAdmin: true },
    { new: true }
  );
  if (!result) return res.status(404).json({ message: "Result not found" });
  return res.json(result);
}

export async function listIssues(_req, res) {
  const issues = await Issue.find().sort({ createdAt: -1 }).lean();
  return res.json(issues);
}

export async function createAnnouncement(req, res) {
  const { title, message, visibleToPublic = true, attachmentName, attachmentType, attachmentHtml } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  const announcement = await Announcement.create({
    title,
    message,
    visibleToPublic,
    attachmentName,
    attachmentType,
    attachmentHtml,
    postedBy: req.user.id,
    postedByRole: req.user.role,
  });

  return res.status(201).json(announcement);
}

export async function listRoleAccounts(_req, res) {
  const [admins, superCoordinators, volunteers, coordinators] = await Promise.all([
    Admin.find().lean(),
    SuperCoordinator.find().lean(),
    Volunteer.find().lean(),
    Coordinator.find().lean(),
  ]);

  const mapAccount = (account, role) => ({
    id: account._id.toString(),
    fullName: account.name || account.email,
    email: account.email,
    deptName: account.department || account.assignedSport || "Not assigned",
    assignedSport: account.assignedSport || "",
    assignedSportId: account.assignedSportId?.toString?.() || "",
    assignedSportName: account.assignedSportName || "",
    status: account.status || "active",
    createdBy: account.createdBy?.toString?.() || "",
    createdByRole: account.createdByRole || "",
    role,
    createdAt: account.createdAt,
  });

  return res.json([
    ...admins.map((account) => mapAccount(account, "admin")),
    ...superCoordinators.map((account) => mapAccount(account, "supercoordinator")),
    ...volunteers.map((account) => mapAccount(account, "volunteer")),
    ...coordinators.map((account) => mapAccount(account, "coordinator")),
  ]);
}

function getRoleModel(role) {
  if (role === "admin") return Admin;
  if (role === "supercoordinator") return SuperCoordinator;
  if (role === "coordinator") return Coordinator;
  if (role === "volunteer") return Volunteer;
  return null;
}

export async function updateRoleAccount(req, res) {
  const role = String(req.body.role || "").trim().toLowerCase();
  const model = getRoleModel(role);
  if (!model) return res.status(400).json({ message: "Valid role is required" });

  const patch = {};
  if (req.body.name) patch.name = String(req.body.name).trim();
  if (req.body.email) patch.email = String(req.body.email).trim().toLowerCase();
  if (req.body.assignedSport !== undefined) patch.assignedSport = String(req.body.assignedSport || "").trim().toLowerCase();
  if (req.body.assignedSportId !== undefined) patch.assignedSportId = req.body.assignedSportId || undefined;
  if (req.body.assignedSportName !== undefined) patch.assignedSportName = String(req.body.assignedSportName || "").trim();
  if (req.body.status !== undefined) patch.status = String(req.body.status || "active").trim().toLowerCase();
  if (req.body.password) patch.password = await bcrypt.hash(String(req.body.password), 12);

  const account = await model.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!account) return res.status(404).json({ message: "Account not found" });

  return res.json({
    id: account._id.toString(),
    fullName: account.name || account.email,
    email: account.email,
    deptName: account.department || account.assignedSport || account.status || "Not assigned",
    assignedSport: account.assignedSport || "",
    assignedSportId: account.assignedSportId?.toString?.() || "",
    assignedSportName: account.assignedSportName || "",
    role,
    status: account.status || "active",
  });
}

export async function deleteRoleAccount(req, res) {
  const role = String(req.body.role || req.query.role || "").trim().toLowerCase();
  const model = getRoleModel(role);
  if (!model) return res.status(400).json({ message: "Valid role is required" });

  const account = await model.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true });
  if (!account) return res.status(404).json({ message: "Account not found" });
  return res.json({ message: "Account deactivated successfully" });
}

export async function listTournaments(_req, res) {
  const tournaments = await Tournament.find().sort({ createdAt: -1 }).lean();
  return res.json(tournaments);
}

export async function listVenues(_req, res) {
  const venues = await Venue.find().sort({ createdAt: -1 }).lean();
  return res.json(venues);
}

export async function createVenue(req, res) {
  const venueName = String(req.body.venueName || req.body.name || "").trim();
  if (!venueName) return res.status(400).json({ message: "Venue name is required" });

  const venue = await Venue.create({
    venueName,
    name: venueName,
    location: String(req.body.location || "").trim(),
    sportType: String(req.body.sportType || "both").trim().toLowerCase(),
    capacity: req.body.capacity ? Number(req.body.capacity) : undefined,
    status: String(req.body.status || "active").trim().toLowerCase(),
  });

  return res.status(201).json(venue);
}

export async function tournamentReport(req, res) {
  const tournamentId = req.params.id;
  const tournament = await Tournament.findById(tournamentId).lean();
  if (!tournament) return res.status(404).json({ message: "Tournament not found" });

  const [teams, fixtures, liveScores] = await Promise.all([
    Team.find({ tournamentId }).populate("sportId", "name").lean(),
    Fixture.find({ tournamentId }).populate("sportId", "name").lean(),
    LiveScore.find({ tournamentId }).lean(),
  ]);

  const sports = [...new Set(teams.map((team) => team.sportName || team.sport || team.sportId?.name).filter(Boolean))];
  const categories = [...new Set(teams.map((team) => team.category).filter(Boolean))];
  const completedMatches = fixtures.filter((fixture) => fixture.status === "completed" || fixture.isCompleted);
  const pendingMatches = fixtures.filter((fixture) => fixture.status !== "completed" && !fixture.isCompleted);
  const totalPlayers = teams.reduce((sum, team) => sum + (Array.isArray(team.members) ? team.members.length : 0), 0);
  const winners = completedMatches
    .map((fixture) => {
      const score = liveScores.find((item) => item.fixtureId?.toString?.() === fixture._id.toString());
      const scoreA = Number(score?.teamAScore ?? fixture.scoreA ?? 0);
      const scoreB = Number(score?.teamBScore ?? fixture.scoreB ?? 0);
      if (scoreA === scoreB) return null;
      return {
        fixtureId: fixture._id,
        matchTitle: fixture.matchTitle,
        winnerTeam: scoreA > scoreB ? fixture.teamAName : fixture.teamBName,
        finalScore: `${scoreA}-${scoreB}`,
      };
    })
    .filter(Boolean);

  return res.json({
    tournament,
    sports,
    categories,
    totalRegisteredTeams: teams.length,
    totalPlayers,
    fixtures,
    completedMatches: completedMatches.length,
    pendingMatches: pendingMatches.length,
    results: liveScores,
    points: teams.map((team) => ({
      teamName: team.teamName,
      sport: team.sportName || team.sport,
      category: team.category || "",
      wins: team.wins || 0,
      losses: team.losses || 0,
      draws: team.draws || 0,
      points: team.points || 0,
    })),
    winners,
  });
}

export async function toggleTournamentRegistration(req, res) {
  const { registrationOpen } = req.body;

  if (typeof registrationOpen !== "boolean") {
    return res.status(400).json({ message: "registrationOpen must be a boolean" });
  }

  // Support both MongoDB _id and any custom `id` field used by the frontend
  const query = { $or: [{ _id: req.params.id }, { id: req.params.id }] };
  const tournament = await Tournament.findOneAndUpdate(
    query,
    { registrationOpen },
    { new: true }
  );

  if (!tournament) {
    return res.status(404).json({ message: "Tournament not found" });
  }

  return res.json(tournament);
}

export const adminHandlers = {
  createSport: createDoc(Sport),
  updateSport: updateDoc(Sport),
  deleteSport: deleteDoc(Sport),
  createDepartment: createDoc(Department),
  updateDepartment: updateDoc(Department),
  deleteDepartment: deleteDoc(Department),
  createFixture: createDoc(Fixture),
  updateFixture: updateDoc(Fixture),
  deleteFixture: deleteDoc(Fixture),
  createAnnouncement,
  createRule: createDoc(Rule),
  createResult: createDoc(Result),
  createTournament: createDoc(Tournament),
  createVenue,
  updateTournament: updateDoc(Tournament),
  toggleTournamentRegistration,
  deleteTournament: deleteDoc(Tournament),
  createAdmin: (req, res) => createRoleAccount(Admin, "admin", req, res),
  createSuperCoordinator: (req, res) => createRoleAccount(SuperCoordinator, "supercoordinator", req, res),
  createVolunteer: (req, res) => createRoleAccount(Volunteer, "volunteer", req, res),
  createCoordinator: (req, res) => createRoleAccount(Coordinator, "coordinator", req, res),
};
