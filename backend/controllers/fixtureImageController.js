import crypto from "node:crypto";
import mongoose from "mongoose";
import Team from "../models/Team.js";
import Sport from "../models/Sport.js";
import Tournament from "../models/Tournament.js";
import { parseMultipartForm } from "../utils/multipartHelper.js";
import { analyzeFixtureImage } from "../services/ai/fixtureImageService.js";
import { createFixture } from "./adminDataController.js";

const pending = new Map();
const TTL_MS = 10 * 60 * 1000;

function clean(value) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, 160); }
function normalize(value) { return clean(value).toLowerCase(); }
function prune() {
  const now = Date.now();
  for (const [token, value] of pending) if (value.expiresAt < now) pending.delete(token);
}

async function validateCandidate(candidate) {
  const errors = [];
  const category = ["Male", "Female", "Mixed"].includes(candidate.category) ? candidate.category : "";
  if (!category) errors.push("Category must be Male, Female, or Mixed.");
  const [teams, sport, tournament] = await Promise.all([
    Team.find({
      status: { $in: ["ready", "registered", "approved"] },
      teamName: { $in: [candidate.teamAName, candidate.teamBName].filter(Boolean).map((name) => new RegExp(`^${clean(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")) },
    }).lean(),
    candidate.sportId && mongoose.Types.ObjectId.isValid(candidate.sportId)
      ? Sport.findById(candidate.sportId).lean()
      : Sport.findOne({ $or: [{ sportName: new RegExp(`^${clean(candidate.sportName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }, { name: new RegExp(`^${clean(candidate.sportName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }] }).lean(),
    candidate.tournamentId && mongoose.Types.ObjectId.isValid(candidate.tournamentId) ? Tournament.findById(candidate.tournamentId).lean() : null,
  ]);
  const teamA = teams.find((team) => normalize(team.teamName) === normalize(candidate.teamAName));
  const teamB = teams.find((team) => normalize(team.teamName) === normalize(candidate.teamBName));
  if (!teamA) errors.push("Team A must match an approved team.");
  if (!teamB) errors.push("Team B must match an approved team.");
  if (teamA && teamB && teamA._id.equals(teamB._id)) errors.push("Team A and Team B must be different.");
  if (!sport || sport.status !== "active") errors.push("Sport must match an active configured sport.");
  if (candidate.tournamentId && !mongoose.Types.ObjectId.isValid(candidate.tournamentId)) errors.push("Tournament is invalid.");
  if (candidate.tournamentId && !tournament) errors.push("Tournament was not found.");
  if (teamA && category && teamA.category !== category) errors.push("Team A does not belong to the selected category.");
  if (teamB && category && teamB.category !== category) errors.push("Team B does not belong to the selected category.");
  if (teamA && sport && teamA.sportId && !teamA.sportId.equals(sport._id)) errors.push("Team A belongs to another sport.");
  if (teamB && sport && teamB.sportId && !teamB.sportId.equals(sport._id)) errors.push("Team B belongs to another sport.");
  if (teamA && candidate.tournamentId && teamA.tournamentId && !teamA.tournamentId.equals(candidate.tournamentId)) errors.push("Team A belongs to another tournament.");
  if (teamB && candidate.tournamentId && teamB.tournamentId && !teamB.tournamentId.equals(candidate.tournamentId)) errors.push("Team B belongs to another tournament.");
  if (!candidate.date || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.date)) errors.push("Date must use YYYY-MM-DD format.");
  if (!candidate.time || !/^\d{2}:\d{2}$/.test(candidate.time)) errors.push("Time must use HH:MM format.");
  return { errors, teamA, teamB, sport, tournament };
}

export async function analyzeFixtureImageUpload(req, res, next) {
  try {
    prune();
    const { files, fields } = await parseMultipartForm(req);
    const result = await analyzeFixtureImage(files.image || files.fixtureImage);
    const candidate = { ...result, ...fields };
    const validation = await validateCandidate(candidate);
    const token = crypto.randomBytes(24).toString("hex");
    pending.set(token, { userId: String(req.user.id), candidate, expiresAt: Date.now() + TTL_MS });
    return res.json({ reviewToken: token, expiresInSeconds: TTL_MS / 1000, candidate, validation: { errors: validation.errors } });
  } catch (error) { return next(error); }
}

export async function validateFixtureImageCandidate(req, res, next) {
  try {
    const record = pending.get(req.body?.reviewToken);
    if (!record || record.expiresAt < Date.now() || record.userId !== String(req.user.id)) return res.status(400).json({ message: "This image review has expired. Upload it again." });
    const candidate = { ...record.candidate, ...req.body, teamAName: clean(req.body.teamAName || record.candidate.teamAName), teamBName: clean(req.body.teamBName || record.candidate.teamBName) };
    const validation = await validateCandidate(candidate);
    record.candidate = candidate;
    return res.json({ candidate, valid: validation.errors.length === 0, errors: validation.errors });
  } catch (error) { return next(error); }
}

export async function confirmFixtureImage(req, res, next) {
  try {
    const record = pending.get(req.body?.reviewToken);
    if (!record || record.expiresAt < Date.now() || record.userId !== String(req.user.id)) return res.status(400).json({ message: "This image review has expired. Upload it again." });
    const candidate = { ...record.candidate, ...req.body };
    const validation = await validateCandidate(candidate);
    if (validation.errors.length) return res.status(400).json({ message: "Review contains invalid fixture data.", errors: validation.errors });
    const payload = {
      ...candidate,
      teamA: validation.teamA._id.toString(),
      teamB: validation.teamB._id.toString(),
      sportId: validation.sport._id.toString(),
      tournamentId: candidate.tournamentId || undefined,
    };
    const captured = { statusCode: 201, body: null, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await createFixture({ ...req, body: payload }, captured);
    if (captured.statusCode >= 400) return res.status(captured.statusCode).json(captured.body);
    pending.delete(req.body.reviewToken);
    return res.status(201).json(captured.body);
  } catch (error) { return next(error); }
}
