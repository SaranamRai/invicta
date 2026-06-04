import Admin from "../models/Admin.js";
import Volunteer from "../models/Volunteer.js";
import Coordinator from "../models/Coordinator.js";
import Sport from "../models/Sport.js";
import Department from "../models/Department.js";
import Fixture from "../models/Fixture.js";
import Announcement from "../models/Announcement.js";
import Rule from "../models/Rule.js";
import Result from "../models/Result.js";
import Issue from "../models/Issue.js";
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
  createAnnouncement: createDoc(Announcement),
  createRule: createDoc(Rule),
  createResult: createDoc(Result),
  createAdmin: (req, res) => createRoleAccount(Admin, "admin", req, res),
  createVolunteer: (req, res) => createRoleAccount(Volunteer, "volunteer", req, res),
  createCoordinator: (req, res) => createRoleAccount(Coordinator, "coordinator", req, res),
};
