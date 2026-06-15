const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

function getRefName(value: MongoRefName | string | undefined, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value.teamName || value.name || fallback;
}

function toTimestamp(value?: string | number) {
  if (typeof value === "number") return value;
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function normalizePublicSport(value?: string) {
  return String(value || "general").trim().toLowerCase().replace(/\s+/g, "-");
}

function withQuery(path: string, params?: Record<string, string | undefined>) {
  if (!params) return path;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function getMemberName(member: unknown) {
  if (typeof member === "string") return member;
  if (!member || typeof member !== "object") return "";
  const value = member as { fullName?: string; name?: string; registrationNumber?: string; regNo?: string };
  return value.fullName || value.name || value.registrationNumber || value.regNo || "";
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface AuthSession {
  token: string;
  role: "admin" | "supercoordinator" | "volunteer" | "coordinator";
  name: string;
  id: string;
  email: string;
  department?: string;
  assignedSport?: string;
  assignedSportId?: string;
  assignedSportName?: string;
}

export const AUTH_STORAGE_KEY = "sportsAuthSession";
export const AUTH_SESSION_EVENT = "sports-auth-session-change";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    return null;
  }
}

export function storeSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getStoredSession();
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const fullUrl = `${API_BASE_URL}${path}`;
  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Try to extract a helpful error message from the response body or raw text
    let message = data?.message;

    if (!message) {
      try {
        const text = await response.clone().text();
        if (text) message = text.slice(0, 100);
      } catch {
        /* ignore */
      }
    }

    if (!message) {
      message = response.status >= 500
        ? "The backend server is unavailable. Please start the backend and try again."
        : `API request failed (status ${response.status})`;
    }

    // Include request URL in the error to aid debugging in browser console
    const errorMessage = `${message} — ${fullUrl}`;
    throw new ApiError(errorMessage, response.status);
  }

  return data as T;
}

export async function apiDownload(path: string, options: RequestInit = {}) {
  const session = getStoredSession();
  const headers = new Headers(options.headers);

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const fullUrl = `${API_BASE_URL}${path}`;
  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.clone().json().catch(() => null);
    let message = data?.message;

    if (!message) {
      const text = await response.text().catch(() => "");
      if (text) message = text.slice(0, 100);
    }

    throw new ApiError(message || `Download failed (status ${response.status})`, response.status);
  }

  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get("Content-Disposition"),
    contentType: response.headers.get("Content-Type"),
  };
}

async function publicApiFetch<T>(path: string): Promise<T[]> {
  try {
    return await apiFetch<T[]>(path);
  } catch {
    return [];
  }
}

export async function loginRoleAccount(email: string, password: string) {
  return apiFetch<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export interface TeamSyncPayload {
  id: string;
  name: string;
  teamName?: string;
  department?: string;
  sport: string;
  sportName?: string;
  sportId?: string;
  tournamentId?: string;
  tournamentName?: string;
  category?: string;
  members?: unknown[];
  coachCaptain?: string;
  captainName?: string;
  captainRegNo?: string;
  captainEmail?: string;
  captainPhone?: string;
  email?: string;
  phone?: string;
  contactNumber?: string;
  logo?: string;
  status?: string;
  reviewedAt?: string;
  wins?: number;
  losses?: number;
  draws?: number;
  points?: number;
  registeredAt?: number;
  playerRegisteredAt?: number[];
  source?: string;
}

type TeamWritePayload = Omit<TeamSyncPayload, "id">;

export function getAdminTeams() {
  return apiFetch<TeamSyncPayload[]>("/admin/teams");
}

export function getAdminPlayers() {
  return apiFetch<unknown[]>("/admin/players");
}

export function createAdminTeam(team: TeamWritePayload) {
  return apiFetch<TeamSyncPayload>("/admin/teams", {
    method: "POST",
    body: JSON.stringify(team),
  });
}

export function createCoordinatorTeam(team: TeamWritePayload) {
  return apiFetch<TeamSyncPayload>("/coordinator/teams", {
    method: "POST",
    body: JSON.stringify(team),
  });
}

export function updateAdminTeam(team: TeamSyncPayload) {
  return apiFetch<TeamSyncPayload>(`/admin/teams/${encodeURIComponent(team.id)}`, {
    method: "PUT",
    body: JSON.stringify(team),
  });
}

export function deleteAdminTeam(teamId: string) {
  return apiFetch(`/admin/teams/${encodeURIComponent(teamId)}`, {
    method: "DELETE",
  });
}

export interface AdminFixturePayload {
  id: string;
  tournamentId?: string;
  tournamentName?: string;
  teamA: string;
  teamB: string;
  teamAName?: string;
  teamBName?: string;
  sport: string;
  sportName?: string;
  sportId?: string;
  category?: string;
  date: string;
  time: string;
  venue: string;
  status: "scheduled" | "live" | "paused" | "completed";
  scoreA?: number;
  scoreB?: number;
  endedAt?: string;
  fullMatchSeconds?: number;
  matchGapMinutes?: number;
  assignedVolunteer?: string;
}

export function getAdminFixtures() {
  return apiFetch<AdminFixturePayload[]>("/admin/fixtures");
}

export function replaceAdminFixtures(fixtures: Omit<AdminFixturePayload, "id">[]) {
  return apiFetch<AdminFixturePayload[]>("/admin/fixtures", {
    method: "PUT",
    body: JSON.stringify({ fixtures }),
  });
}

export interface GenerateFixturesPayload {
  tournamentId: string;
  sportId: string;
  category: "Male" | "Female";
  venueId?: string;
  venue?: string;
  startDate: string;
  dayStartTime: string;
  dayEndTime: string;
  matchDurationMinutes: number;
  gapMinutes: number;
}

export interface GenerateFixturesResponse {
  message: string;
  totalMatches: number;
  fixtures: AdminFixturePayload[];
}

export function generateAdminFixtures(payload: GenerateFixturesPayload) {
  return apiFetch<GenerateFixturesResponse>("/admin/fixtures/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminFixture(fixture: AdminFixturePayload) {
  return apiFetch<AdminFixturePayload>(`/admin/fixtures/${encodeURIComponent(fixture.id)}`, {
    method: "PUT",
    body: JSON.stringify(fixture),
  });
}

export function deleteAdminFixture(fixtureId: string) {
  return apiFetch(`/admin/fixtures/${encodeURIComponent(fixtureId)}`, {
    method: "DELETE",
  });
}

export function createAdminAnnouncement(payload: {
  title: string;
  message: string;
  visibleToPublic?: boolean;
  attachmentName?: string;
  attachmentType?: string;
  attachmentHtml?: string;
}) {
  return apiFetch("/admin/announcements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface MongoRefName {
  _id?: string;
  id?: string;
  name?: string;
  sportName?: string;
  teamName?: string;
  department?: string;
}

export interface MongoFixture {
  _id: string;
  tournamentId?: MongoRefName | string;
  tournamentName?: string;
  sportId?: MongoRefName | string;
  sport?: string;
  sportName?: string;
  matchTitle?: string;
  teamA?: MongoRefName | string;
  teamB?: MongoRefName | string;
  teamAName?: string;
  teamBName?: string;
  venue?: string;
  date?: string;
  time?: string;
  scoreA?: number;
  scoreB?: number;
  endedAt?: string;
  fullMatchSeconds?: number;
  matchGapMinutes?: number;
  round?: string;
  status?: "upcoming" | "live" | "paused" | "half-time" | "completed" | "delayed" | "cancelled";
  assignedVolunteer?: MongoRefName | string;
  createdAt?: string;
}

export interface MongoLiveScore {
  _id: string;
  fixtureId: string;
  tournamentId?: string;
  sportId?: string;
  category?: string;
  teamAName?: string;
  teamBName?: string;
  teamAScore?: number;
  teamBScore?: number;
  currentStatus?: string;
  timer?: string;
  period?: string;
  startedAt?: number;
  endedAt?: number;
  timerStartedAt?: number;
  timerPausedAt?: number;
  totalPausedMs?: number;
  pausePeriods?: { reason: string; pausedAt: number; resumedAt?: number; elapsedSeconds?: number }[];
  elapsedSeconds?: number;
  fullMatchSeconds?: number;
  scheduledFullMatchSeconds?: number;
  extraTimeSeconds?: number;
  clockRunning?: boolean;
  announcements?: string[];
  scoreEvents?: unknown[];
  volleyballSets?: unknown[];
  winner?: "A" | "B" | "";
  winnerName?: string;
  updatedAt?: string;
}

export interface MongoLiveFeed {
  _id: string;
  fixtureId?: MongoRefName | string;
  message: string;
  imageUrl?: string;
  volunteerEmail?: string;
  type?: string;
  createdAt?: string;
}

export interface MongoTeam {
  _id: string;
  teamName: string;
  tournamentId?: MongoRefName | string;
  tournamentName?: string;
  department?: string;
  sport?: string;
  sportName?: string;
  sportId?: MongoRefName | string;
  captainName?: string;
  captainRegNo?: string;
  captainEmail?: string;
  captainPhone?: string;
  email?: string;
  contactNumber?: string;
  category?: string;
  members?: string[] | { fullName?: string; registrationNumber?: string; registrationNo?: string }[];
  wins?: number;
  losses?: number;
  draws?: number;
  points?: number;
  registeredAt?: number;
  playerRegisteredAt?: number[];
  status?: "pending" | "approved" | "rejected";
  reviewedAt?: string;
  createdAt?: string;
}

export interface MongoSport {
  _id: string;
  sportName?: string;
  name?: string;
  categories?: ("Male" | "Female")[];
  type?: "indoor" | "outdoor";
  rules?: string;
  minPlayers?: number;
  maxPlayers?: number;
  status?: "active" | "inactive";
}

export interface SportDetailTeam {
  _id: string;
  teamName: string;
  tournamentId?: string;
  tournamentName?: string;
  department: string;
  category: string;
  captainName: string;
  membersCount: number;
  members?: SportDetailMember[];
  status: string;
}

export interface SportDetailMember {
  fullName: string;
  registrationNo: string;
  department: string;
  teamName: string;
  tournamentId?: string;
  tournamentName?: string;
  category: string;
  role?: string;
  position?: string;
  profilePhoto?: string;
}

export interface SportDetailResponse {
  sport: MongoSport;
  stats: {
    totalTeams: number;
    totalMembers: number;
    maleTeams: number;
    femaleTeams: number;
    maleMembers: number;
    femaleMembers: number;
  };
  teams: {
    male: SportDetailTeam[];
    female: SportDetailTeam[];
  };
  members: {
    male: SportDetailMember[];
    female: SportDetailMember[];
  };
  fixtures: {
    male: unknown[];
    female: unknown[];
  };
}

export interface MongoAnnouncement {
  _id: string;
  title: string;
  message: string;
  priority?: "normal" | "important" | "urgent";
  visibleToPublic?: boolean;
  attachmentName?: string;
  attachmentType?: string;
  attachmentHtml?: string;
  createdAt?: string;
}

export interface MongoRule {
  _id: string;
  title: string;
  rules?: string;
  description?: string;
  sport?: string;
  sportName?: string;
  tournamentId?: MongoRefName | string;
  tournamentName?: string;
  category?: string;
  attachmentData?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentKind?: "document" | "image";
  createdByName?: string;
  createdByEmail?: string;
  createdAt?: string;
}

export interface MongoGalleryImage {
  _id: string;
  title?: string;
  imageUrl?: string;
  caption?: string;
  createdAt?: string;
}

export function mapMongoTeam(team: MongoTeam): TeamSyncPayload {
  const sport = normalizePublicSport(team.sport || team.sportName || getRefName(team.sportId, ""));

  return {
    id: team._id,
    name: team.teamName,
    department: team.department,
    sport,
    sportName: team.sportName || getRefName(team.sportId, ""),
    sportId: typeof team.sportId === "string" ? team.sportId : team.sportId?._id || team.sportId?.id || "",
    tournamentId: typeof team.tournamentId === "string" ? team.tournamentId : team.tournamentId?._id || team.tournamentId?.id || "",
    tournamentName: team.tournamentName || getRefName(team.tournamentId, ""),
    category: team.category,
    members: (team.members || []).map(getMemberName).filter(Boolean),
    coachCaptain: team.captainName || "",
    captainRegNo: team.captainRegNo || "",
    captainEmail: team.captainEmail || "",
    captainPhone: team.captainPhone || "",
    contactNumber: team.contactNumber || "",
    email: team.email || "",
    status: team.status,
    reviewedAt: team.reviewedAt,
    wins: team.wins || 0,
    losses: team.losses || 0,
    draws: team.draws || 0,
    points: team.points || 0,
    registeredAt: team.registeredAt || toTimestamp(team.createdAt),
    playerRegisteredAt: team.playerRegisteredAt || [],
  };
}

export function mapMongoFixture(fixture: MongoFixture, liveScore?: MongoLiveScore) {
  const rawStatus = liveScore?.currentStatus || fixture.status || "upcoming";
  const status = rawStatus === "completed"
    ? "Finished"
    : rawStatus === "paused"
      ? "Paused"
    : rawStatus === "live" || rawStatus === "half-time"
      ? "Live"
      : "Upcoming";
  const sportName = fixture.sportName || getRefName(fixture.sportId, fixture.sport || "general");

  return {
    id: fixture._id,
    teamA: fixture.teamAName || liveScore?.teamAName || getRefName(fixture.teamA, "Team A"),
    teamB: fixture.teamBName || liveScore?.teamBName || getRefName(fixture.teamB, "Team B"),
    sport: normalizePublicSport(sportName),
    sportName,
    tournamentId: typeof fixture.tournamentId === "string" ? fixture.tournamentId : fixture.tournamentId?._id || fixture.tournamentId?.id || "",
    tournamentName: fixture.tournamentName || getRefName(fixture.tournamentId, ""),
    type: fixture.round || sportName || "Match",
    scoreA: Number(liveScore?.teamAScore ?? fixture.scoreA ?? 0),
    scoreB: Number(liveScore?.teamBScore ?? fixture.scoreB ?? 0),
    status,
    time: fixture.time,
    date: fixture.date,
    venue: fixture.venue,
    lastUpdated: toTimestamp(liveScore?.updatedAt || fixture.createdAt),
    startedAt: liveScore?.startedAt,
    endedAt: liveScore?.endedAt ?? (fixture.endedAt ? toTimestamp(fixture.endedAt) : undefined),
    timerStartedAt: liveScore?.timerStartedAt,
    timerPausedAt: liveScore?.timerPausedAt,
    totalPausedMs: liveScore?.totalPausedMs,
    pausePeriods: liveScore?.pausePeriods || [],
    elapsedSeconds: liveScore?.elapsedSeconds,
    fullMatchSeconds: liveScore?.fullMatchSeconds ?? fixture.fullMatchSeconds,
    scheduledFullMatchSeconds: fixture.fullMatchSeconds ?? liveScore?.scheduledFullMatchSeconds,
    extraTimeSeconds: liveScore?.extraTimeSeconds || 0,
    matchGapMinutes: fixture.matchGapMinutes || 0,
    clockRunning: liveScore?.clockRunning,
    period: liveScore?.period as never,
    timer: liveScore?.timer,
    announcements: liveScore?.announcements || [],
    scoreEvents: liveScore?.scoreEvents as never[] || [],
    volleyballSets: liveScore?.volleyballSets as never[] || [],
    winner: liveScore?.winner || "",
    winnerName: liveScore?.winnerName || "",
    assignedVolunteer: typeof fixture.assignedVolunteer === "string"
      ? fixture.assignedVolunteer
      : fixture.assignedVolunteer?._id || fixture.assignedVolunteer?.id || "",
  };
}

export function mapMongoAnnouncement(announcement: MongoAnnouncement) {
  return {
    id: announcement._id,
    title: announcement.title,
    message: announcement.message,
    timestamp: toTimestamp(announcement.createdAt),
    type: "info" as const,
    href: "/announcements",
    attachmentName: announcement.attachmentName,
    attachmentType: announcement.attachmentType,
    attachmentHtml: announcement.attachmentHtml,
  };
}

export function mapMongoRule(rule: MongoRule) {
  return {
    id: rule._id,
    title: rule.title,
    description: rule.description || rule.rules || "",
    sport: rule.sport,
    sportName: rule.sportName,
    createdBy: rule.createdByName,
    createdByEmail: rule.createdByEmail,
    createdAt: toTimestamp(rule.createdAt),
    attachmentUrl: rule.attachmentData,
    attachmentName: rule.attachmentName,
    attachmentType: rule.attachmentType,
    attachmentKind: rule.attachmentKind,
  };
}

export function getPublicFixtures(params?: Record<string, string | undefined>) {
  return publicApiFetch<MongoFixture>(withQuery("/public/fixtures", params));
}

export function getVolunteerAssignedFixtures(params?: Record<string, string | undefined>) {
  return apiFetch<MongoFixture[]>(withQuery("/volunteer/assigned-matches", params));
}

export function getPublicLiveScores(params?: Record<string, string | undefined>) {
  return publicApiFetch<MongoLiveScore>(withQuery("/public/live-scores", params));
}

export function getPublicLiveFeeds(params?: Record<string, string | undefined>) {
  return publicApiFetch<MongoLiveFeed>(withQuery("/public/live-feeds", params));
}

export function getPublicTeams(params?: Record<string, string | undefined>) {
  return publicApiFetch<MongoTeam>(withQuery("/public/teams", params));
}

export function getCoordinatorTeams() {
  return apiFetch<TeamSyncPayload[]>("/coordinator/teams");
}

export function getVolunteerTeams() {
  return apiFetch<TeamSyncPayload[]>("/volunteer/teams");
}

export function getPublicSports() {
  return publicApiFetch<MongoSport>("/public/sports");
}

export function getPublicSportDetail(sportId: string) {
  return apiFetch<SportDetailResponse>(`/public/sports/${encodeURIComponent(sportId)}/detail`);
}

export function getPublicTournaments() {
  return publicApiFetch<TournamentPayload>("/public/tournaments");
}
export function registerPublicTeam(team: unknown) {
  return apiFetch<TeamSyncPayload>("/public/teams", {
    method: "POST",
    body: JSON.stringify(team),
  });
}

export function getPublicAnnouncements() {
  return publicApiFetch<MongoAnnouncement>("/public/announcements");
}

export function getPublicRules(params?: Record<string, string | undefined>) {
  return publicApiFetch<MongoRule>(withQuery("/public/rules", params));
}

export function getPublicGallery() {
  return publicApiFetch<MongoGalleryImage>("/public/gallery");
}

export function createCoordinatorRule(payload: {
  tournamentId?: string;
  tournamentName?: string;
  sport: string;
  sportName: string;
  category?: string;
  title: string;
  description: string;
  attachmentData?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentKind?: "document" | "image";
}) {
  return apiFetch<MongoRule>("/coordinator/rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface RoleAccountPayload {
  id: string;
  fullName: string;
  email: string;
  deptName: string;
  role: "admin" | "supercoordinator" | "volunteer" | "coordinator" | string;
  assignedSport?: string;
  assignedSportId?: string;
  assignedSportName?: string;
  createdBy?: string;
  createdByRole?: string;
  status?: string;
  phone?: string;
  registrationNo?: string;
  mustChangePassword?: boolean;
  emailSent?: boolean;
  message?: string;
  createdAt?: string;
}

export interface CoordinatorVolunteerPayload {
  id: string;
  name: string;
  email: string;
  assignedSport?: string;
  assignedSportId?: string;
  assignedSportName?: string;
  registrationNumber?: string;
  phone?: string;
  createdAt?: string;
}

export interface CoordinatorPointsTablePayload {
  id: string;
  rank: number;
  department: string;
  sportId?: string;
  sportName?: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  updatedAt?: string;
}

export interface TournamentPayload {
  _id?: string;
  id?: string;
  name: string;
  sport: string;
  startDate: string;
  endDate: string;
  registrationOpen?: boolean;
  type: "round-robin" | "knockout";
  status: "upcoming" | "ongoing" | "completed";
  teamsCount: number;
}

export function updateAdminTournament(tournamentId: string, tournament: Partial<TournamentPayload>) {
  return apiFetch<TournamentPayload>(`/admin/tournaments/${encodeURIComponent(tournamentId)}`, {
    method: "PUT",
    body: JSON.stringify(tournament),
  });
}

export function toggleAdminTournamentRegistration(tournamentId: string, registrationOpen: boolean) {
  // Try the dedicated PATCH endpoint first; if the backend doesn't have it (404),
  // fall back to the older PUT update endpoint so the UI remains compatible with
  // older backend instances.
  return apiFetch<TournamentPayload>(`/admin/tournaments/${encodeURIComponent(tournamentId)}/registration`, {
    method: "PATCH",
    body: JSON.stringify({ registrationOpen }),
  }).catch((err) => {
    if (err && typeof err.status === "number" && err.status === 404) {
      return updateAdminTournament(tournamentId, { registrationOpen });
    }
    throw err;
  });
}

export function getAdminRoleAccounts() {
  return apiFetch<RoleAccountPayload[]>("/admin/role-accounts");
}

export interface CreateCoordinatorPayload {
  name: string;
  email: string;
  password: string;
  assignedSport: string;
  assignedSportId?: string;
  registrationNo?: string;
  phone?: string;
  department?: string;
  status?: string;
}

export function createAdminCoordinator(payload: CreateCoordinatorPayload) {
  return apiFetch<RoleAccountPayload>("/admin/create-coordinator", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createAdminVolunteer(payload: {
  name: string;
  email: string;
  password: string;
  assignedSport: string;
}) {
  return apiFetch<RoleAccountPayload>("/admin/create-volunteer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminRoleAccount(id: string, payload: {
  role: string;
  name?: string;
  email?: string;
  password?: string;
  assignedSport?: string;
  assignedSportId?: string;
  assignedSportName?: string;
  status?: string;
  phone?: string;
}) {
  return apiFetch<RoleAccountPayload>(`/admin/role-accounts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminRoleAccount(id: string, role: string) {
  return apiFetch<void>(`/admin/role-accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ role }),
  });
}

export function createCoordinatorVolunteer(payload: {
  name: string;
  email: string;
  password: string;
  assignedSport?: string;
  registrationNumber: string;
  phone: string;
}) {
  return apiFetch<RoleAccountPayload>("/coordinator/create-volunteer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCoordinatorVolunteers() {
  return apiFetch<CoordinatorVolunteerPayload[]>("/coordinator/volunteers");
}

export function updateCoordinatorVolunteer(volunteerId: string, payload: {
  name: string;
  email: string;
  registrationNumber: string;
  phone: string;
  password?: string;
}) {
  return apiFetch<CoordinatorVolunteerPayload>(`/coordinator/volunteers/${encodeURIComponent(volunteerId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getCoordinatorFixtures(params?: Record<string, string | undefined>) {
  return apiFetch<AdminFixturePayload[]>(withQuery("/coordinator/fixtures", params));
}

export function getCoordinatorPointsTable() {
  return apiFetch<CoordinatorPointsTablePayload[]>("/coordinator/points-table");
}

export function getCoordinatorAnnouncements() {
  return apiFetch<MongoAnnouncement[]>("/coordinator/announcements");
}

export function assignCoordinatorFixtureVolunteer(fixtureId: string, volunteerId: string, tournamentId?: string) {
  return apiFetch<{ id: string; assignedVolunteer: string }>(`/coordinator/fixtures/${encodeURIComponent(fixtureId)}/volunteer`, {
    method: "PATCH",
    body: JSON.stringify({ volunteerId, tournamentId }),
  });
}

export function getAdminTournaments() {
  return apiFetch<TournamentPayload[]>("/admin/tournaments");
}

export function createAdminTournament(tournament: Omit<TournamentPayload, "id" | "_id">) {
  return apiFetch<TournamentPayload>("/admin/tournaments", {
    method: "POST",
    body: JSON.stringify(tournament),
  });
}

export function deleteAdminTournament(tournamentId: string) {
  return apiFetch(`/admin/tournaments/${encodeURIComponent(tournamentId)}`, {
    method: "DELETE",
  });
}

export function getAdminTournamentReport(tournamentId: string) {
  return apiFetch<Record<string, unknown>>(`/admin/tournaments/${encodeURIComponent(tournamentId)}/report`);
}

export function updateAdminAnnouncement(id: string, payload: {
  title?: string;
  message?: string;
  priority?: string;
  visibleToPublic?: boolean;
}) {
  return apiFetch(`/admin/announcements/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminAnnouncement(id: string) {
  return apiFetch(`/admin/announcements/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export interface VenuePayload {
  _id?: string;
  id?: string;
  venueName?: string;
  name: string;
  location?: string;
  sportType?: string;
  capacity?: number;
  status?: string;
}

export function getAdminVenues() {
  return apiFetch<VenuePayload[]>("/admin/venues");
}

export function createAdminVenue(payload: { venueName?: string; name: string; location?: string; sportType?: string; capacity?: number; status?: string }) {
  return apiFetch<VenuePayload>("/admin/venues", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminVenue(id: string, payload: Partial<VenuePayload>) {
  return apiFetch<VenuePayload>(`/admin/venues/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminVenue(id: string) {
  return apiFetch(`/admin/venues/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function getAdminPendingRegistrations() {
  return apiFetch<MongoTeam[]>("/admin/registrations/pending");
}

export function getAdminSports() {
  return apiFetch<MongoSport[]>("/admin/sports");
}

export function createAdminSport(payload: {
  sportName: string;
  categories?: ("Male" | "Female")[];
  type?: "indoor" | "outdoor";
  rules?: string;
  minPlayers?: number;
  maxPlayers?: number;
  status?: "active" | "inactive";
}) {
  return apiFetch<MongoSport>("/admin/sports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminSport(id: string, payload: Partial<MongoSport>) {
  return apiFetch<MongoSport>(`/admin/sports/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminSport(id: string) {
  return apiFetch<void>(`/admin/sports/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// --- Team Registration API (new system) ---

export interface TeamRegistrationMember {
  fullName: string;
  registrationNo: string;
  department?: string;
  semester?: string;
  gender?: string;
  email?: string;
  phone?: string;
}

export interface TeamRegistrationPayload {
  _id: string;
  tournamentId: string;
  tournamentName: string;
  sportId: string;
  sportName: string;
  category: "Male" | "Female";
  department: string;
  teamName: string;
  teamLogo?: string;
  captainName: string;
  captainRegNo: string;
  captainEmail: string;
  captainPhone: string;
  members: TeamRegistrationMember[];
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type TeamRegistrationWritePayload = Omit<TeamRegistrationPayload, "_id" | "status" | "submittedAt" | "reviewedBy" | "reviewedAt" | "rejectionReason" | "createdAt" | "updatedAt">;

export function submitTeamRegistration(payload: TeamRegistrationWritePayload) {
  return apiFetch<TeamRegistrationPayload>("/registrations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTeamPendingRegistrations() {
  return apiFetch<TeamRegistrationPayload[]>("/registrations/pending");
}

export function getTeamApprovedRegistrations(params?: Record<string, string | undefined>) {
  return apiFetch<TeamRegistrationPayload[]>(withQuery("/registrations/approved", params));
}

export function approveTeamRegistration(id: string) {
  return apiFetch<TeamRegistrationPayload>(`/registrations/${encodeURIComponent(id)}/approve`, {
    method: "PATCH",
  });
}

export function rejectTeamRegistration(id: string, rejectionReason: string) {
  return apiFetch<TeamRegistrationPayload>(`/registrations/${encodeURIComponent(id)}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ rejectionReason }),
  });
}

function getFilenameFromContentDisposition(value: string | null) {
  if (!value) return "";
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ""));

  const match = value.match(/filename="?([^";]+)"?/i);
  return match?.[1] || "";
}

export async function downloadApprovedRegistrationsExcel(params?: Record<string, string | undefined>) {
  const { blob, contentDisposition, contentType } = await apiDownload(withQuery("/registrations/export-excel", params));
  const filename = getFilenameFromContentDisposition(contentDisposition) || "approved_registrations.xlsx";

  if (!blob.size) {
    throw new ApiError("The export completed but returned an empty file.", 500);
  }

  const excelTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
  ];

  if (contentType && !excelTypes.some((type) => contentType.includes(type))) {
    throw new ApiError("The server did not return an Excel file.", 500);
  }

  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return filename;
}
