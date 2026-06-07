"use client";

import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, FileText, Mail } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getPublicRules, mapMongoRule } from "@/lib/api";
import { sports } from "@/lib/mock-data";

interface PublishedRule {
  id: string;
  title?: string;
  description?: string;
  sport?: string;
  sportName?: string;
  createdBy?: string;
  createdByEmail?: string;
  createdAt?: number;
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

  useEffect(() => {
    let isMounted = true;

    async function loadRules() {
      const publicRules = await getPublicRules();
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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-black sport-heading text-white">Published Sport Rules</h2>
        <p className="text-sm text-slate-400">
          Review coordinator-published rules that are visible to public visitors.
        </p>
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
                <span className="w-fit rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {formatPublishedAt(rule.createdAt)}
                </span>
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
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-white/10 bg-slate-900/40 p-12 text-center">
            <BookOpen size={44} className="mx-auto text-slate-600" />
            <p className="mt-4 text-sm font-semibold text-slate-500">No sport rules have been published yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
