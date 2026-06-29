"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Mail,
  RefreshCw,
  Server,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProtectedRoute } from "@/components/protected-route";
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

type ToastState = { message: string; variant: "success" | "error" | "info" };

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString();
}

function formatUptime(seconds = 0) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
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
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function Section({ title, icon: Icon, children, action }: { title: string; icon: typeof Activity; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
            <Icon className="h-5 w-5 text-slate-600" />
            {title}
          </h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {sub ? <p className="mt-1 text-xs font-semibold text-slate-500">{sub}</p> : null}
    </div>
  );
}

function DataTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">{children}</div>;
}

function AdminDashboard() {
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">INVICTA Technical Admin</p>
            <h1 className="text-2xl font-black">Admin Dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => downloadJson("invicta-health-report.json", { health, stats, database, email, matches })}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </header>

      <Section title="System Health" icon={Server}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Environment" value={health?.environment || "-"} sub={`Version ${health?.appVersion || "-"}`} />
          <MetricCard label="Uptime" value={formatUptime(health?.uptimeSeconds || 0)} sub={formatDate(health?.checkedAt)} />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">MongoDB</p>
            <div className="mt-3"><StatusBadge ok={Boolean(health?.database.connected)} label={health?.database.connected ? "Connected" : "Offline"} /></div>
            <p className="mt-2 text-xs font-semibold text-slate-500">{health?.database.name || "No database"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">SMTP</p>
            <div className="mt-3"><StatusBadge ok={Boolean(email?.healthy)} label={email?.healthy ? "Verified" : "Needs check"} /></div>
            <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">{email?.message || "No SMTP status"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">Live Scores</p>
            <div className="mt-3"><StatusBadge ok={!warningMatches.length} label={warningMatches.length ? "Warnings" : "Healthy"} /></div>
            <p className="mt-2 text-xs font-semibold text-slate-500">{matches.length} monitored matches</p>
          </div>
        </div>
      </Section>

      <Section
        title="Backend And Email Tools"
        icon={Activity}
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(actionBusy)} onClick={() => void runAction("MongoDB test", testTechnicalAdminMongoDb)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50">
              <Database className="h-4 w-4" />
              Test MongoDB
            </button>
            <button type="button" disabled={Boolean(actionBusy)} onClick={() => void runAction("SMTP test", testTechnicalAdminSmtp)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50">
              <Mail className="h-4 w-4" />
              Test SMTP
            </button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <MetricCard label="Requests Today" value={stats?.api.requestsToday || 0} />
          <MetricCard label="Failed Today" value={stats?.api.failedToday || 0} />
          <MetricCard label="Avg Response" value={`${stats?.api.averageResponseTimeMs || 0}ms`} />
          <MetricCard label="404" value={stats?.api.notFoundToday || 0} />
          <MetricCard label="500" value={stats?.api.serverErrorsToday || 0} />
          <MetricCard label="Emails Sent" value={email?.sent || 0} sub={`${email?.failed || 0} failed`} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <DataTable>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Route</th><th className="px-4 py-3">Hits</th><th className="px-4 py-3">Avg</th></tr>
              </thead>
              <tbody>{(stats?.api.mostUsedRoutes || []).map((route) => (
                <tr key={route.route} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold">{route.route}</td><td className="px-4 py-3">{route.count}</td><td className="px-4 py-3">{route.avgResponseTimeMs}ms</td>
                </tr>
              ))}</tbody>
            </table>
          </DataTable>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-black">Latest API Error</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">{stats?.api.lastError?.message || "No API errors recorded."}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{stats?.api.lastError?.route || ""}</p>
          </div>
        </div>
      </Section>

      <Section title="MongoDB Collections" icon={Database}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(database?.collections || []).map((item: TechnicalCollectionStatus) => (
            <MetricCard key={item.key} label={item.collection} value={item.count} sub={item.key} />
          ))}
        </div>
      </Section>

      <Section title="System Users" icon={Users}>
        <div className="mb-3 flex flex-wrap gap-2">
          {["all", "admin", "supercoordinator", "coordinator", "volunteer"].map((role) => (
            <button key={role} type="button" onClick={() => setRoleFilter(role)} className={`rounded-lg px-3 py-2 text-xs font-bold ${roleFilter === role ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
              {role}
            </button>
          ))}
        </div>
        <DataTable>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assigned</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>{filteredUsers.map((user) => (
              <tr key={`${user.role}-${user.id}`} className="border-t border-slate-100">
                <td className="px-4 py-3"><p className="font-bold">{user.name}</p><p className="text-xs font-semibold text-slate-500">{user.email}</p></td>
                <td className="px-4 py-3 font-semibold">{user.role}</td>
                <td className="px-4 py-3"><StatusBadge ok={user.status === "active"} label={user.status} /></td>
                <td className="px-4 py-3 text-slate-600">{user.assignedSport || user.department || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void runAction("Status update", () => updateTechnicalAdminUserStatus(user.role, user.id, user.status === "active" ? "inactive" : "active"))} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-50">
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button type="button" onClick={() => void runAction("Password reset", () => resetTechnicalAdminUserPassword(user.role, user.id))} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-50">
                      Reset Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </DataTable>
      </Section>

      <Section title="Live Match Monitoring" icon={Shield}>
        <div className="grid gap-3 lg:grid-cols-2">
          {matches.map((match) => (
            <div key={match.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{match.matchTitle}</p>
                  <p className="text-xs font-semibold text-slate-500">{match.sport} {match.category ? `- ${match.category}` : ""}</p>
                </div>
                <StatusBadge ok={!match.warnings.length} label={match.status} />
              </div>
              <p className="mt-3 text-sm font-bold">{match.teamAName || "Team A"} {match.scoreA} - {match.scoreB} {match.teamBName || "Team B"}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Last update: {formatDate(match.lastScoreUpdate)}</p>
              {match.warnings.length ? <p className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-700"><AlertTriangle className="h-4 w-4" /> {match.warnings.join(", ")}</p> : null}
            </div>
          ))}
          {!matches.length ? <p className="text-sm font-semibold text-slate-500">No live or recently completed matches found.</p> : null}
        </div>
      </Section>

      <Section title="Logs" icon={AlertTriangle} action={<button type="button" onClick={() => downloadJson("invicta-error-audit-logs.json", { errorLogs, auditLogs, apiLogs })} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50"><Download className="h-4 w-4" />Download Logs</button>}>
        <div className="grid gap-4 xl:grid-cols-3">
          <DataTable>
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-3 py-2">API</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Time</th></tr></thead>
              <tbody>{apiLogs.slice(0, 20).map((log) => <tr key={log._id} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold">{log.method} {log.route}</td><td className="px-3 py-2">{log.statusCode}</td><td className="px-3 py-2">{log.responseTimeMs}ms</td></tr>)}</tbody>
            </table>
          </DataTable>
          <DataTable>
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-3 py-2">Error</th><th className="px-3 py-2">Route</th><th className="px-3 py-2">When</th></tr></thead>
              <tbody>{errorLogs.slice(0, 20).map((log) => <tr key={log._id} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold">{log.message || log.errorType}</td><td className="px-3 py-2">{log.route}</td><td className="px-3 py-2">{formatDate(log.createdAt)}</td></tr>)}</tbody>
            </table>
          </DataTable>
          <DataTable>
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="px-3 py-2">Action</th><th className="px-3 py-2">By</th><th className="px-3 py-2">When</th></tr></thead>
              <tbody>{auditLogs.slice(0, 20).map((log) => <tr key={log._id} className="border-t border-slate-100"><td className="px-3 py-2 font-semibold">{log.action}</td><td className="px-3 py-2">{log.performedBy || "-"}</td><td className="px-3 py-2">{formatDate(log.createdAt)}</td></tr>)}</tbody>
            </table>
          </DataTable>
        </div>
      </Section>

      {loading ? <div className="fixed bottom-5 left-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold shadow-lg">Loading dashboard...</div> : null}
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
