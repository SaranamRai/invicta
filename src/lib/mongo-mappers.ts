import { MongoFixture, MongoLiveFeed, MongoLiveScore, MongoRefName, MongoTeam } from "@/lib/api";
import { Team } from "@/lib/fixture-generator";
import { LiveFeedPost, MatchData } from "@/lib/types";

function getRefName(value: MongoRefName | string | undefined, fallback: string) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value.teamName || value.name || value.department || value._id || value.id || fallback;
}

function getStatus(status?: MongoFixture["status"]): MatchData["status"] {
  if (status === "live" || status === "half-time") return "Live";
  if (status === "completed") return "Finished";
  return "Upcoming";
}

function getTimestamp(value?: string) {
  const timestamp = value ? new Date(value).getTime() : Date.now();
  return Number.isNaN(timestamp) ? Date.now() : timestamp;
}

export function mapMongoFixtureToMatch(fixture: MongoFixture, liveScore?: MongoLiveScore): MatchData {
  const teamA = liveScore?.teamAName || getRefName(fixture.teamA, "Team A");
  const teamB = liveScore?.teamBName || getRefName(fixture.teamB, "Team B");

  return {
    id: fixture._id,
    teamA,
    teamB,
    sport: getRefName(fixture.sportId, "Sport"),
    type: fixture.round || "Inter-Department",
    scoreA: liveScore?.teamAScore ?? 0,
    scoreB: liveScore?.teamBScore ?? 0,
    status: getStatus(fixture.status),
    time: fixture.time,
    date: fixture.date,
    venue: fixture.venue,
    lastUpdated: getTimestamp(liveScore?.updatedAt || fixture.createdAt),
    period: fixture.status === "half-time" ? "Half Time" : fixture.status === "completed" ? "Full Time" : "First Half",
  };
}

export function mapMongoFeedToLiveFeed(feed: MongoLiveFeed): LiveFeedPost {
  return {
    id: feed._id,
    matchId: typeof feed.fixtureId === "string" ? feed.fixtureId : feed.fixtureId?._id || feed.fixtureId?.id || "",
    matchTitle: typeof feed.fixtureId === "object" ? feed.fixtureId.name || feed.fixtureId.teamName || "Match Update" : "Match Update",
    content: feed.message,
    timestamp: getTimestamp(feed.createdAt),
    volunteerEmail: "Volunteer",
  };
}

export function mapMongoTeamToTeam(team: MongoTeam): Team {
  return {
    id: team._id,
    name: team.teamName,
    sport: getRefName(team.sportId, "Sport"),
    members: [],
    department: team.department || team.teamName,
    coachCaptain: team.captainName,
    status: team.status === "approved" ? "approved" : team.status === "rejected" ? "rejected" : "pending",
    registeredAt: getTimestamp(team.createdAt),
  };
}
