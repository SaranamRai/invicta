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
