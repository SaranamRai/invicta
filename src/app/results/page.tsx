"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getPublicFixtures, getPublicLiveScores, getPublicTournaments, mapMongoFixture, TournamentPayload } from "@/lib/api";
import { MatchData } from "@/lib/types";

export default function ResultsPage() {
  const [results, setResults] = useState<MatchData[]>([]);
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

    async function loadResults() {
      if (!selectedTournamentId) {
        setResults([]);
        return;
      }
      const params = { tournamentId: selectedTournamentId };
      const [fixtures, liveScores] = await Promise.all([getPublicFixtures(params), getPublicLiveScores(params)]);
      if (!isMounted) return;
      const scoreLookup = new Map(liveScores.map((score) => [score.fixtureId, score]));
      setResults(fixtures
        .map((fixture) => mapMongoFixture(fixture, scoreLookup.get(fixture._id)) as MatchData)
        .filter((match) => match.status === "Finished"));
    }

    void loadResults();
    const interval = window.setInterval(loadResults, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [selectedTournamentId]);

  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-8">
        <h1 className="sport-heading text-5xl font-black tracking-tighter text-primary">Results</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
          Completed match scores and final outcomes appear here after volunteers and admins update them.
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

      <div className="grid gap-4">
        {!selectedTournamentId ? (
          <EmptyState label="Please select a tournament." />
        ) : results.length > 0 ? results.map((match) => (
          <Card key={match.id} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">{match.sport} / {match.type}</p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-wide text-foreground">{match.teamA} vs {match.teamB}</h2>
              </div>
              <div className="rounded-xl bg-primary px-5 py-3 text-2xl font-black text-primary-foreground">
                {match.scoreA} - {match.scoreB}
              </div>
            </div>
          </Card>
        )) : (
          <EmptyState label="No results published yet" />
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
      <Trophy size={44} className="mx-auto text-muted-foreground" />
      <p className="mt-4 text-sm font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
