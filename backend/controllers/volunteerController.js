import Fixture from "../models/Fixture.js";
import LiveScore from "../models/LiveScore.js";
import LiveFeed from "../models/LiveFeed.js";
import Gallery from "../models/Gallery.js";
import Issue from "../models/Issue.js";
import Result from "../models/Result.js";

function normalizeSport(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

async function requireVolunteerFixture(req, fixtureId) {
  const assignedSport = normalizeSport(req.user.assignedSport);

  const fixture = await Fixture.findById(fixtureId).lean();
  if (!fixture) {
    const error = new Error("Fixture not found");
    error.status = 404;
    throw error;
  }

  if (normalizeSport(fixture.sport) !== assignedSport) {
    const error = new Error(`This volunteer can only manage ${assignedSport} matches`);
    error.status = 403;
    throw error;
  }

  if (fixture.assignedVolunteer?.toString?.() !== req.user.id) {
    const error = new Error("This match is not assigned to this volunteer");
    error.status = 403;
    throw error;
  }

  return fixture;
}

export async function assignedMatches(req, res) {
  const assignedSport = normalizeSport(req.user.assignedSport);
  const query = { assignedVolunteer: req.user.id, ...(assignedSport ? { sport: assignedSport } : {}) };
  const fixtures = await Fixture.find(query).sort({ date: 1, time: 1 }).lean();
  return res.json(fixtures);
}

export async function updateLiveScore(req, res) {
  await requireVolunteerFixture(req, req.params.fixtureId);
  const score = await LiveScore.findOneAndUpdate(
    { fixtureId: req.params.fixtureId },
    { ...req.body, fixtureId: req.params.fixtureId, updatedBy: req.user.id, updatedAt: new Date() },
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
