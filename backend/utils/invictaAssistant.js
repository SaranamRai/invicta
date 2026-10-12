import Announcement from "../models/Announcement.js";
import Fixture from "../models/Fixture.js";
import Sport from "../models/Sport.js";
import Tournament from "../models/Tournament.js";

const MAX_MESSAGE_LENGTH = 500;
const SENSITIVE_REQUEST = /\b(?:ignore (?:all |any |the )?(?:previous|prior)|system prompt|developer message|jailbreak|participant(?:s)? (?:database|record|list)|registration (?:database|record|details)|private (?:data|record)|server logs?|api logs?|error logs?|audit logs?|passwords?|credentials?|secret(?:s| key)?|token(?:s)?|id proof|payment receipt|phone numbers?|email addresses?)\b/i;
const safeText = (value, maxLength = 160) => String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);

function redactPublicText(value, maxLength = 220) {
  return safeText(value, maxLength).replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted]").replace(/\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/g, "[redacted]");
}

export function validateAssistantMessage(value) {
  const message = safeText(value, MAX_MESSAGE_LENGTH);
  if (!message) return { ok: false, message: "Please ask a question about the public Invicta schedule." };
  if (SENSITIVE_REQUEST.test(message)) return { ok: false, message: "Sorry, I can’t help with personal, registration, administrative, or system data. I can help with public Invicta schedules, venues, and fest information." };
  return { ok: true, message };
}

function normalizeDate(value) {
  const text = safeText(value, 40);
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function publicFixture(fixture) {
  return { title: safeText(fixture.matchTitle, 120), sport: safeText(fixture.sportName || fixture.sport, 60), category: safeText(fixture.category, 40), round: safeText(fixture.round, 50), date: safeText(fixture.date, 40), time: safeText(fixture.time, 40), venue: safeText(fixture.venue, 100), status: safeText(fixture.status, 30) };
}

function relevanceScore(event, question) {
  const haystack = `${event.title} ${event.sport} ${event.category} ${event.round} ${event.venue}`.toLowerCase();
  return question.toLowerCase().split(/\W+/).filter((word) => word.length > 2).reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

/** RAG-style lookup over approved public event fields only; private collections are never queried. */
export async function lookupPublicSchedule(question) {
  const [fixtures, sports, tournaments, announcements] = await Promise.all([
    Fixture.find({}, { matchTitle: 1, sport: 1, sportName: 1, category: 1, round: 1, date: 1, time: 1, venue: 1, status: 1 }).sort({ date: 1, time: 1 }).lean(),
    Sport.find({ status: "active" }, { sportName: 1, name: 1, type: 1 }).sort({ sportName: 1 }).lean(),
    Tournament.find({}, { name: 1, sport: 1, startDate: 1, endDate: 1, status: 1 }).sort({ startDate: 1 }).lean(),
    Announcement.find({ visibleToPublic: true }, { title: 1, message: 1, priority: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const query = question.toLowerCase();
  const intent = { wantsToday: /\btoday\b|ongoing|live now|currently/.test(query), wantsLive: /\blive\b|ongoing|currently/.test(query), category: /\bcultural\b|\btechnical\b|\bsports?\b/.exec(query)?.[0] || "", wantsFinal: /\bfinals?\b/.test(query), wantsVenue: /\b(?:where|venue|location|ground|court|hall)\b/.test(query), wantsSports: /\b(?:sports?|games?)\b/.test(query), wantsTournament: /\b(?:tournament|knockout|round robin|registration)\b/.test(query), wantsAnnouncements: /\b(?:announcement|notice|update|news)\b/.test(query) };
  const allEvents = fixtures.map(publicFixture);
  intent.requestedSport = allEvents.find((event) => event.sport && query.includes(event.sport.toLowerCase()))?.sport.toLowerCase() || "";
  const filtered = allEvents.filter((event) => {
    if (intent.wantsToday && normalizeDate(event.date) !== todayKey()) return false;
    if (intent.wantsLive && event.status !== "live") return false;
    if (intent.category && intent.category !== "sports" && !`${event.category} ${event.title}`.toLowerCase().includes(intent.category)) return false;
    if (intent.requestedSport && event.sport.toLowerCase() !== intent.requestedSport) return false;
    return !intent.wantsFinal || `${event.title} ${event.round}`.toLowerCase().includes("final");
  });
  const exact = Boolean(intent.category && intent.category !== "sports") || Boolean(intent.requestedSport) || intent.wantsFinal;
  const events = (filtered.length ? filtered : exact ? [] : allEvents).sort((a, b) => relevanceScore(b, question) - relevanceScore(a, question)).slice(0, 6);
  const publicSports = sports.map((sport) => ({ name: safeText(sport.sportName || sport.name, 60), type: safeText(sport.type, 30) }))
    .filter((sport, index, list) => sport.name && list.findIndex((item) => item.name.toLowerCase() === sport.name.toLowerCase()) === index);
  return { events, intent, sports: publicSports, tournaments: tournaments.map((item) => ({ name: safeText(item.name, 100), sport: safeText(item.sport, 60), startDate: safeText(item.startDate, 40), status: safeText(item.status, 30) })), announcements: announcements.map((item) => ({ title: redactPublicText(item.title, 100), message: redactPublicText(item.message, 220) })) };
}

function noPublishedAnswer(intent) {
  if (intent.wantsToday) return "There are no published Invicta fixtures for today in the current schedule.";
  if (intent.wantsLive) return "There are no fixtures currently marked live in the public Invicta schedule.";
  if (intent.category) return `There are no published ${intent.category} event details in the current public schedule.`;
  if (intent.requestedSport) return `I couldn’t find a published ${intent.requestedSport} fixture matching that request.`;
  if (intent.wantsFinal) return "I couldn’t find a published final matching that request.";
  return "I couldn’t find a published Invicta event matching that question. I won’t guess—please check again once coordinators publish it.";
}

export async function answerInvictaQuestion(rawMessage) {
  const validation = validateAssistantMessage(rawMessage);
  if (!validation.ok) return { reply: validation.message, events: [], suggestions: ["Today's Schedule", "Sports Events", "Find a Venue"] };
  const { events, intent, sports, tournaments, announcements } = await lookupPublicSchedule(validation.message);
  if (intent.wantsAnnouncements && announcements.length) return { reply: `Latest public Invicta updates: ${announcements.map((item) => `${item.title}: ${item.message}`).join("; ")}`, events: [], suggestions: ["Today's Schedule", "Sports Events", "Live Events"] };
  if (intent.wantsTournament && tournaments.length && !intent.requestedSport) return { reply: `Published tournaments: ${tournaments.slice(0, 6).map((item) => `${item.name} (${item.sport}, ${item.status}${item.startDate ? `, starts ${item.startDate}` : ""})`).join("; ")}`, events: [], suggestions: ["Today's Schedule", "Sports Events", "Find a Venue"] };
  if (intent.wantsSports && !intent.requestedSport && !intent.wantsToday && !intent.wantsLive && !intent.wantsFinal && sports.length) return { reply: `Published Invicta sports: ${sports.map((sport) => `${sport.name}${sport.type ? ` (${sport.type})` : ""}`).join(", ")}. Ask me for a specific sport’s schedule, final, or venue.`, events: [], suggestions: ["Today's Schedule", "Live Events", "Find a Venue"] };
  if (!events.length) return { reply: noPublishedAnswer(intent), events: [], suggestions: ["Today's Schedule", "Sports Events", "Cultural Fest"] };
  const lead = intent.wantsToday ? "Published fixtures for today" : intent.wantsLive ? "Public fixtures currently marked live" : intent.wantsVenue ? "Venue details from the public schedule" : intent.wantsFinal ? "Published final details" : intent.requestedSport ? `Published ${intent.requestedSport} schedule details` : "Public Invicta schedule details";
  const summary = events.map((event) => `${event.title || event.sport}${event.date ? ` — ${event.date}` : ""}${event.time ? `, ${event.time}` : ""}${event.venue ? ` at ${event.venue}` : ""}${event.status ? ` [${event.status}]` : ""}`).join("; ");
  return { reply: `${lead}: ${summary}`, events, suggestions: ["Today's Schedule", "Sports Events", "Cultural Fest"] };
}
