import Admin from "../models/Admin.js";
import SuperCoordinator from "../models/SuperCoordinator.js";
import Volunteer from "../models/Volunteer.js";
import Coordinator from "../models/Coordinator.js";
import Sport from "../models/Sport.js";
import Department from "../models/Department.js";
import Fixture from "../models/Fixture.js";
import Announcement from "../models/Announcement.js";
import Team from "../models/Team.js";
import Rule from "../models/Rule.js";
import Result from "../models/Result.js";
import Issue from "../models/Issue.js";
import Tournament from "../models/Tournament.js";
import Venue from "../models/Venue.js";
import { createRoleAccount } from "./authController.js";
import { applyRecommendedPlayerCounts } from "../utils/sportPlayerCounts.js";
import bcrypt from "bcryptjs";

export function createDoc(model) {
  return async (req, res) => {
    const doc = await model.create({ ...req.body, createdBy: req.user?.id });
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
  const { title, message, priority = "normal", visibleToPublic = true, attachmentName, attachmentType, attachmentHtml } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  if (!["normal", "important", "urgent"].includes(priority)) {
    return res.status(400).json({ message: "Priority must be normal, important, or urgent" });
  }

  const announcement = await Announcement.create({
    title,
    message,
    priority,
    visibleToPublic,
    attachmentName,
    attachmentType,
    attachmentHtml,
    postedBy: req.user.id,
    postedByRole: req.user.role,
  });

  return res.status(201).json(announcement);
}

export async function updateAnnouncement(req, res) {
  const { id } = req.params;
  const { title, message, priority, visibleToPublic } = req.body;

  const announcement = await Announcement.findById(id);
  if (!announcement) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  if (title !== undefined) announcement.title = title;
  if (message !== undefined) announcement.message = message;
  if (priority !== undefined) {
    if (!["normal", "important", "urgent"].includes(priority)) {
      return res.status(400).json({ message: "Priority must be normal, important, or urgent" });
    }
    announcement.priority = priority;
  }
  if (visibleToPublic !== undefined) announcement.visibleToPublic = visibleToPublic;

  await announcement.save();
  return res.json(announcement);
}

export async function deleteAnnouncement(req, res) {
  const { id } = req.params;
  const announcement = await Announcement.findByIdAndDelete(id);
  if (!announcement) {
    return res.status(404).json({ message: "Announcement not found" });
  }
  return res.json({ message: "Announcement deleted successfully" });
}

export async function listVenues(_req, res) {
  const venues = await Venue.find().sort({ name: 1 }).lean();
  return res.json(venues);
}

export async function createVenue(req, res) {
  const { name, location, sportType } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Venue name is required" });
  }
  const venue = await Venue.create({ name, location: location || "", sportType: sportType || "" });
  return res.status(201).json(venue);
}

export async function updateVenue(req, res) {
  const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!venue) return res.status(404).json({ message: "Venue not found" });
  return res.json(venue);
}

export async function deleteVenue(req, res) {
  const venue = await Venue.findByIdAndDelete(req.params.id);
  if (!venue) return res.status(404).json({ message: "Venue not found" });
  return res.json({ message: "Venue deleted successfully" });
}

export async function listSports(_req, res) {
  const sports = await Sport.find().sort({ sportName: 1, name: 1 }).lean();
  return res.json(sports);
}

export async function listPendingRegistrations(_req, res) {
  const teams = await Team.find({ status: "pending" })
    .populate("sportId", "sportName name")
    .sort({ submittedAt: -1 })
    .lean();
  return res.json(teams);
}

function normalizeSportPayload(body) {
  const sportName = String(body.sportName || body.name || "").trim().replace(/\s+/g, " ");
  const categories = Array.isArray(body.categories) && body.categories.length
    ? body.categories.filter((category) => ["Male", "Female"].includes(category))
    : ["Male", "Female"];

  return applyRecommendedPlayerCounts({
    ...body,
    sportName,
    name: sportName,
    categories: categories.length ? categories : ["Male", "Female"],
    type: body.type === "indoor" ? "indoor" : "outdoor",
    status: body.status === "inactive" ? "inactive" : "active",
  });
}

export async function createSport(req, res) {
  const payload = normalizeSportPayload(req.body);
  if (!payload.sportName) {
    return res.status(400).json({ message: "Sport name is required" });
  }
  if (payload.maxPlayers < payload.minPlayers) {
    return res.status(400).json({ message: "Maximum players cannot be less than minimum players" });
  }

  const exists = await Sport.findOne({
    $or: [
      { sportName: new RegExp(`^${payload.sportName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      { name: new RegExp(`^${payload.sportName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    ],
  });
  if (exists) return res.status(409).json({ message: "Sport already exists" });

  const sport = await Sport.create({ ...payload, createdBy: req.user?.id });
  return res.status(201).json(sport);
}

export async function updateSport(req, res) {
  const payload = normalizeSportPayload(req.body);
  if (!payload.sportName) {
    return res.status(400).json({ message: "Sport name is required" });
  }
  if (payload.maxPlayers < payload.minPlayers) {
    return res.status(400).json({ message: "Maximum players cannot be less than minimum players" });
  }

  const sport = await Sport.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!sport) return res.status(404).json({ message: "Sport not found" });
  return res.json(sport);
}

export async function reviewTeamRegistration(req, res) {
  const { status, rejectionReason = "" } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Registration status must be approved or rejected" });
  }

  if (status === "rejected" && !String(rejectionReason).trim()) {
    return res.status(400).json({ message: "Rejection reason is required" });
  }

  const team = await Team.findByIdAndUpdate(
    req.params.id,
    {
      status,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      rejectionReason: status === "rejected" ? String(rejectionReason).trim() : "",
    },
    { new: true }
  );

  if (!team) return res.status(404).json({ message: "Registration not found" });
  return res.json(team);
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

export async function listTournaments(_req, res) {
  const tournaments = await Tournament.find().sort({ createdAt: -1 }).lean();
  return res.json(tournaments);
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

function getRoleModel(role) {
  const map = {
    admin: Admin,
    supercoordinator: SuperCoordinator,
    coordinator: Coordinator,
    volunteer: Volunteer,
  };
  const model = map[role];
  if (!model) throw Object.assign(new Error("Invalid role"), { status: 400 });
  return model;
}

export async function updateRoleAccount(req, res) {
  const { id } = req.params;
  const { role, name, email, password, assignedSport, assignedSportId, assignedSportName, status, phone } = req.body;

  if (!role) return res.status(400).json({ message: "Role is required" });

  let model;
  try { model = getRoleModel(role); } catch (e) { return res.status(e.status).json({ message: e.message }); }

  const account = await model.findById(id);
  if (!account) return res.status(404).json({ message: "Account not found" });

  if (name !== undefined) account.name = String(name).trim();
  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail !== account.email) {
      for (const [, m] of Object.entries({ admin: Admin, supercoordinator: SuperCoordinator, coordinator: Coordinator, volunteer: Volunteer })) {
        const dup = await m.findOne({ email: normalizedEmail, _id: { $ne: account._id } }).lean();
        if (dup) return res.status(409).json({ message: "An account with this email already exists" });
      }
      account.email = normalizedEmail;
    }
  }
  if (password) account.password = await bcrypt.hash(password, 12);
  if (assignedSport !== undefined) account.assignedSport = String(assignedSport).trim().toLowerCase().replace(/\s+/g, "-");
  if (assignedSportId !== undefined) account.assignedSportId = assignedSportId;
  if (assignedSportName !== undefined) account.assignedSportName = String(assignedSportName).trim();
  if (status !== undefined) account.status = status;
  if (phone !== undefined) account.phone = String(phone).trim();

  await account.save();

  return res.json({
    id: account._id.toString(),
    fullName: account.name,
    email: account.email,
    role,
    assignedSport: account.assignedSport || "",
    assignedSportId: account.assignedSportId?.toString() || "",
    assignedSportName: account.assignedSportName || "",
    status: account.status,
    phone: account.phone || "",
    createdAt: account.createdAt,
  });
}

export async function deleteRoleAccount(req, res) {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) return res.status(400).json({ message: "Role is required" });

  let model;
  try { model = getRoleModel(role); } catch (e) { return res.status(e.status).json({ message: e.message }); }

  const account = await model.findByIdAndDelete(id);
  if (!account) return res.status(404).json({ message: "Account not found" });

  return res.json({ message: "Account deleted successfully" });
}

export const adminHandlers = {
  listSports,
  createSport,
  updateSport,
  deleteSport: deleteDoc(Sport),
  createDepartment: createDoc(Department),
  updateDepartment: updateDoc(Department),
  deleteDepartment: deleteDoc(Department),
  createFixture: createDoc(Fixture),
  updateFixture: updateDoc(Fixture),
  deleteFixture: deleteDoc(Fixture),
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  createRule: createDoc(Rule),
  createResult: createDoc(Result),
  createTournament: createDoc(Tournament),
  updateTournament: updateDoc(Tournament),
  toggleTournamentRegistration,
  deleteTournament: deleteDoc(Tournament),
  createAdmin: (req, res) => createRoleAccount(Admin, "admin", req, res),
  createSuperCoordinator: (req, res) => createRoleAccount(SuperCoordinator, "supercoordinator", req, res),
  createVolunteer: (req, res) => createRoleAccount(Volunteer, "volunteer", req, res),
  createCoordinator: (req, res) => createRoleAccount(Coordinator, "coordinator", req, res),
  listVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  listPendingRegistrations,
};
