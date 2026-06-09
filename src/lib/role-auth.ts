import { AuthSession, clearSession, getStoredSession, storeSession } from "@/lib/api";

export type PortalRole = "admin" | "volunteer" | "coordinator";

export const ROLE_COLLECTION = "roleAccounts";

export interface RoleAccount {
  id: string;
  name: string;
  email: string;
  role: PortalRole;
  department?: string;
  assignedSport?: string;
}

export const roleHomePath: Record<PortalRole, string> = {
  admin: "/admin-dashboard",
  volunteer: "/volunteer-dashboard",
  coordinator: "/coordinator-dashboard",
};

export function getRoleAccount(): RoleAccount | null {
  const session = getStoredSession();
  if (!session) return null;

  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    department: session.department,
    assignedSport: session.assignedSport,
  };
}

export function storePortalSession(session: AuthSession) {
  storeSession(session);
}

export function clearPortalSession() {
  clearSession();
}

export function canAccessRole(accountRole: PortalRole, requiredRole: PortalRole) {
  return accountRole === requiredRole;
}
