"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthSession, getCurrentRoleSession, getStoredSession, storeSession } from "@/lib/api";
import { canAccessRole, PortalRole, roleHomePath } from "@/lib/role-auth";

interface ProtectedRouteProps {
  allowedRole: PortalRole | PortalRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const router = useRouter();
  const [account, setAccount] = useState<AuthSession | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  const hasAccess = account ? allowedRoles.some(role => canAccessRole(account.role, role)) : false;

  useEffect(() => {
    const readSession = () => {
      const storedSession = getStoredSession();
      if (storedSession) {
        setAccount(storedSession);
        setHasCheckedSession(true);
        return;
      }

      void getCurrentRoleSession()
        .then((serverSession) => {
          storeSession(serverSession);
          setAccount(serverSession);
        })
        .catch(() => {
          setAccount(null);
        })
        .finally(() => {
          setHasCheckedSession(true);
        });
    };

    readSession();
    window.addEventListener("storage", readSession);
    window.addEventListener("sports-auth-session-change", readSession);

    return () => {
      window.removeEventListener("storage", readSession);
      window.removeEventListener("sports-auth-session-change", readSession);
    };
  }, []);

  useEffect(() => {
    if (hasCheckedSession && !account) {
      router.replace("/login");
    }
  }, [account, hasCheckedSession, router]);

  if (!hasCheckedSession || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
          <p className="text-sm font-semibold text-muted-foreground">Checking portal session...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <ShieldAlert size={28} />
          </div>
          <h1 className="sport-heading text-2xl font-black">Access Denied</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
            This account is not allowed to open this dashboard.
          </p>
          <button
            type="button"
            onClick={() => router.replace(roleHomePath[account.role])}
            className="mt-6 rounded-xl bg-accent px-5 py-3 text-xs font-black uppercase tracking-widest text-accent-foreground"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
