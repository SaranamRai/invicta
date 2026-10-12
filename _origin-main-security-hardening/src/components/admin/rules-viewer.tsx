"use client";

import { useEffect, useState } from "react";
import { BookOpen, CheckCircle, ExternalLink, FileText, Mail, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getAdminRules, mapMongoRule, reviewAdminRule } from "@/lib/api";
import { sports } from "@/lib/mock-data";
import { getRoleAccount } from "@/lib/role-auth";

interface PublishedRule {
  id: string;
  title?: string;
  description?: string;
  sport?: string;
  sportName?: string;
  createdBy?: string;
  createdByEmail?: string;
  createdAt?: number;
  status?: "pending" | "approved" | "rejected";
  reviewedByName?: string;
  reviewedAt?: number;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentKind?: "document" | "image";
}

function getSportName(rule: PublishedRule) {
  return rule.sportName || sports.find((sport) => sport.id === rule.sport)?.name || rule.sport || "General";
}

function formatPublishedAt(value?: number) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RulesViewer() {
  const [rules, setRules] = useState<PublishedRule[]>([]);
  const [reviewingId, setReviewingId] = useState("");
  const [message, setMessage] = useState("");
  const account = getRoleAccount();
  const canReviewRules = account?.role === "supercoordinator";

  useEffect(() => {
    let isMounted = true;

    async function loadRules() {
      const publicRules = await getAdminRules();
      if (!isMounted) return;
      setRules(publicRules.map(mapMongoRule));
    }

    void loadRules();
    const interval = window.setInterval(loadRules, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const loadRules = async () => {
    const nextRules = await getAdminRules();
    setRules(nextRules.map(mapMongoRule));
  };

  const handleReviewRule = async (ruleId: string, status: "approved" | "rejected") => {
    setReviewingId(ruleId);
    setMessage("");
    try {
      await reviewAdminRule(ruleId, status);
      await loadRules();
      setMessage(status === "approved" ? "Rule approved and visible publicly." : "Rule rejected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not review rule.");
    } finally {
      setReviewingId("");
    }
  };

  const pendingRules = rules.filter((rule) => rule.status === "pending");
  const reviewedRules = rules.filter((rule) => rule.status !== "pending");

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-black sport-heading text-white">Sport Rule Approvals</h2>
        <p className="text-sm text-slate-400">
          Review coordinator-submitted rules. Approved rules become visible to public visitors.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm font-bold text-slate-200">
          {message}
        </div>
      )}

      <RuleSection
        title="Pending Approval"
        emptyLabel="No rules are waiting for approval."
        rules={pendingRules}
        canReviewRules={canReviewRules}
        reviewingId={reviewingId}
        onReview={handleReviewRule}
      />

      <RuleSection
        title="Reviewed Rules"
        emptyLabel="No reviewed rules yet."
        rules={reviewedRules}
        canReviewRules={false}
        reviewingId={reviewingId}
        onReview={handleReviewRule}
      />
    </div>
  );
}

function RuleSection({
  title,
  emptyLabel,
  rules,
  canReviewRules,
  reviewingId,
  onReview,
}: {
  title: string;
  emptyLabel: string;
  rules: PublishedRule[];
  canReviewRules: boolean;
  reviewingId: string;
  onReview: (ruleId: string, status: "approved" | "rejected") => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="sport-heading text-xl font-black text-white">{title}</h3>
        <span className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
          {rules.length} rule{rules.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rules.length > 0 ? rules.map((rule) => (
          <Card key={rule.id} className="bg-slate-900/60 border-white/5 text-white">
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-accent">{getSportName(rule)}</p>
                  <h3 className="mt-2 text-xl font-black text-white">{rule.title || "Sport Rule"}</h3>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span className={`w-fit rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${
                    rule.status === "pending"
                      ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                      : rule.status === "rejected"
                        ? "border-red-400/30 bg-red-500/10 text-red-300"
                        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  }`}>
                    {rule.status || "approved"}
                  </span>
                  <span className="w-fit rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {formatPublishedAt(rule.createdAt)}
                  </span>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-300">
                {rule.description || "No rule details provided."}
              </p>

              {rule.attachmentUrl && (
                <a
                  href={rule.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-accent hover:text-accent"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText size={17} className="shrink-0" />
                    <span className="truncate">{rule.attachmentName || (rule.attachmentKind === "image" ? "View image" : "View document")}</span>
                  </span>
                  <ExternalLink size={16} className="shrink-0" />
                </a>
              )}

              {(rule.createdBy || rule.createdByEmail) && (
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-xs font-bold text-slate-500">
                  <BookOpen size={14} className="text-accent" />
                  <span>{rule.createdBy || "Coordinator"}</span>
                  {rule.createdByEmail && (
                    <>
                      <Mail size={13} />
                      <span>{rule.createdByEmail}</span>
                    </>
                  )}
                </div>
              )}

              {canReviewRules && rule.status === "pending" && (
                <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => onReview(rule.id, "rejected")}
                    disabled={reviewingId === rule.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 text-[10px] font-black uppercase tracking-widest text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(rule.id, "approved")}
                    disabled={reviewingId === rule.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[10px] font-black uppercase tracking-widest text-accent-foreground transition-all hover:scale-[1.01] disabled:opacity-50"
                  >
                    <CheckCircle size={15} />
                    Approve
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-white/10 bg-slate-900/40 p-12 text-center">
            <BookOpen size={44} className="mx-auto text-slate-600" />
            <p className="mt-4 text-sm font-semibold text-slate-500">{emptyLabel}</p>
          </div>
        )}
      </div>
    </section>
  );
}
