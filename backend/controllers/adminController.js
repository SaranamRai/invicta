import Admin from "../models/Admin.js";
import SuperCoordinator from "../models/SuperCoordinator.js";
import Volunteer from "../models/Volunteer.js";
import Coordinator from "../models/Coordinator.js";
import Sport from "../models/Sport.js";
import Department from "../models/Department.js";
import Fixture from "../models/Fixture.js";
import Announcement from "../models/Announcement.js";
import Rule from "../models/Rule.js";
import Result from "../models/Result.js";
import Issue from "../models/Issue.js";
import Tournament from "../models/Tournament.js";
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
  updateTournament: updateDoc(Tournament),
  toggleTournamentRegistration,
  deleteTournament: deleteDoc(Tournament),
  createAdmin: (req, res) => createRoleAccount(Admin, "admin", req, res),
  createSuperCoordinator: (req, res) => createRoleAccount(SuperCoordinator, "supercoordinator", req, res),
  createVolunteer: (req, res) => createRoleAccount(Volunteer, "volunteer", req, res),
  createCoordinator: (req, res) => createRoleAccount(Coordinator, "coordinator", req, res),
};
