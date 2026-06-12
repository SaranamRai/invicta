"use client";

import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, FileText } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getPublicRules, getPublicTournaments, mapMongoRule, TournamentPayload } from "@/lib/api";

interface RuleItem {
  id: string;
  title?: string;
  description?: string;
  sport?: string;
  sportName?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentKind?: "document" | "image";
}

export default function RulesPage() {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [tournaments, setTournaments] = useState<TournamentPayload[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  useEffect(() => {
    let isMounted = true;

    void getPublicTournaments().then((data) => {
      if (isMounted) setTournaments(data);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRules() {
      if (!selectedTournamentId) {
        setRules([]);
        return;
      }
      const publicRules = await getPublicRules({ tournamentId: selectedTournamentId });
      if (!isMounted) return;
      setRules(publicRules.map(mapMongoRule));
    }

    void loadRules();
    const interval = window.setInterval(loadRules, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [selectedTournamentId]);

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-8">
        <h1 className="sport-heading text-5xl font-black tracking-tighter text-primary">Rules</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
          Sport rules, eligibility notes, and event instructions for teams and visitors.
        </p>
      </header>

      <div className="max-w-md space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tournament</label>
        <select
          value={selectedTournamentId}
          onChange={(event) => setSelectedTournamentId(event.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground outline-none focus:border-accent"
        >
          <option value="">Select tournament</option>
          {tournaments.map((tournament) => (
            <option key={tournament._id || tournament.id} value={tournament._id || tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {!selectedTournamentId ? (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
            <BookOpen size={44} className="mx-auto text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold text-muted-foreground">Please select a tournament.</p>
          </div>
        ) : rules.length > 0 ? rules.map((rule) => (
          <Card key={rule.id} className="p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">{rule.sportName || rule.sport || "General"}</p>
            <h2 className="mt-2 text-xl font-black text-foreground">{rule.title || "Rule"}</h2>
            <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-muted-foreground">{rule.description || "Details will be updated by the organizing team."}</p>
            {rule.attachmentUrl && (
              <a
                href={rule.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-bold text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText size={17} className="shrink-0" />
                  <span className="truncate">{rule.attachmentName || (rule.attachmentKind === "image" ? "View image" : "View document")}</span>
                </span>
                <ExternalLink size={16} className="shrink-0" />
              </a>
            )}
          </Card>
        )) : (
          <div className="col-span-full rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
            <BookOpen size={44} className="mx-auto text-muted-foreground" />
            <p className="mt-4 text-sm font-semibold text-muted-foreground">Rules will appear here after the organizing team publishes them.</p>
          </div>
        )}
      </div>
    </div>
  );
}
