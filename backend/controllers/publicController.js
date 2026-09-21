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
import TeamRegistration from "../models/TeamRegistration.js";
import Player from "../models/Player.js";
import mongoose from "mongoose";
import { withPlayerCountFallback } from "../utils/sportPlayerCounts.js";
import { normalizeRegNo as normalizeVerifiedRegNo, isValidEmail as isValidEmailValue } from "../utils/regNoHelper.js";
import { buildVerifiedStatus, verifyRegistrationToken } from "../utils/idVerification.js";

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
    const filter = addQueryFilters(resource, req, resource === "announcements"
      ? { visibleToPublic: true }
      : resource === "rules"
      ? { $or: [{ status: "approved" }, { status: { $exists: false } }] }
      : resource === "teams"
      ? { status: "approved" }
      : {});

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
      // Deduplicate by normalized sport name to prevent duplicate cards
      const seen = new Set();
      data = data.filter((s) => {
        const key = String(s.sportName || s.name || "").trim().toLowerCase().replace(/\s+/g, "-");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
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
  return normalizeVerifiedRegNo(value);
}

function isValidEmail(value) {
  return isValidEmailValue(value);
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
    verificationToken: normalizeText(member?.verificationToken),
  };
}

function getVerifiedStatusOrError({ token, registrationNumber, playerRole, playerIndex }) {
  const payload = verifyRegistrationToken(token, { registrationNumber, playerRole, playerIndex });
  if (!payload) return { error: "ID verification is required for every player." };
  return { value: buildVerifiedStatus(payload) };
}

function buildAllPlayers({ captainName, captainEmail, captainRegNo, captainIdVerification, members }) {
  return [
    {
      name: captainName,
      email: captainEmail,
      registrationNumber: captainRegNo,
      role: "captain",
      idVerified: Boolean(captainIdVerification?.verified),
      idVerificationStatus: captainIdVerification?.status || "pending",
    },
    ...(members || []).map((member) => ({
      name: member.fullName,
      email: member.email || "",
      registrationNumber: member.registrationNo,
      role: "member",
      idVerified: Boolean(member.idVerification?.verified),
      idVerificationStatus: member.idVerification?.status || "pending",
    })),
  ];
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

async function assertRegistrationNumbersUnused(registrationNumbers) {
  for (const registrationNumber of registrationNumbers) {
    const [team, registration, player] = await Promise.all([
      Team.findOne({
        $or: [
          { captainRegNo: registrationNumber },
          { "members.registrationNo": registrationNumber },
          { "members.registrationNumber": registrationNumber },
          { "members.regNo": registrationNumber },
        ],
      }).select("_id").lean(),
      TeamRegistration.findOne({
        $or: [
          { captainRegNo: registrationNumber },
          { "members.registrationNo": registrationNumber },
          { "members.registrationNumber": registrationNumber },
          { "members.regNo": registrationNumber },
        ],
      }).select("_id").lean(),
      Player.findOne({ registrationNo: registrationNumber }).select("_id").lean(),
    ]);

    if (team || registration || player) {
      const error = new Error(`Cannot register. Registration number ${registrationNumber} is already registered.`);
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
    const tournamentId = req.body.tournamentId;
    const tournamentName = normalizeText(req.body.tournamentName);
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

    const captainVerification = getVerifiedStatusOrError({
      token: req.body.captainVerificationToken,
      registrationNumber: captainRegNo,
      playerRole: "captain",
      playerIndex: 0,
    });
    if (captainVerification.error) {
      return res.status(400).json({ message: captainVerification.error });
    }

    const members = Array.isArray(req.body.members)
      ? req.body.members.map(normalizeMember).filter((member) => member.fullName || member.registrationNumber)
      : [];

    const sportWithFallback = withPlayerCountFallback(sportDoc.toObject ? sportDoc.toObject() : sportDoc);
    const minPlayers = Number(sportWithFallback.minPlayers || 1);
    const maxPlayers = Number(sportWithFallback.maxPlayers || minPlayers);
    const minMembers = Math.max(0, minPlayers - 1);
    const maxMembers = Math.max(minMembers, maxPlayers - 1);
    if (members.length < minMembers || members.length > maxMembers) {
      return res.status(400).json({ message: `${sportName} requires ${minPlayers} to ${maxPlayers} total players including the captain.` });
    }

    if (members.some((member) => !member.fullName || !member.registrationNumber)) {
      return res.status(400).json({ message: "Each team member must include full name and registration number." });
    }
    if (members.some((member) => !member.email || !isValidEmail(member.email))) {
      return res.status(400).json({ message: "Each team member must include a valid email." });
    }

    const memberRegNos = members.map((member) => member.registrationNumber).filter(Boolean);
    const memberRegNoSet = new Set(memberRegNos);
    if (memberRegNoSet.size !== memberRegNos.length) {
      return res.status(400).json({ message: "Same registration number should not be added twice in the same team." });
    }
    if (memberRegNos.includes(captainRegNo) || members.some((member) => member.email === email || member.fullName.toLowerCase() === captainName.toLowerCase())) {
      return res.status(400).json({ message: "The captain is already included in the team. Please add only other members." });
    }
    const memberEmails = members.map((member) => member.email).filter(Boolean);
    if (new Set([email, ...memberEmails]).size !== [email, ...memberEmails].length) {
      return res.status(400).json({ message: "This email is already used by another player." });
    }

    const registrationNumbers = Array.from(new Set([captainRegNo, ...memberRegNos]));

    const storedMembers = members.map((member, index) => {
      const memberVerification = getVerifiedStatusOrError({
        token: member.verificationToken,
        registrationNumber: member.registrationNumber,
        playerRole: "member",
        playerIndex: index,
      });
      if (memberVerification.error) {
        const error = new Error(memberVerification.error);
        error.status = 400;
        throw error;
      }
      return {
        fullName: member.fullName,
        registrationNo: member.registrationNumber,
        department: member.department || department,
        semester: member.semester || "",
        gender: member.gender || category,
        email: member.email || "",
        phone: member.phone || "",
        idVerification: memberVerification.value,
      };
    });

    const captainIdVerification = captainVerification.value;
    const allPlayers = buildAllPlayers({
      captainName,
      captainEmail: email,
      captainRegNo,
      captainIdVerification,
      members: storedMembers,
    });

    if (allPlayers.some((player) => player.idVerificationStatus === "mismatch")) {
      return res.status(400).json({ message: "Typed registration number does not match the ID card." });
    }

    await assertRegistrationNumbersUnused(registrationNumbers);

    const duplicateTeam = await Team.findOne({
      department,
      sportId: sportDoc._id,
      ...(tournamentId ? { tournamentId } : {}),
      category,
      status: { $in: ["pending", "approved"] },
    });

    const duplicateRegistration = await TeamRegistration.findOne({
      department,
      sportId: sportDoc._id,
      ...(tournamentId ? { tournamentId } : {}),
      category,
      status: { $in: ["pending", "approved"] },
    });

    if (duplicateTeam || duplicateRegistration) {
      return res.status(400).json({
        message: "This department already submitted a team for this sport and category."
      });
    }

    const registration = await TeamRegistration.create({
      teamName,
      department,
      sportName,
      sportId: sportDoc._id,
      tournamentId: tournamentId || undefined,
      tournamentName,
      category,
      captainName,
      captainRegNo,
      captainEmail: email,
      captainPhone: phone,
      captainIdVerification,
      members: storedMembers,
      allPlayers,
      status: "pending",
      submittedAt: new Date(),
    });

    // map team response (matching the API client structure)
    return res.status(201).json({
      id: registration._id.toString(),
      name: registration.teamName,
      department: registration.department,
      sport,
      sportId: registration.sportId,
      sportName: registration.sportName,
      tournamentId: registration.tournamentId,
      tournamentName: registration.tournamentName,
      category: registration.category,
      members: registration.members || [],
      coachCaptain: registration.captainName || "",
      captainRegNo: registration.captainRegNo || "",
      contactNumber: registration.captainPhone || "",
      email: registration.captainEmail || "",
      status: registration.status,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      registeredAt: registration.submittedAt ? new Date(registration.submittedAt).getTime() : Date.now(),
    });
  } catch (error) {
    console.error("Public team registration failed:", error);
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Internal server error" });
  }
}

function extractMemberName(member) {
  if (typeof member === "string") return member;
  return member?.fullName || member?.name || "";
}

function extractMemberRegNo(member) {
  if (typeof member === "string") return "";
  return member?.registrationNumber || member?.regNo || member?.registrationNo || "";
}

export async function getSportDetailView(req, res) {
  try {
    const { sportId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sportId)) {
      return res.status(400).json({ message: "Invalid sport ID" });
    }

    const sport = await Sport.findById(sportId).lean();
    if (!sport || sport.status !== "active") {
      return res.status(404).json({ message: "Sport not found" });
    }

    // Collect approved teams from both models
    const teamModelTeams = await Team.find({ sportId, status: "approved" }).lean();
    const registrationTeams = await TeamRegistration.find({ sportId, status: "approved" }).lean();

    // Deduplicate by teamName+department+category, prefer TeamRegistration
    const seen = new Set();
    const allTeams = [];

    for (const t of registrationTeams) {
      const key = `${t.teamName}|${t.department}|${t.category}`;
      seen.add(key);
      allTeams.push(t);
    }

    for (const t of teamModelTeams) {
      const key = `${t.teamName || ""}|${t.department || ""}|${t.category || "Male"}`;
      if (!seen.has(key)) {
        seen.add(key);
        allTeams.push(t);
      }
    }

    const maleTeams = allTeams.filter((t) => (t.category || "Male") === "Male");
    const femaleTeams = allTeams.filter((t) => (t.category || "Male") === "Female");

    function buildMemberList(teams, category) {
      return teams.flatMap((team) =>
        (team.members || []).map((m) => ({
          fullName: extractMemberName(m),
          registrationNo: extractMemberRegNo(m),
          department: team.department || "",
          teamName: team.teamName || "",
          tournamentId: team.tournamentId?.toString?.() || "",
          tournamentName: team.tournamentName || "",
          category,
          role: typeof m === "object" ? m?.role || m?.position || "" : "",
          position: typeof m === "object" ? m?.position || m?.role || "" : "",
          profilePhoto: typeof m === "object" ? m?.profilePhoto || m?.photo || m?.image || "" : "",
        }))
      );
    }

    const maleMembers = buildMemberList(maleTeams, "Male");
    const femaleMembers = buildMemberList(femaleTeams, "Female");

    const fixtures = await Fixture.find({ sportId }).lean();
    const maleFixtures = fixtures.filter((f) => (f.category || "Male") === "Male");
    const femaleFixtures = fixtures.filter((f) => (f.category || "Male") === "Female");

    function mapTeam(t) {
      return {
        _id: t._id,
        teamName: t.teamName || "",
        tournamentId: t.tournamentId?.toString?.() || "",
        tournamentName: t.tournamentName || "",
        department: t.department || "",
        category: t.category || "Male",
        captainName: t.captainName || "",
        membersCount: (t.members || []).length,
        members: buildMemberList([t], t.category || "Male"),
        status: t.status || "approved",
      };
    }

    return res.json({
      sport: {
        _id: sport._id,
        sportName: sport.sportName || sport.name,
        name: sport.name,
        type: sport.type,
        categories: sport.categories,
        minPlayers: sport.minPlayers,
        maxPlayers: sport.maxPlayers,
      },
      stats: {
        totalTeams: allTeams.length,
        totalMembers: maleMembers.length + femaleMembers.length,
        maleTeams: maleTeams.length,
        femaleTeams: femaleTeams.length,
        maleMembers: maleMembers.length,
        femaleMembers: femaleMembers.length,
      },
      teams: {
        male: maleTeams.map(mapTeam),
        female: femaleTeams.map(mapTeam),
      },
      members: {
        male: maleMembers,
        female: femaleMembers,
      },
      fixtures: {
        male: maleFixtures,
        female: femaleFixtures,
      },
    });
  } catch (error) {
    console.error("Error fetching sport detail:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
