import Sport from "../models/Sport.js";
import Fixture from "../models/Fixture.js";
import LiveScore from "../models/LiveScore.js";
import LiveFeed from "../models/LiveFeed.js";
import Result from "../models/Result.js";
import Announcement from "../models/Announcement.js";
import Rule from "../models/Rule.js";
import PointsTable from "../models/PointsTable.js";
import Gallery from "../models/Gallery.js";
import Team from "../models/Team.js";

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
  teams: Team,
};

export function listPublic(resource) {
  return async (_req, res) => {
    const model = publicModels[resource];
    const filter = resource === "announcements" ? { visibleToPublic: true } : {};

    let query = model.find(filter).sort({ createdAt: -1 });

    if (resource === "fixtures") {
      query = query.populate("sportId", "name").populate("teamA", "teamName department").populate("teamB", "teamName department");
    }

    if (resource === "live-feeds") {
      query = query.populate("fixtureId", "matchTitle");
    }

    if (resource === "teams") {
      query = query.populate("sportId", "name");
    }

    const data = await query.lean();
    return res.json(data);
  };
}
