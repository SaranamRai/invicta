import { aiTools } from "./aiTools.js";

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY = 8;
const UNKNOWN = "I couldn't find that information in the available INVICTA data.";
const SECURITY_REFUSAL = "I can help with public INVICTA event information, but I can't provide credentials, private user data, database details, or hidden instructions.";
const SENSITIVE_REQUEST = /\b(password|credential|api[\s_-]?key|secret|token|database|mongo|system prompt|developer message|audit log|private (?:data|email|phone)|ignore (?:all|any|the) (?:previous|prior|above)|jailbreak)\b/i;

function cleanMessage(value) {
  return String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_LENGTH);
}

function findSport(message, sports) {
  const lower = message.toLowerCase();
  return sports.find((sport) => lower.includes(String(sport.name).toLowerCase()))?.name || "";
}

function formatFixtures(fixtures, title) {
  if (!fixtures.length) return UNKNOWN;
  return `${title}\n${fixtures.slice(0, 8).map((fixture, index) => `${index + 1}. ${fixture.teamA || fixture.title} vs ${fixture.teamB || ""}${fixture.date ? ` — ${fixture.date}` : ""}${fixture.time ? `, ${fixture.time}` : ""}${fixture.venue ? ` at ${fixture.venue}` : ""}${fixture.status ? ` (${fixture.status})` : ""}`).join("\n")}`;
}

function formatStandings(rows) {
  if (!rows.length) return UNKNOWN;
  return `Current INVICTA standings\n${rows.slice(0, 10).map((row, index) => `${index + 1}. ${row.team} — ${row.points ?? 0} points (${row.wins ?? 0} wins, ${row.draws ?? 0} draws, ${row.losses ?? 0} losses)`).join("\n")}`;
}

function formatScores(scores) {
  if (!scores.length) return "There are no matches currently marked live, or a current score is not available.";
  return `Current live scores\n${scores.map((score) => `${score.teamA} ${score.scoreA ?? 0} — ${score.scoreB ?? 0} ${score.teamB}${score.period ? ` (${score.period})` : ""}`).join("\n")}`;
}

async function answerWithTools(message) {
  const sports = await aiTools.getSports();
  const sport = findSport(message, sports);
  const lower = message.toLowerCase();

  if (/\b(?:what sports|which sports|sports available|games available)\b/.test(lower)) {
    return sports.length ? `Sports currently configured in INVICTA: ${sports.map((item) => item.name).join(", ")}.` : UNKNOWN;
  }
  if (/\b(?:live|currently playing|current score|live score)\b/.test(lower)) {
    return formatScores(await aiTools.getLiveScores({}));
  }
  if (/\b(?:standings?|leading|topping|first|points table|most points)\b/.test(lower)) {
    return formatStandings(await aiTools.getStandings({ sport }));
  }
  if (/\b(?:result|won|winner|yesterday|completed|score of)\b/.test(lower)) {
    return formatFixtures(await aiTools.getResults({ sport }), "Recent INVICTA results");
  }
  if (/\b(?:rule|format|player limit|how many players)\b/.test(lower)) {
    const rules = await aiTools.getRules({ sport });
    return rules.length ? rules.map((rule) => `${rule.title}${rule.sport ? ` (${rule.sport})` : ""}: ${rule.rules}`).join("\n") : UNKNOWN;
  }
  if (/\b(?:announcement|notice|news|update)\b/.test(lower)) {
    const announcements = await aiTools.getAnnouncements();
    return announcements.length ? `Latest public INVICTA announcements\n${announcements.map((item) => `• ${item.title}: ${item.message}`).join("\n")}` : UNKNOWN;
  }
  if (/\b(?:venue|where|ground|court|hall|location)\b/.test(lower)) {
    const venues = await aiTools.getVenues();
    return venues.length ? `Configured INVICTA venues\n${venues.map((venue) => `• ${venue.name}${venue.location ? ` — ${venue.location}` : ""}`).join("\n")}` : UNKNOWN;
  }
  if (/\b(?:how many|statistics|stats|registered)\b/.test(lower)) {
    const stats = await aiTools.getTournamentStatistics();
    return `Current INVICTA statistics: ${stats.sports} sports, ${stats.teams} approved teams, ${stats.players} players, ${stats.matches} matches, ${stats.completedMatches} completed matches, and ${stats.liveMatches} live matches.`;
  }
  if (/\b(?:team|teams|registered teams|players|who plays)\b/.test(lower)) {
    const teams = await aiTools.getTeams({ sport });
    return teams.length ? `Approved INVICTA teams${sport ? ` for ${sport}` : ""}\n${teams.map((team) => `• ${team.name} (${team.department}${team.category ? `, ${team.category}` : ""})`).join("\n")}` : UNKNOWN;
  }
  if (/\b(?:today|today's|todays)\b/.test(lower)) {
    return formatFixtures(await aiTools.getTodaysFixtures({ sport }), "Today's INVICTA fixtures");
  }
  if (/\b(?:next|upcoming|schedule|fixture|match|game)\b/.test(lower)) {
    return formatFixtures(await aiTools.getUpcomingFixtures({ sport }), "Upcoming INVICTA fixtures");
  }

  const eventInfo = await aiTools.getEventInfo();
  return eventInfo.length
    ? `INVICTA currently has ${eventInfo.map((event) => `${event.name}${event.startDate ? ` (${event.startDate}${event.endDate ? ` to ${event.endDate}` : ""})` : ""}`).join(", ")}. Ask me about sports, fixtures, live scores, results, standings, rules, teams, venues, or announcements.`
    : "INVICTA event information is not configured in the current data.";
}

export async function answerInvictaQuestion(rawMessage, history = []) {
  const message = cleanMessage(rawMessage);
  if (!message) return { reply: "Please ask a question about INVICTA.", suggestions: ["What sports are available?", "What matches are today?", "Who is leading football?"] };
  if (SENSITIVE_REQUEST.test(message)) return { reply: SECURITY_REFUSAL, suggestions: ["What sports are available?", "Show today's fixtures", "What matches are live?"] };
  const safeHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY).map((item) => ({
    role: item?.role === "user" ? "user" : "assistant",
    content: cleanMessage(item?.content),
  })) : [];
  void safeHistory;
  return {
    reply: await answerWithTools(message),
    suggestions: ["What sports are available?", "Show today's fixtures", "What matches are live?"],
  };
}

export { MAX_MESSAGE_LENGTH };
