import Fixture from "../models/Fixture.js";
import Team from "../models/Team.js";
import LiveScore from "../models/LiveScore.js";
import LiveFeed from "../models/LiveFeed.js";
import Gallery from "../models/Gallery.js";
import Issue from "../models/Issue.js";
import Result from "../models/Result.js";

function normalizeSport(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function sportAccessDenied() {
  const error = new Error("Access denied: you are not assigned to this sport.");
  error.status = 403;
  return error;
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

  const assignedMatches = Array.isArray(req.user.assignedMatches) ? req.user.assignedMatches.map(String) : [];
  const fixtureVolunteerId = fixture.assignedVolunteer?.toString?.() || "";
  const isAssignedToThisVolunteer = fixtureVolunteerId === req.user.id || assignedMatches.includes(fixture._id.toString());

  if (fixtureVolunteerId && !isAssignedToThisVolunteer) {
    const error = new Error("This match is not assigned to this volunteer");
    error.status = 403;
    throw error;
  }

  return fixture;
}

export async function assignedMatches(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const sportQuery = req.user.assignedSportId && assignedSport
    ? { $or: [{ sportId: req.user.assignedSportId }, { sport: assignedSport }] }
    : req.user.assignedSportId
      ? { sportId: req.user.assignedSportId }
      : assignedSport
        ? { sport: assignedSport }
        : {};
  const assignmentQuery = {
    $or: [
      { assignedVolunteer: req.user.id },
      { assignedVolunteer: { $exists: false } },
      { assignedVolunteer: null },
    ],
  };
  const query = Object.keys(sportQuery).length
    ? { $and: [sportQuery, assignmentQuery] }
    : assignmentQuery;
  const fixtures = await Fixture.find(query).sort({ date: 1, time: 1 }).lean();
  return res.json(fixtures);
}

export async function volunteerTeams(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const sportQuery = req.user.assignedSportId && assignedSport
    ? { $or: [{ sportId: req.user.assignedSportId }, { sport: assignedSport }] }
    : req.user.assignedSportId
      ? { sportId: req.user.assignedSportId }
      : assignedSport
        ? { sport: assignedSport }
        : {};
  const teams = await Team.find(sportQuery).sort({ sport: 1, teamName: 1 }).lean();
  return res.json(teams);
}

export async function updateLiveScore(req, res) {
  const fixture = await requireVolunteerFixture(req, req.params.fixtureId);
  const score = await LiveScore.findOneAndUpdate(
    { fixtureId: req.params.fixtureId },
    {
      ...req.body,
      fixtureId: req.params.fixtureId,
      sportId: fixture.sportId,
      sportName: fixture.sportName,
      category: fixture.category,
      updatedBy: req.user.id,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
  return res.json(score);
}

export async function createLiveFeed(req, res) {
  if (req.body.fixtureId) {
    await requireVolunteerFixture(req, req.body.fixtureId);
  }
  const feed = await LiveFeed.create({ ...req.body, addedBy: req.user.id });
  return res.status(201).json(feed);
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
  if (req.body.fixtureId) {
    await requireVolunteerFixture(req, req.body.fixtureId);
  }
  const result = await Result.create({ ...req.body, submittedBy: req.user.id, verifiedByAdmin: false });
  return res.status(201).json(result);
}
