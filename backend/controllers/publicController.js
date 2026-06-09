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
import mongoose from "mongoose";
import { withPlayerCountFallback } from "../utils/sportPlayerCounts.js";

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

export function listPublic(resource) {
  return async (_req, res) => {
    const model = publicModels[resource];
    const filter = resource === "announcements"
      ? { visibleToPublic: true }
      : resource === "teams"
      ? { status: "approved" }
      : {};

    let query = model.find(filter);
    
    if (resource === "fixtures") {
      query = query.sort({ date: 1, time: 1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    if (resource === "sports") {
      query = model.find({ status: "active" }).sort({ sportName: 1, name: 1 });
    }

    if (resource === "fixtures") {
      query = query.populate("sportId", "sportName name type").populate("teamA", "teamName department category").populate("teamB", "teamName department category");
    }

    if (resource === "live-feeds") {
      query = query.populate("fixtureId", "matchTitle");
    }

    if (resource === "teams") {
      query = query.populate("sportId", "sportName name");
    }

    let data = await query.lean();
    if (resource === "sports") {
      data = data.map(withPlayerCountFallback);
    }
    return res.json(data);
  };
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSport(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeRegNo(value) {
  return normalizeText(value).toUpperCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function normalizeMember(member) {
  if (typeof member === "string") {
    return {
      fullName: normalizeText(member),
      registrationNumber: "",
      department: "",
      semester: "",
      gender: "",
      email: "",
      phone: "",
    };
  }

  return {
    fullName: normalizeText(member?.fullName || member?.name),
    registrationNumber: normalizeRegNo(member?.registrationNumber || member?.regNo),
    department: normalizeText(member?.department),
    semester: normalizeText(member?.semester),
    gender: normalizeText(member?.gender),
    email: normalizeText(member?.email).toLowerCase(),
    phone: normalizeText(member?.phone),
  };
}

async function resolveSport(req) {
  const sportId = req.body.sportId;
  const sportText = normalizeText(req.body.sportName || req.body.sport);

  if (sportId) {
    if (!mongoose.Types.ObjectId.isValid(sportId)) {
      const error = new Error("Sport is invalid");
      error.status = 400;
      throw error;
    }

    const sport = await Sport.findById(sportId);
    if (!sport || sport.status !== "active") {
      const error = new Error("Sport is not available for registration");
      error.status = 400;
      throw error;
    }
    return sport;
  }

  if (!sportText) {
    const error = new Error("Sport is required");
    error.status = 400;
    throw error;
  }

  const escaped = sportText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sport = await Sport.findOne({
    status: "active",
    $or: [
      { sportName: new RegExp(`^${escaped}$`, "i") },
      { name: new RegExp(`^${escaped}$`, "i") },
    ],
  });

  if (!sport) {
    const error = new Error("Sport is not available for registration");
    error.status = 400;
    throw error;
  }

  return sport;
}

async function assertRegistrationNumberLimit(registrationNumbers, sportId) {
  for (const registrationNumber of registrationNumbers) {
    const teams = await Team.find({
      status: { $in: ["pending", "approved"] },
      $or: [
        { captainRegNo: registrationNumber },
        { "members.registrationNumber": registrationNumber },
        { "members.regNo": registrationNumber },
      ],
    }).select("sportId").lean();

    const sports = new Set(
      teams
        .map((team) => team.sportId?.toString?.())
        .filter(Boolean)
    );
    sports.add(sportId.toString());

    if (sports.size > 2) {
      const error = new Error("This student is already registered in maximum 2 sports.");
      error.status = 400;
      throw error;
    }
  }
}

export async function registerPublicTeam(req, res) {
  try {
    const department = normalizeText(req.body.department).toUpperCase();
    const teamName = normalizeText(req.body.teamName || req.body.name || department);
    const sportDoc = await resolveSport(req);
    const sportName = sportDoc.sportName || sportDoc.name;
    const sport = normalizeSport(sportName);
    const category = normalizeText(req.body.category || "Male");
    const captainName = normalizeText(req.body.captainName);
    const captainRegNo = normalizeRegNo(req.body.captainRegNo || req.body.captainRegistrationNumber);
    const email = normalizeText(req.body.captainEmail || req.body.email).toLowerCase();
    const phone = normalizeText(req.body.captainPhone || req.body.phone || req.body.contactNumber).replace(/\D/g, "");

    if (!department || !teamName || !captainName || !captainRegNo || !email || !phone) {
      return res.status(400).json({ message: "Department, team, captain registration number, captain email, and phone are required" });
    }

    if (!["Male", "Female"].includes(category)) {
      return res.status(400).json({ message: "Category must be either Male or Female" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Captain email is invalid" });
    }

    if (phone.length !== 10) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const members = Array.isArray(req.body.members)
      ? req.body.members.map(normalizeMember).filter((member) => member.fullName || member.registrationNumber)
      : [];

    const sportWithFallback = withPlayerCountFallback(sportDoc.toObject ? sportDoc.toObject() : sportDoc);
    const minPlayers = Number(sportWithFallback.minPlayers || 1);
    const maxPlayers = Number(sportWithFallback.maxPlayers || minPlayers);
    if (members.length < minPlayers || members.length > maxPlayers) {
      return res.status(400).json({ message: `${sportName} requires ${minPlayers} to ${maxPlayers} players.` });
    }

    if (members.some((member) => !member.fullName || !member.registrationNumber)) {
      return res.status(400).json({ message: "Each team member must include full name and registration number." });
    }

    const memberRegNos = members.map((member) => member.registrationNumber).filter(Boolean);
    const registrationNumbers = Array.from(new Set([captainRegNo, ...memberRegNos]));
    if (registrationNumbers.length !== [captainRegNo, ...memberRegNos].length) {
      return res.status(400).json({ message: "Same registration number should not be added twice in the same team." });
    }

    if (!memberRegNos.includes(captainRegNo)) {
      members.unshift({
        fullName: captainName,
        registrationNumber: captainRegNo,
        department,
        semester: normalizeText(req.body.captainSemester),
        gender: category === "Male" ? "Male" : "Female",
        email,
        phone,
        isCaptain: true,
      });
    } else {
      members.forEach((member) => {
        if (member.registrationNumber === captainRegNo) member.isCaptain = true;
      });
    }

    await assertRegistrationNumberLimit(registrationNumbers, sportDoc._id);

    const duplicateTeam = await Team.findOne({
      department,
      sportId: sportDoc._id,
      category,
      status: { $in: ["pending", "approved"] },
    });

    if (duplicateTeam) {
      return res.status(400).json({
        message: "This department already submitted a team for this sport and category."
      });
    }

    const team = await Team.create({
      teamName,
      department,
      sport,
      sportName,
      sportId: sportDoc._id,
      category,
      captainName,
      captainRegNo,
      captainEmail: email,
      captainPhone: phone,
      contactNumber: phone,
      email,
      members,
      status: "pending",
      submittedAt: new Date(),
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
      sportId: team.sportId,
      sportName: team.sportName,
      category: team.category,
      members: team.members || [],
      coachCaptain: team.captainName || "",
      captainRegNo: team.captainRegNo || "",
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
