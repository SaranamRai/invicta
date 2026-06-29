"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  LogOut,
  Mail,
  RefreshCw,
  Server,
  Shield,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { InvictaLogo } from "@/components/invicta-logo";
import { MedhaviLogo } from "@/components/medhavi-logo";
import { ProtectedRoute } from "@/components/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppToast } from "@/components/ui/app-toast";
import {
  getTechnicalAdminApiLogs,
  getTechnicalAdminAuditLogs,
  getTechnicalAdminDatabaseStatus,
  getTechnicalAdminEmailStatus,
  getTechnicalAdminErrorLogs,
  getTechnicalAdminHealth,
  getTechnicalAdminLiveMonitoring,
  getTechnicalAdminStats,
  resetTechnicalAdminUserPassword,
  TechnicalAdminHealth,
  TechnicalAdminStats,
  TechnicalApiLog,
  TechnicalAuditLog,
  TechnicalCollectionStatus,
  TechnicalDatabaseStatus,
  TechnicalEmailStatus,
  TechnicalErrorLog,
  TechnicalLiveMatch,
  testTechnicalAdminMongoDb,
  testTechnicalAdminSmtp,
  updateTechnicalAdminUserStatus,
} from "@/lib/api";
import { logoutPortalSession } from "@/lib/role-auth";

type ToastState = { message: string; variant: "success" | "error" | "info" };
type AdminTab = "overview" | "database" | "users" | "monitoring" | "logs";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "database", label: "Database" },
  { id: "users", label: "Users" },
  { id: "monitoring", label: "Live Monitoring" },
  { id: "logs", label: "Logs" },
];

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function formatUptime(seconds = 0) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`}>{children}</div>;
}

function MetricCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: typeof Activity }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
        </div>
        <span className="rounded-xl bg-accent/10 p-2 text-accent">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {sub ? <p className="mt-2 text-xs font-semibold text-muted-foreground">{sub}</p> : null}
    </Panel>
  );
}

function DataTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-border bg-card">{children}</div>;
}

function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [health, setHealth] = useState<TechnicalAdminHealth | null>(null);
  const [stats, setStats] = useState<TechnicalAdminStats | null>(null);
  const [database, setDatabase] = useState<TechnicalDatabaseStatus | null>(null);
  const [email, setEmail] = useState<TechnicalEmailStatus | null>(null);
  const [apiLogs, setApiLogs] = useState<TechnicalApiLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<TechnicalErrorLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<TechnicalAuditLog[]>([]);
  const [matches, setMatches] = useState<TechnicalLiveMatch[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [healthData, statsData, databaseData, emailData, apiData, errorData, auditData, liveData] = await Promise.all([
        getTechnicalAdminHealth(),
        getTechnicalAdminStats(),
        getTechnicalAdminDatabaseStatus(),
        getTechnicalAdminEmailStatus(),
        getTechnicalAdminApiLogs({ limit: "80" }),
        getTechnicalAdminErrorLogs({ limit: "80" }),
        getTechnicalAdminAuditLogs({ limit: "80" }),
        getTechnicalAdminLiveMonitoring(),
      ]);
      setHealth(healthData);
      setStats(statsData);
      setDatabase(databaseData);
      setEmail(emailData);
      setApiLogs(apiData.logs);
      setErrorLogs(errorData.logs);
      setAuditLogs(auditData.logs);
      setMatches(liveData.matches);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Could not load admin dashboard.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  const filteredUsers = useMemo(() => {
    const users = stats?.users || [];
    return roleFilter === "all" ? users : users.filter((user) => user.role === roleFilter);
  }, [roleFilter, stats?.users]);

  const warningMatches = matches.filter((match) => match.warnings.length > 0);

  async function runAction(label: string, action: () => Promise<{ message?: string } | unknown>) {
    setActionBusy(label);
    try {
      const result = await action();
      const message = typeof result === "object" && result && "message" in result ? String(result.message) : `${label} completed.`;
      setToast({ message, variant: "success" });
      await loadDashboard();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : `${label} failed.`, variant: "error" });
    } finally {
      setActionBusy("");
    }
  }

  async function handleLogout() {
    await logoutPortalSession();
    router.replace("/login");
  }

  return (
    <div className="dashboard-surface min-h-screen bg-background pb-12 text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
            <MedhaviLogo className="h-11 w-44 shrink-0 sm:h-14 sm:w-56" />
            <InvictaLogo className="h-12 w-44 shrink-0 sm:h-16 sm:w-56" />
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="sport-heading text-lg font-black sm:text-3xl">INVICTA ADMIN DASHBOARD</h1>
              <p className="max-w-2xl text-xs font-semibold leading-relaxed text-muted-foreground sm:text-sm">
                Technical monitoring for deployment health, API activity, database status, user access, email delivery, and live score warnings.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:border-accent hover:text-accent"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="mx-auto flex w-full max-w-7xl gap-0.5 overflow-x-auto px-3 sm:gap-1 sm:px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[10px] font-black uppercase tracking-[0.08em] transition-all sm:px-6 sm:py-4 sm:text-sm ${
                  activeTab === tab.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="Environment" value={health?.environment || "-"} sub={`Version ${health?.appVersion || "-"}`} icon={Server} />
              <MetricCard label="Uptime" value={formatUptime(health?.uptimeSeconds || 0)} sub={formatDate(health?.checkedAt)} icon={Activity} />
              <MetricCard label="Requests Today" value={stats?.api.requestsToday || 0} sub={`${stats?.api.failedToday || 0} failed`} icon={Shield} />
              <MetricCard label="Avg Response" value={`${stats?.api.averageResponseTimeMs || 0}ms`} sub={`${stats?.api.serverErrorsToday || 0} server errors`} icon={Activity} />
              <MetricCard label="Emails Sent" value={email?.sent || 0} sub={`${email?.failed || 0} failed`} icon={Mail} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">MongoDB</p>
                    <p className="mt-2 text-lg font-black">{health?.database.name || "Database"}</p>
                  </div>
                  <StatusBadge ok={Boolean(health?.database.connected)} label={health?.database.connected ? "Connected" : "Offline"} />
                </div>
                <p className="mt-3 text-sm font-semibold text-muted-foreground">{health?.database.host || "Host not reported"}</p>
              </Panel>
              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">SMTP</p>
                    <p className="mt-2 text-lg font-black">{email?.provider || "Mail Provider"}</p>
                  </div>
                  <StatusBadge ok={Boolean(email?.healthy)} label={email?.healthy ? "Verified" : "Needs Check"} />
                </div>
                <p className="mt-3 text-sm font-semibold text-muted-foreground">{email?.message || "No SMTP status"}</p>
              </Panel>
              <Panel>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Live Scores</p>
                    <p className="mt-2 text-lg font-black">{matches.length} monitored matches</p>
                  </div>
                  <StatusBadge ok={!warningMatches.length} label={warningMatches.length ? "Warnings" : "Healthy"} />
                </div>
                <p className="mt-3 text-sm font-semibold text-muted-foreground">{warningMatches.length ? `${warningMatches.length} match warnings need review.` : "No live scoring warnings."}</p>
              </Panel>
            </div>

            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">Developer Tools</h2>
                  <p className="text-sm font-semibold text-muted-foreground">Run safe checks or export a health snapshot.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={Boolean(actionBusy)} onClick={() => void runAction("MongoDB test", testTechnicalAdminMongoDb)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-wider hover:border-accent hover:text-accent">
                    <Database className="h-4 w-4" /> Test MongoDB
                  </button>
                  <button type="button" disabled={Boolean(actionBusy)} onClick={() => void runAction("SMTP test", testTechnicalAdminSmtp)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-wider hover:border-accent hover:text-accent">
                    <Mail className="h-4 w-4" /> Test SMTP
                  </button>
                  <button type="button" onClick={() => downloadJson("invicta-health-report.json", { health, stats, database, email, matches })} className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-xs font-black uppercase tracking-wider text-accent-foreground hover:bg-accent/90">
                    <Download className="h-4 w-4" /> Export
                  </button>
                </div>
              </div>
            </Panel>
          </div>
        ) : null}

        {activeTab === "database" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(database?.collections || []).map((item: TechnicalCollectionStatus) => (
                <MetricCard key={item.key} label={item.collection} value={item.count} sub={item.key} icon={Database} />
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "users" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">System Users</h2>
                <p className="text-sm font-semibold text-muted-foreground">Activate, deactivate, or reset role account passwords.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "admin", "supercoordinator", "coordinator", "volunteer"].map((role) => (
                  <button key={role} type="button" onClick={() => setRoleFilter(role)} className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider ${roleFilter === role ? "bg-accent text-accent-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <DataTable>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">Actions</th></tr>
                </thead>
                <tbody>{filteredUsers.map((user) => (
                  <tr key={`${user.role}-${user.id}`} className="border-t border-border">
                    <td className="px-4 py-3"><p className="font-black">{user.name}</p><p className="text-xs font-semibold text-muted-foreground">{user.email}</p></td>
                    <td className="px-4 py-3 font-semibold">{user.role}</td>
                    <td className="px-4 py-3"><StatusBadge ok={user.status === "active"} label={user.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{user.assignedSport || user.department || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void runAction("Status update", () => updateTechnicalAdminUserStatus(user.role, user.id, user.status === "active" ? "inactive" : "active"))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:border-accent hover:text-accent">
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" onClick={() => void runAction("Password reset", () => resetTechnicalAdminUserPassword(user.role, user.id))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:border-accent hover:text-accent">
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </DataTable>
          </div>
        ) : null}

        {activeTab === "monitoring" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {matches.map((match) => (
              <Panel key={match.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{match.matchTitle}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{match.sport} {match.category ? `- ${match.category}` : ""}</p>
                  </div>
                  <StatusBadge ok={!match.warnings.length} label={match.status} />
                </div>
                <p className="mt-3 text-sm font-black">{match.teamAName || "Team A"} {match.scoreA} - {match.scoreB} {match.teamBName || "Team B"}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">Last update: {formatDate(match.lastScoreUpdate)}</p>
                {match.warnings.length ? <p className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-600"><AlertTriangle className="h-4 w-4" /> {match.warnings.join(", ")}</p> : null}
              </Panel>
            ))}
            {!matches.length ? <Panel><p className="text-sm font-semibold text-muted-foreground">No live or recently completed matches found.</p></Panel> : null}
          </div>
        ) : null}

        {activeTab === "logs" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Logs</h2>
                <p className="text-sm font-semibold text-muted-foreground">Recent API, error, and audit activity.</p>
              </div>
              <button type="button" onClick={() => downloadJson("invicta-error-audit-logs.json", { errorLogs, auditLogs, apiLogs })} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-black uppercase tracking-wider hover:border-accent hover:text-accent">
                <Download className="h-4 w-4" /> Download Logs
              </button>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <DataTable>
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-muted uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-2">API</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Time</th></tr></thead>
                  <tbody>{apiLogs.slice(0, 24).map((log) => <tr key={log._id} className="border-t border-border"><td className="px-3 py-2 font-semibold">{log.method} {log.route}</td><td className="px-3 py-2">{log.statusCode}</td><td className="px-3 py-2">{log.responseTimeMs}ms</td></tr>)}</tbody>
                </table>
              </DataTable>
              <DataTable>
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-muted uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-2">Error</th><th className="px-3 py-2">Route</th><th className="px-3 py-2">When</th></tr></thead>
                  <tbody>{errorLogs.slice(0, 24).map((log) => <tr key={log._id} className="border-t border-border"><td className="px-3 py-2 font-semibold">{log.message || log.errorType}</td><td className="px-3 py-2">{log.route}</td><td className="px-3 py-2">{formatDate(log.createdAt)}</td></tr>)}</tbody>
                </table>
              </DataTable>
              <DataTable>
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-muted uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-2">Action</th><th className="px-3 py-2">By</th><th className="px-3 py-2">When</th></tr></thead>
                  <tbody>{auditLogs.slice(0, 24).map((log) => <tr key={log._id} className="border-t border-border"><td className="px-3 py-2 font-semibold">{log.action}</td><td className="px-3 py-2">{log.performedBy || "-"}</td><td className="px-3 py-2">{formatDate(log.createdAt)}</td></tr>)}</tbody>
                </table>
              </DataTable>
            </div>
          </div>
        ) : null}
      </main>

      {loading ? <div className="fixed bottom-5 left-5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-black text-foreground shadow-xl">Loading dashboard...</div> : null}
      {toast ? <AppToast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  );
}
