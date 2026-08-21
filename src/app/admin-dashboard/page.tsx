"use client";

import {
  Activity,
  AlertTriangle,
  Database,
  LogOut,
  Mail,
  RefreshCw,
  Server,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AdminHealthPayload,
  AdminLogPayload,
  AdminStatsPayload,
  RoleAccountPayload,
  getAdminRoleAccounts,
  getTechnicalAdminApiLogs,
  getTechnicalAdminDatabaseStatus,
  getTechnicalAdminEmailStatus,
  getTechnicalAdminErrorLogs,
  getTechnicalAdminHealth,
  getTechnicalAdminStats,
  testTechnicalAdminMongodb,
  testTechnicalAdminSmtp,
} from "@/lib/api";
import { InvictaLogo } from "@/components/invicta-logo";
import { MedhaviLogo } from "@/components/medhavi-logo";
import { ProtectedRoute } from "@/components/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { logoutPortalSession } from "@/lib/role-auth";
import { cn } from "@/lib/utils";

type DatabaseStatus = Awaited<ReturnType<typeof getTechnicalAdminDatabaseStatus>>;
type EmailStatus = Awaited<ReturnType<typeof getTechnicalAdminEmailStatus>>;
type AdminTab = "overview" | "users" | "api" | "errors" | "database";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "System Users" },
  { id: "api", label: "API Monitor" },
  { id: "errors", label: "Errors" },
  { id: "database", label: "Database" },
];

function statusTone(value?: string | boolean) {
  const ok = value === true || value === "ok" || value === "online" || value === "connected" || value === "configured";
  return ok ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-amber-200 bg-amber-50 text-amber-700";
}

function StatTile({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  helper?: string;
}) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 text-2xl font-black text-foreground">{value}</div>
      {helper && <p className="mt-2 text-xs font-semibold text-muted-foreground">{helper}</p>}
    </Card>
  );
}

function LogTable({ title, rows }: { title: string; rows: AdminLogPayload[] }) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-foreground">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2">Time</th>
              <th className="py-2">Route</th>
              <th className="py-2">Status</th>
              <th className="py-2">Duration</th>
              <th className="py-2">User</th>
              <th className="py-2">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length ? rows.map((row) => (
              <tr key={row._id}>
                <td className="py-3 text-muted-foreground">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                <td className="py-3 font-semibold">{row.path || row.route || "-"}</td>
                <td className="py-3">{row.statusCode || "-"}</td>
                <td className="py-3">{typeof row.durationMs === "number" ? `${row.durationMs}ms` : "-"}</td>
                <td className="py-3 text-muted-foreground">{row.userRole || "-"} {row.userEmail ? `(${row.userEmail})` : ""}</td>
                <td className="max-w-[280px] truncate py-3 text-muted-foreground">{row.message || "-"}</td>
              </tr>
            )) : (
              <tr>
                <td className="py-8 text-center text-muted-foreground" colSpan={6}>No records yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function UsersTable({ users }: { users: RoleAccountPayload[] }) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">System Users</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Admin, super coordinator, sport coordinator, and volunteer accounts.</p>
        </div>
        <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
          {users.length} accounts
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Department</th>
              <th className="py-2">Assigned Sport</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length ? users.map((user) => (
              <tr key={`${user.role}-${user.id}-${user.email}`}>
                <td className="py-3 font-black text-foreground">{user.fullName || "Unnamed"}</td>
                <td className="py-3 font-semibold text-muted-foreground">{user.email}</td>
                <td className="py-3">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-foreground">
                    {user.role}
                  </span>
                </td>
                <td className="py-3 text-muted-foreground">{user.deptName || "-"}</td>
                <td className="py-3 text-muted-foreground">{user.assignedSportName || user.assignedSport || "-"}</td>
                <td className="py-3">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                    {user.status || "active"}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="py-8 text-center text-muted-foreground" colSpan={6}>No role accounts found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [health, setHealth] = useState<AdminHealthPayload | null>(null);
  const [stats, setStats] = useState<AdminStatsPayload | null>(null);
  const [database, setDatabase] = useState<DatabaseStatus | null>(null);
  const [email, setEmail] = useState<EmailStatus | null>(null);
  const [apiLogs, setApiLogs] = useState<AdminLogPayload[]>([]);
  const [errorLogs, setErrorLogs] = useState<AdminLogPayload[]>([]);
  const [users, setUsers] = useState<RoleAccountPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const collectionCount = useMemo(() => database?.collections?.length || 0, [database]);
  const userCount = users.length || Object.values(stats?.roleCounts || {}).reduce((total, count) => total + Number(count || 0), 0);

  function applyDashboardData(
    nextHealth: AdminHealthPayload,
    nextStats: AdminStatsPayload,
    nextDatabase: DatabaseStatus,
    nextEmail: EmailStatus,
    nextApiLogs: AdminLogPayload[],
    nextErrorLogs: AdminLogPayload[],
    nextUsers: RoleAccountPayload[]
  ) {
    setHealth(nextHealth);
    setStats(nextStats);
    setDatabase(nextDatabase);
    setEmail(nextEmail);
    setApiLogs(nextApiLogs);
    setErrorLogs(nextErrorLogs);
    setUsers(nextUsers);
  }

  async function fetchDashboardData() {
    return Promise.all([
      getTechnicalAdminHealth(),
      getTechnicalAdminStats(),
      getTechnicalAdminDatabaseStatus(),
      getTechnicalAdminEmailStatus(),
      getTechnicalAdminApiLogs(),
      getTechnicalAdminErrorLogs(),
      getAdminRoleAccounts(),
    ]);
  }

  async function refresh() {
    setIsLoading(true);
    setMessage("");
    try {
      const data = await fetchDashboardData();
      applyDashboardData(...data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load admin dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const data = await fetchDashboardData();
        if (isMounted) applyDashboardData(...data);
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Could not load admin dashboard data.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  async function runSmtpTest() {
    const result = await testTechnicalAdminSmtp();
    setMessage(result.message);
  }

  async function runMongoTest() {
    const result = await testTechnicalAdminMongodb();
    setMessage(result.ok ? `MongoDB connected to ${result.database}.` : "MongoDB connection failed.");
  }

  async function handleLogout() {
    await logoutPortalSession();
    router.replace("/login");
  }

  return (
    <div className="dashboard-surface min-h-screen bg-background pb-12 text-foreground">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
            <MedhaviLogo className="h-11 w-44 shrink-0 sm:h-14 sm:w-56" />
            <InvictaLogo className="h-12 w-44 shrink-0 sm:h-16 sm:w-56" />
            <div className="space-y-0.5 sm:space-y-1">
              <h1 className="sport-heading text-lg font-black sm:text-3xl">INVICTA TECHNICAL ADMIN</h1>
              <p className="max-w-2xl text-xs font-semibold leading-relaxed text-muted-foreground sm:text-sm">
                Monitor backend health, users, API performance, database status, SMTP, logs, and live match activity.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={refresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground transition-all hover:border-accent disabled:opacity-60 sm:px-5 sm:py-3"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white sm:px-5 sm:py-3"
            >
              <LogOut size={16} />
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
                className={cn(
                  "shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[10px] font-black uppercase tracking-[0.08em] transition-all sm:px-6 sm:py-4 sm:text-sm sm:tracking-[0.1em]",
                  activeTab === tab.id
                    ? "border-accent text-accent"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {message && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{message}</div>
        )}

        {activeTab === "overview" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile icon={<Server size={20} />} label="Backend" value={<span className={`rounded-md border px-2 py-1 text-base ${statusTone(health?.backend)}`}>{health?.backend || "loading"}</span>} helper={health?.environment || "environment"} />
              <StatTile icon={<Database size={20} />} label="MongoDB" value={<span className={`rounded-md border px-2 py-1 text-base ${statusTone(health?.mongodb)}`}>{health?.mongodb || "loading"}</span>} helper={`${collectionCount} collections`} />
              <StatTile icon={<UsersRound size={20} />} label="Users" value={userCount} helper="role accounts" />
              <StatTile icon={<Activity size={20} />} label="Uptime" value={health?.uptime || "-"} helper="server runtime" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile icon={<Activity size={20} />} label="Requests Today" value={stats?.totalRequestsToday ?? 0} />
              <StatTile icon={<AlertTriangle size={20} />} label="Failed Requests" value={stats?.failedRequestsToday ?? 0} />
              <StatTile icon={<Server size={20} />} label="Avg Response" value={`${stats?.averageResponseTimeMs ?? 0}ms`} />
              <StatTile icon={<ShieldCheck size={20} />} label="Live Matches" value={stats?.liveMatches ?? 0} />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-widest">Role Summary</h2>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
                  {Object.entries(stats?.roleCounts || {}).map(([role, count]) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => setActiveTab("users")}
                      className="rounded-xl bg-secondary p-3 text-left transition-all hover:bg-accent/15"
                    >
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">{role}</span>
                      <span className="text-2xl font-black text-foreground">{count}</span>
                    </button>
                  ))}
                </div>
              </Card>
              <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-widest">Email Status</h2>
                <p className="mt-4 text-sm font-semibold text-muted-foreground">{email?.host || "SMTP host not configured"}</p>
                <p className="mt-2 text-sm font-bold">{email?.user || "No sender account"}</p>
                <button type="button" onClick={runSmtpTest} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-[10px] font-black uppercase tracking-widest hover:border-accent">
                  <Mail size={15} />
                  Test SMTP
                </button>
              </Card>
              <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-widest">Database Status</h2>
                <p className="mt-4 text-sm font-semibold text-muted-foreground">{database?.name || "-"} on {database?.host || "-"}</p>
                <p className="mt-2 text-2xl font-black">{collectionCount} collections</p>
                <button type="button" onClick={runMongoTest} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-[10px] font-black uppercase tracking-widest hover:border-accent">
                  <Database size={15} />
                  Test MongoDB
                </button>
              </Card>
            </div>
          </>
        )}

        {activeTab === "users" && <UsersTable users={users} />}
        {activeTab === "api" && <LogTable title="Recent API Logs" rows={apiLogs} />}
        {activeTab === "errors" && <LogTable title="Recent Error Logs" rows={errorLogs} />}
        {activeTab === "database" && (
          <Card className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">MongoDB Collections</h2>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{database?.name || "Database"} on {database?.host || "unknown host"}</p>
              </div>
              <button type="button" onClick={runMongoTest} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-[10px] font-black uppercase tracking-widest hover:border-accent">
                <Database size={15} />
                Test MongoDB
              </button>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(database?.collections || []).map((collection) => (
                <div key={collection} className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-black text-foreground">
                  {collection}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRole="admin">
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
