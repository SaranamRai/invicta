import {
  apiFetch,
  getPublicFixtures,
  getPublicLiveScores,
  getVolunteerAssignedFixtures,
  mapMongoFixture,
} from "@/lib/api";
import { MatchData } from "@/lib/types";

function toMongoStatus(status?: MatchData["status"]) {
  if (status === "Finished") return "completed";
  if (status === "Live") return "live";
  return "upcoming";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const updateMatchStatus = async (matchId: string, status: MatchData["status"]) => {
  await updateMatchDetails(matchId, { status });
};

export const updateMatchScore = async (matchId: string, scoreA: number, scoreB: number) => {
  await updateMatchDetails(matchId, { scoreA, scoreB });
};

export const updateMatchDetails = async (matchId: string, details: Partial<MatchData>) => {
  const body: Record<string, unknown> = {
    ...details,
    teamAScore: details.scoreA,
    teamBScore: details.scoreB,
  };

  if (details.status) {
    body.currentStatus = toMongoStatus(details.status);
  }

  await apiFetch(`/volunteer/live-scores/${encodeURIComponent(matchId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
};

export const logActivity = async (matchId: string, action: string, volunteerEmail: string) => {
  await apiFetch("/volunteer/live-feeds", {
    method: "POST",
    body: JSON.stringify({
      fixtureId: matchId,
      message: action,
      type: "announcement",
      volunteerEmail,
    }),
  });
};

export const uploadMatchImage = async (file: File, matchId: string): Promise<string> => {
  const imageUrl = await readFileAsDataUrl(file);
  await updateMatchDetails(matchId, { imageUrl });
  return imageUrl;
};

export const getAllMatches = async (): Promise<MatchData[]> => {
  const [fixtures, liveScores] = await Promise.all([getPublicFixtures(), getPublicLiveScores()]);
  const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
  return fixtures.map((fixture) => mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData);
};

export const getAssignedMatches = async (): Promise<MatchData[]> => {
  const [fixtures, liveScores] = await Promise.all([getVolunteerAssignedFixtures(), getPublicLiveScores()]);
  const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
  return fixtures.map((fixture) => mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData);
};

export const getMatchById = async (matchId: string): Promise<MatchData | null> => {
  const matches = await getAssignedMatches();
  return matches.find((match) => match.id === matchId) || null;
};

export const createLiveFeedPost = async (
  matchId: string,
  _matchTitle: string,
  content: string,
  volunteerEmail: string,
  imageUrl?: string
) => {
  await apiFetch("/volunteer/live-feeds", {
    method: "POST",
    body: JSON.stringify({
      fixtureId: matchId,
      message: content,
      imageUrl: imageUrl || "",
      type: "announcement",
      volunteerEmail,
    }),
  });
};

export const uploadFeedImage = async (file: File): Promise<string> => {
  return readFileAsDataUrl(file);
};
