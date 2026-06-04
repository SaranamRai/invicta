"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthSession, getStoredSession } from "@/lib/api";
import { canAccessRole, PortalRole, roleHomePath } from "@/lib/role-auth";

interface ProtectedRouteProps {
  allowedRole: PortalRole;
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const router = useRouter();
  const [account, setAccount] = useState<AuthSession | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const hasAccess = account ? canAccessRole(account.role, allowedRole) : false;

  useEffect(() => {
    const readSession = () => {
      setAccount(getStoredSession());
      setHasCheckedSession(true);
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
    return null;
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
