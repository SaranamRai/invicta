"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { BookOpen, Calendar, ClipboardList, FileUp, LogOut, Send, ShieldCheck, Trophy, UsersRound } from "lucide-react";

import { ProtectedRoute } from "@/components/protected-route";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
<<<<<<< HEAD
import { db, storage } from "@/lib/firebase";
=======
import { InvictaLogo } from "@/components/invicta-logo";
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)
import { Team } from "@/lib/fixture-generator";
import { clearPortalSession, getRoleAccount, RoleAccount } from "@/lib/role-auth";
import { sports } from "@/lib/mock-data";

function CoordinatorDashboardContent() {
  const router = useRouter();
  const [account] = useState<RoleAccount | null>(() => getRoleAccount());
  const [teams, setTeams] = useState<Team[]>([]);
  const [ruleSport, setRuleSport] = useState("football");
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleAttachment, setRuleAttachment] = useState<File | null>(null);
  const [isPublishingRule, setIsPublishingRule] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "teams"), (snapshot) => {
      setTeams(snapshot.docs.map((teamDoc) => ({ id: teamDoc.id, ...teamDoc.data() } as Team)));
    });

    return () => unsubscribe();
  }, []);

  const assignedTeams = useMemo(() => {
    const department = account?.department?.trim().toLowerCase();
    const assignedSport = account?.assignedSport?.trim().toLowerCase();

    return teams.filter((team) => {
      const matchesDepartment = !department || team.department?.trim().toLowerCase() === department || team.name.trim().toLowerCase() === department;
      const matchesSport = !assignedSport || team.sport.trim().toLowerCase() === assignedSport;
      return matchesDepartment && matchesSport;
    });
  }, [account, teams]);

  const totalPlayers = assignedTeams.reduce((sum, team) => sum + (team.members?.length || 0), 0);

  const handleSignOut = async () => {
    clearPortalSession();
    router.replace("/login");
  };

  const handlePublishRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = ruleTitle.trim();
    const description = ruleDescription.trim();
    const selectedSport = sports.find((sport) => sport.id === ruleSport);

    if (!title || !description || !selectedSport) {
      return;
    }

    setIsPublishingRule(true);

    try {
      const timestamp = Date.now();
      let attachment:
        | {
            attachmentUrl: string;
            attachmentName: string;
            attachmentType: string;
            attachmentKind: "document" | "image";
          }
        | Record<string, never> = {};

      if (ruleAttachment) {
        const extension = ruleAttachment.name.split(".").pop() || "file";
        const storageRef = ref(storage, `rules/${selectedSport.id}/${timestamp}.${extension}`);
        const snapshot = await uploadBytes(storageRef, ruleAttachment);
        const attachmentUrl = await getDownloadURL(snapshot.ref);

        attachment = {
          attachmentUrl,
          attachmentName: ruleAttachment.name,
          attachmentType: ruleAttachment.type || "application/octet-stream",
          attachmentKind: ruleAttachment.type.startsWith("image/") ? "image" : "document",
        };
      }

      await addDoc(collection(db, "rules"), {
        title,
        description,
        sport: selectedSport.id,
        sportName: selectedSport.name,
        createdAt: timestamp,
        createdBy: account?.name || "Coordinator",
        createdByEmail: account?.email || "",
        ...attachment,
      });

      await addDoc(collection(db, "notifications"), {
        title: `${selectedSport.name} Rules Published`,
        message: `${account?.name || "Coordinator"} added rules for ${selectedSport.name}.`,
        timestamp,
        type: "info",
        href: "/rules",
      });

      setRuleTitle("");
      setRuleDescription("");
      setRuleAttachment(null);
      event.currentTarget.reset();
    } finally {
      setIsPublishingRule(false);
    }
  };

  return (
    <div className="dashboard-surface min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
<<<<<<< HEAD
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-44 items-center overflow-hidden">
              <img src="/msu-logo-transparent.png" alt="Medhavi Skills University" className="h-auto w-full object-contain" />
            </div>
            <div>
              <h1 className="sport-heading text-2xl font-black">Coordinator Dashboard</h1>
              <p className="max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
=======
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <InvictaLogo className="h-12 w-44 shrink-0 sm:h-14 sm:w-52" />
            <div className="min-w-0">
              <h1 className="sport-heading text-lg font-black sm:text-2xl">Coordinator Dashboard</h1>
              <p className="max-w-2xl text-xs font-semibold leading-relaxed text-muted-foreground sm:text-sm">
>>>>>>> d5c6ec3 (Fix Excel download and dashboard updates)
                Manage your assigned department or sport teams, review fixtures, and prepare team details for admin approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-accent">
                <ShieldCheck size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Assigned Role</span>
              </div>
              <h2 className="sport-heading text-2xl font-black">{account?.name || "Coordinator"}</h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Department: {account?.department || "All assigned departments"} / Sport: {account?.assignedSport || "All assigned sports"}
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-xs font-black uppercase tracking-widest text-accent-foreground"
            >
              <ClipboardList size={16} />
              Add Department Team
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon={Trophy} label="Assigned Teams" value={assignedTeams.length} />
          <StatCard icon={UsersRound} label="Players Listed" value={totalPlayers} />
          <StatCard icon={Calendar} label="Sports Available" value={sports.length} />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-0">
            <div className="border-b border-border p-5">
              <h2 className="sport-heading text-xl font-black">Assigned Teams</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Teams matching your assigned department or sport appear here.</p>
            </div>
            <div className="divide-y divide-border">
              {assignedTeams.length > 0 ? assignedTeams.map((team) => (
                <div key={team.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-black uppercase tracking-wide text-foreground">{team.name}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {sports.find((sport) => sport.id === team.sport)?.name || team.sport} / {team.department || "Department"}
                    </p>
                  </div>
                  <span className="w-fit rounded-xl bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {team.members?.length || 0} players
                  </span>
                </div>
              )) : (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-muted-foreground">No teams found for your assignment yet.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="sport-heading text-xl font-black">Coordinator Tasks</h2>
            <div className="mt-4 space-y-3">
              <TaskLink href="/register" label="Submit or update team list" />
              <TaskLink href="/matches" label="View fixtures and match timing" />
              <TaskLink href="/sports" label="Review teams by sport" />
              <TaskLink href="/standings" label="Check approval impact on standings" />
            </div>
          </Card>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <BookOpen size={21} />
            </div>
            <div>
              <h2 className="sport-heading text-xl font-black">Publish Sport Rules</h2>
              <p className="text-sm font-medium text-muted-foreground">
                Add rules for a sport. Admins and public visitors will see them in the Rules section.
              </p>
            </div>
          </div>

          <form onSubmit={handlePublishRule} className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sport</label>
              <select
                value={ruleSport}
                onChange={(event) => setRuleSport(event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
              >
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>{sport.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rule Title</label>
              <input
                type="text"
                value={ruleTitle}
                onChange={(event) => setRuleTitle(event.target.value)}
                placeholder="Example: Match format and scoring"
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-bold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rules</label>
              <textarea
                value={ruleDescription}
                onChange={(event) => setRuleDescription(event.target.value)}
                placeholder="Write eligibility, scoring, duration, substitutions, penalties, or any sport-specific instructions."
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attachment</label>
              <label className="flex min-h-16 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-border bg-background px-4 py-3 transition-colors hover:border-accent sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="flex min-w-0 items-center gap-3">
                  <FileUp size={20} className="shrink-0 text-accent" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {ruleAttachment?.name || "Attach Word, PDF, JPG, or PNG"}
                    </span>
                    <span className="block text-xs font-medium text-muted-foreground">
                      Accepted: .doc, .docx, .pdf, .jpg, .jpeg, .png
                    </span>
                  </span>
                </span>
                <span className="mt-3 w-fit rounded-lg bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:mt-0">
                  Choose File
                </span>
                <input
                  type="file"
                  accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/jpeg,image/png"
                  onChange={(event) => setRuleAttachment(event.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={isPublishingRule || !ruleTitle.trim() || !ruleDescription.trim()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-xs font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} />
                {isPublishingRule ? "Publishing..." : "Publish Rule"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Icon size={22} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="text-3xl font-black text-foreground">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function TaskLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-bold text-foreground transition-colors hover:border-accent hover:text-accent">
      {label}
    </Link>
  );
}

export default function CoordinatorDashboardPage() {
  return (
    <ProtectedRoute allowedRole="coordinator">
      <CoordinatorDashboardContent />
    </ProtectedRoute>
  );
}
