import { clearPortalSession, PortalRole } from "@/lib/role-auth";

// Admin credentials - hardcoded for demonstration
// In production, this should be properly hashed and stored in a database
export const ADMIN_CREDENTIALS = {
  email: "admin@gmail.com",
  password: "1234"
};

export function validateAdminCredentials(email: string, password: string): boolean {
  return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password;
}

export const ADMIN_AUTH_KEY = "adminAuth";
const ADMIN_AUTH_EVENT = "admin-auth-change";
export const PORTAL_ROLE_KEY = "portalRole";

function setCookie(key: string, value: string) {
  document.cookie = `${key}=${value}; path=/; max-age=2592000; SameSite=Lax`;
}

function removeCookie(key: string) {
  document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
}

function getCookie(key: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${key}=`))
    ?.split("=")[1];
}

function setStoredValue(key: string, value: string) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Cookies below are the refresh-safe fallback when local storage is unavailable.
  }

  setCookie(key, value);
}

function removeStoredValue(key: string) {
  try {
    window.localStorage?.removeItem(key);
    window.sessionStorage?.removeItem(key);
  } catch {
    // Ignore storage failures; cookies are cleared below.
  }

  removeCookie(key);
}

function getStoredValue(key: string) {
  try {
    return window.localStorage?.getItem(key) || getCookie(key) || null;
  } catch {
    return getCookie(key) || null;
  }
}

// Store admin auth persistently so refreshes do not kick an active admin back to login.
export function setAdminAuth(isAuthenticated: boolean) {
  if (typeof window !== "undefined") {
    if (isAuthenticated) {
      setStoredValue(ADMIN_AUTH_KEY, "true");
      setPortalRole("admin");
    } else {
      removeStoredValue(ADMIN_AUTH_KEY);
    }
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
  }
}

export function setPortalRole(role: PortalRole) {
  if (typeof window !== "undefined") {
    setStoredValue(PORTAL_ROLE_KEY, role);
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
  }
}

export function getPortalRole(): PortalRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const role = getStoredValue(PORTAL_ROLE_KEY);
  return role === "admin" || role === "supercoordinator" || role === "volunteer" || role === "coordinator" ? role : null;
}

export function clearPortalAuth() {
  if (typeof window !== "undefined") {
    removeStoredValue(ADMIN_AUTH_KEY);
    removeStoredValue(PORTAL_ROLE_KEY);
    clearPortalSession();
    window.dispatchEvent(new Event(ADMIN_AUTH_EVENT));
  }
}

export function getAdminAuth(): boolean {
  if (typeof window !== "undefined") {
    if (getStoredValue(ADMIN_AUTH_KEY) === "true") {
      return true;
    }

    if (window.sessionStorage?.getItem(ADMIN_AUTH_KEY) === "true") {
      setStoredValue(ADMIN_AUTH_KEY, "true");
      window.sessionStorage.removeItem(ADMIN_AUTH_KEY);
      return true;
    }
  }
  return false;
}

export function subscribeToAdminAuth(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(ADMIN_AUTH_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ADMIN_AUTH_EVENT, callback);
  };
}
