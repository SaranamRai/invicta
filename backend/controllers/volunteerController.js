import Fixture from "../models/Fixture.js";
import Team from "../models/Team.js";
import TeamRegistration from "../models/TeamRegistration.js";
import LiveScore from "../models/LiveScore.js";
import LiveFeed from "../models/LiveFeed.js";
import Gallery from "../models/Gallery.js";
import Issue from "../models/Issue.js";
import Result from "../models/Result.js";
import Volunteer from "../models/Volunteer.js";
import AuditLog from "../models/AuditLog.js";

function normalizeSport(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function sportAccessDenied() {
  const error = new Error("Access denied: you are not assigned to this sport.");
  error.status = 403;
  return error;
}

function toFixtureStatus(status) {
  if (status === "completed" || status === "Finished") return "completed";
  if (status === "paused" || status === "Paused") return "paused";
  if (status === "live" || status === "Live") return "live";
  return "upcoming";
}

function pickDefinedFields(source, fields) {
  return fields.reduce((payload, field) => {
    if (source[field] !== undefined) payload[field] = source[field];
    return payload;
  }, {});
}

async function requireVolunteerFixture(req, fixtureId) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const assignedSportId = req.user.assignedSportId?.toString?.() || "";

  const fixture = await Fixture.findById(fixtureId).lean();
  if (!fixture) {
    const error = new Error("Fixture not found");
    error.status = 404;
    throw error;
  }

  if (
    (assignedSportId && fixture.sportId?.toString?.() !== assignedSportId) ||
    (!assignedSportId && assignedSport && normalizeSport(fixture.sport) !== assignedSport)
  ) {
    throw sportAccessDenied();
  }

  const volunteer = await Volunteer.findById(req.user.id).select("assignedFixture assignedMatches status").lean();
  if (!volunteer || volunteer.status === "inactive") {
    const error = new Error("Active volunteer account required");
    error.status = 403;
    throw error;
  }
  const assignedMatches = [volunteer.assignedFixture, ...(volunteer.assignedMatches || [])].filter(Boolean).map(String);
  const fixtureVolunteerId = fixture.assignedVolunteer?.toString?.() || "";
  const isAssignedToThisVolunteer = fixtureVolunteerId
    ? fixtureVolunteerId === String(volunteer._id)
    : assignedMatches.includes(fixture._id.toString());

  if (!isAssignedToThisVolunteer) {
    const error = new Error("This match is not assigned to this volunteer");
    error.status = 403;
    throw error;
  }

  return fixture;
}

export async function assignedMatches(req, res) {
  const volunteer = await Volunteer.findById(req.user.id).select("assignedFixture assignedMatches status assignedSport assignedSportId").lean();
  if (!volunteer || volunteer.status === "inactive") return res.status(403).json({ message: "Active volunteer account required" });
  const ids = [volunteer.assignedFixture, ...(volunteer.assignedMatches || [])].filter(Boolean);
  const assignedSport = normalizeSport(volunteer.assignedSport);
  const sportQuery = volunteer.assignedSportId && assignedSport
    ? { $or: [{ sportId: volunteer.assignedSportId }, { sport: assignedSport }] }
    : volunteer.assignedSportId
      ? { sportId: volunteer.assignedSportId }
      : assignedSport
        ? { sport: assignedSport }
        : {};
  const assignmentQuery = ids.length
    ? { $or: [
        { assignedVolunteer: volunteer._id },
        { _id: { $in: ids }, $or: [{ assignedVolunteer: { $exists: false } }, { assignedVolunteer: null }] },
      ] }
    : { assignedVolunteer: volunteer._id };
  const query = Object.keys(sportQuery).length
    ? { $and: [sportQuery, assignmentQuery], status: { $ne: "cancelled" } }
    : { ...assignmentQuery, status: { $ne: "cancelled" } };
  const fixtures = await Fixture.find(query).sort({ date: 1, time: 1 }).lean();
  return res.json(fixtures);
}

function mapVolunteerTeam(team) {
  return {
    id: team._id ? team._id.toString() : team.id || "",
    name: team.teamName || team.name || "",
    department: team.department || "",
    sport: team.sport || "",
    sportName: team.sportName || "",
    sportId: team.sportId ? team.sportId.toString() : "",
    tournamentId: team.tournamentId ? team.tournamentId.toString() : "",
    tournamentName: team.tournamentName || "",
    category: team.category || "Male",
    members: (team.members || []).map((m) => {
      if (typeof m === "string") return m;
      if (m && typeof m === "object") {
        return {
          fullName: m.fullName || m.name || m.registrationNo || m.registrationNumber || "",
          registrationNo: m.registrationNo || m.registrationNumber || m.regNo || "",
          registrationNumber: m.registrationNumber || m.registrationNo || m.regNo || "",
          department: m.department || team.department || "",
          profilePhoto: m.profilePhoto || m.idCardImage || m.photo || m.image || "",
        };
      }
      return "";
    }),
    coachCaptain: team.captainName || team.coachCaptain || "",
    captainRegNo: team.captainRegNo || "",
    captainEmail: team.captainEmail || "",
    captainPhone: team.captainPhone || "",
    contactNumber: team.captainPhone || team.contactNumber || "",
    logo: team.logo || "",
    status: team.status || "approved",
    registeredAt: team.registeredAt || (team.submittedAt ? new Date(team.submittedAt).getTime() : Date.now()),
    playerRegisteredAt: team.playerRegisteredAt || [],
  };
}

export async function volunteerTeams(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const assignedSportId = req.user.assignedSportId;

  const teamQuery = assignedSportId && assignedSport
    ? { $or: [{ sportId: assignedSportId }, { sport: assignedSport }], status: { $in: ["draft", "approved"] } }
    : assignedSportId
      ? { sportId: assignedSportId, status: { $in: ["draft", "approved"] } }
      : assignedSport
        ? { sport: assignedSport, status: { $in: ["draft", "approved"] } }
        : { status: { $in: ["draft", "approved"] } };

  const regQuery = assignedSportId
    ? { sportId: assignedSportId, status: "approved" }
    : assignedSport
      ? { sportName: { $regex: new RegExp(`^${assignedSport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }, status: "approved" }
      : { status: "approved" };

  const [teamTeams, registrationTeams] = await Promise.all([
    Team.find(teamQuery).sort({ teamName: 1 }).lean(),
    TeamRegistration.find(regQuery).sort({ teamName: 1 }).lean(),
  ]);

  const seen = new Set();
  const allTeams = [];

  for (const t of registrationTeams) {
    const key = `${t.teamName}|${String(t.department || "")}|${t.category || "Male"}`;
    if (!seen.has(key)) {
      seen.add(key);
      allTeams.push(
        mapVolunteerTeam({
          _id: t._id,
          teamName: t.teamName,
          department: t.department,
          sport: assignedSport,
          sportName: t.sportName,
          sportId: t.sportId,
          tournamentId: t.tournamentId,
          tournamentName: t.tournamentName,
          category: t.category,
          captainName: t.captainName,
          captainRegNo: t.captainRegNo,
          captainEmail: t.captainEmail,
          captainPhone: t.captainPhone,
          contactNumber: t.captainPhone,
          members: (t.members || []).map((m) => ({
            fullName: m.fullName || "",
            registrationNumber: m.registrationNo || "",
            registrationNo: m.registrationNo || "",
            department: m.department || "",
            profilePhoto: m.profilePhoto || m.idCardImage || "",
          })),
          status: t.status,
          submittedAt: t.submittedAt,
        })
      );
    }
  }

  for (const t of teamTeams) {
    const key = `${t.teamName || ""}|${t.department || ""}|${t.category || "Male"}`;
    if (!seen.has(key)) {
      seen.add(key);
      allTeams.push(mapVolunteerTeam(t));
    }
  }

  return res.json(allTeams);
}

export async function updateLiveScore(req, res) {
  const fixture = await requireVolunteerFixture(req, req.params.fixtureId);
  const nextStatus = req.body.currentStatus || req.body.status
    ? toFixtureStatus(req.body.currentStatus || req.body.status)
    : fixture.status;

  if (fixture.status === "completed" || fixture.isCompleted) {
    return res.status(409).json({ message: "This match is already completed and cannot be started again." });
  }

  const existingScore = await LiveScore.findOne({ fixtureId: req.params.fixtureId }).lean();
  const scheduledFullMatchSeconds = Math.max(60, Number(fixture.fullMatchSeconds || 90 * 60));
  const requestedExtraTimeSeconds = Number(req.body.extraTimeSeconds);
  const extraTimeSeconds = Number.isFinite(requestedExtraTimeSeconds) && requestedExtraTimeSeconds >= 0
    ? Math.floor(requestedExtraTimeSeconds)
    : Math.max(0, Number(existingScore?.extraTimeSeconds || 0));
  const liveScorePatch = pickDefinedFields(req.body, [
    "teamAName",
    "teamBName",
    "timer",
    "period",
    "startedAt",
    "endedAt",
    "timerStartedAt",
    "timerPausedAt",
    "totalPausedMs",
    "pausePeriods",
    "elapsedSeconds",
    "clockRunning",
    "announcements",
    "scoreEvents",
    "disciplinaryEvents",
    "volleyballSets",
    "winner",
    "winnerName",
  ]);

  if (req.body.teamAScore !== undefined || req.body.scoreA !== undefined) {
    liveScorePatch.teamAScore = Number(req.body.teamAScore ?? req.body.scoreA ?? 0);
  }
  if (req.body.teamBScore !== undefined || req.body.scoreB !== undefined) {
    liveScorePatch.teamBScore = Number(req.body.teamBScore ?? req.body.scoreB ?? 0);
  }

  const score = await LiveScore.findOneAndUpdate(
    { fixtureId: req.params.fixtureId },
    {
      $set: {
        ...liveScorePatch,
        tournamentId: fixture.tournamentId,
        sportId: fixture.sportId,
        sportName: fixture.sportName,
        category: fixture.category,
        currentStatus: nextStatus,
        scheduledFullMatchSeconds,
        extraTimeSeconds,
        fullMatchSeconds: scheduledFullMatchSeconds + extraTimeSeconds,
        updatedBy: req.user.id,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        fixtureId: req.params.fixtureId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const fixturePatch = {
    status: nextStatus,
    scoreA: Number(req.body.teamAScore ?? req.body.scoreA ?? fixture.scoreA ?? 0),
    scoreB: Number(req.body.teamBScore ?? req.body.scoreB ?? fixture.scoreB ?? 0),
    timerStartedAt: req.body.timerStartedAt,
    timerPausedAt: req.body.timerPausedAt,
    totalPausedMs: req.body.totalPausedMs,
    pausePeriods: req.body.pausePeriods,
    endedAt: nextStatus === "completed" ? new Date().toISOString() : fixture.endedAt,
    completedAt: nextStatus === "completed" ? Date.now() : fixture.completedAt,
    isCompleted: nextStatus === "completed",
  };

  Object.keys(fixturePatch).forEach((key) => fixturePatch[key] === undefined && delete fixturePatch[key]);
  await Fixture.findByIdAndUpdate(req.params.fixtureId, fixturePatch);
  await AuditLog.create({
    action: "volunteer-score-updated",
    actorRole: req.user?.role || "volunteer",
    actorEmail: req.user?.email || "",
    targetType: "fixture",
    targetId: fixture._id.toString(),
    message: `${req.user?.email || "Volunteer"} updated ${fixture.teamAName || "Team A"} vs ${fixture.teamBName || "Team B"} in ${fixture.sportName || fixture.sport} (${fixture.category || "Male"}) on ${fixture.date || "date not set"}: ${fixturePatch.scoreA}-${fixturePatch.scoreB}, status ${nextStatus}.`,
  });

  return res.json(score);
}

export async function createLiveFeed(req, res) {
  if (!req.body.fixtureId) return res.status(400).json({ message: "A match is required for a volunteer update" });
  await requireVolunteerFixture(req, req.body.fixtureId);
  const feed = await LiveFeed.create({ ...req.body, addedBy: req.user.id });
  return res.status(201).json(feed);
}

export async function volunteerActivity(req, res) {
  const feeds = await LiveFeed.find({ addedBy: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return res.json(feeds);
}

export async function uploadGallery(req, res) {
  const image = await Gallery.create({ ...req.body, uploadedBy: req.user.id, uploadedByRole: req.user.role });
  return res.status(201).json(image);
}

export async function createIssue(req, res) {
  const issue = await Issue.create({ ...req.body, reportedBy: req.user.id, reportedByRole: req.user.role });
  return res.status(201).json(issue);
}

export async function submitResult(req, res) {
  if (!req.body.fixtureId) return res.status(400).json({ message: "A match is required to submit a result" });
  await requireVolunteerFixture(req, req.body.fixtureId);
  const result = await Result.create({ ...req.body, submittedBy: req.user.id, verifiedByAdmin: false });
  return res.status(201).json(result);
}
