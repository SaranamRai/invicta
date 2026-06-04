import Fixture from "../models/Fixture.js";
import LiveScore from "../models/LiveScore.js";
import LiveFeed from "../models/LiveFeed.js";
import Gallery from "../models/Gallery.js";
import Issue from "../models/Issue.js";
import Result from "../models/Result.js";

export async function assignedMatches(req, res) {
  const fixtures = await Fixture.find({ assignedVolunteer: req.user.id }).sort({ date: 1, time: 1 }).lean();
  return res.json(fixtures);
}

export async function updateLiveScore(req, res) {
  const score = await LiveScore.findOneAndUpdate(
    { fixtureId: req.params.fixtureId },
    { ...req.body, fixtureId: req.params.fixtureId, updatedBy: req.user.id, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  return res.json(score);
}

export async function createLiveFeed(req, res) {
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
  const result = await Result.create({ ...req.body, submittedBy: req.user.id, verifiedByAdmin: false });
  return res.status(201).json(result);
}
