import Team from "../models/Team.js";
import Player from "../models/Player.js";
import Fixture from "../models/Fixture.js";
import Issue from "../models/Issue.js";

export async function myDepartment(req, res) {
  return res.json({
    department: req.user.department || "",
    assignedSport: req.user.assignedSport || "",
  });
}

export async function createTeam(req, res) {
  const team = await Team.create({ ...req.body, createdBy: req.user.id, status: "pending" });
  return res.status(201).json(team);
}

export async function updateTeam(req, res) {
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

export async function coordinatorFixtures(_req, res) {
  const fixtures = await Fixture.find().sort({ date: 1, time: 1 }).lean();
  return res.json(fixtures);
}

export async function createCoordinatorIssue(req, res) {
  const issue = await Issue.create({ ...req.body, reportedBy: req.user.id, reportedByRole: req.user.role });
  return res.status(201).json(issue);
}
