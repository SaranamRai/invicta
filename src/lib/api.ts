const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

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
  role: "admin" | "volunteer" | "coordinator";
  name: string;
  id: string;
  email: string;
  department?: string;
  assignedSport?: string;
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.message ||
      (response.status >= 500
        ? "The login server is unavailable. Please start the backend and try again."
        : "API request failed");
    throw new ApiError(message, response.status);
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

export interface MongoRefName {
  _id?: string;
  id?: string;
  name?: string;
  teamName?: string;
  department?: string;
}

export interface MongoFixture {
  _id: string;
  sportId?: MongoRefName | string;
  matchTitle?: string;
  teamA?: MongoRefName | string;
  teamB?: MongoRefName | string;
  venue?: string;
  date?: string;
  time?: string;
  round?: string;
  status?: "upcoming" | "live" | "half-time" | "completed" | "delayed" | "cancelled";
  createdAt?: string;
}

export interface MongoLiveScore {
  _id: string;
  fixtureId: string;
  teamAName?: string;
  teamBName?: string;
  teamAScore?: number;
  teamBScore?: number;
  currentStatus?: string;
  updatedAt?: string;
}

export interface MongoLiveFeed {
  _id: string;
  fixtureId?: MongoRefName | string;
  message: string;
  type?: string;
  createdAt?: string;
}

export interface MongoTeam {
  _id: string;
  teamName: string;
  department?: string;
  sportId?: MongoRefName | string;
  captainName?: string;
  status?: "pending" | "approved" | "rejected";
  createdAt?: string;
}

export function getPublicFixtures() {
  return publicApiFetch<MongoFixture>("/public/fixtures");
}

export function getPublicLiveScores() {
  return publicApiFetch<MongoLiveScore>("/public/live-scores");
}

export function getPublicLiveFeeds() {
  return publicApiFetch<MongoLiveFeed>("/public/live-feeds");
}

export function getPublicTeams() {
  return publicApiFetch<MongoTeam>("/public/teams");
}
<<<<<<< HEAD
=======

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

export function getPublicRules() {
  return publicApiFetch<MongoRule>("/public/rules");
}

export function getPublicGallery() {
  return publicApiFetch<MongoGalleryImage>("/public/gallery");
}

export function createCoordinatorRule(payload: {
  sport: string;
  sportName: string;
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

export function getCoordinatorFixtures() {
  return apiFetch<AdminFixturePayload[]>("/coordinator/fixtures");
}

export function getCoordinatorPointsTable() {
  return apiFetch<CoordinatorPointsTablePayload[]>("/coordinator/points-table");
}

export function getCoordinatorAnnouncements() {
  return apiFetch<MongoAnnouncement[]>("/coordinator/announcements");
}

export function assignCoordinatorFixtureVolunteer(fixtureId: string, volunteerId: string) {
  return apiFetch<{ id: string; assignedVolunteer: string }>(`/coordinator/fixtures/${encodeURIComponent(fixtureId)}/volunteer`, {
    method: "PATCH",
    body: JSON.stringify({ volunteerId }),
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
  name: string;
  location?: string;
  sportType?: string;
}

export function getAdminVenues() {
  return apiFetch<VenuePayload[]>("/admin/venues");
}

export function createAdminVenue(payload: { name: string; location?: string; sportType?: string }) {
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

export function getTeamApprovedRegistrations() {
  return apiFetch<TeamRegistrationPayload[]>("/registrations/approved");
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

export async function downloadApprovedRegistrationsExcel() {
  const { blob, contentDisposition, contentType } = await apiDownload("/registrations/export-excel");
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
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)
