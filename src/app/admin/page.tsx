"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Check, X, Save, Trophy, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { matches as initialMatches, Match } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const [matches, setMatches] = useState(initialMatches);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scores, setScores] = useState({ a: 0, b: 0 });

  const startEditing = (match: Match) => {
    setEditingId(match.id);
    setScores({ a: match.scoreA, b: match.scoreB });
  };

  const saveScore = (id: string) => {
    setMatches(matches.map(m =>
      m.id === id ? { ...m, scoreA: scores.a, scoreB: scores.b } : m
    ));
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Management Panel</h1>
          <p className="text-muted-foreground">Update scores, schedule matches, and manage tournaments.</p>
        </div>

      </header>

      {/* Statistics for Admin */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary p-2 text-white"><Trophy size={20} /></div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Tournaments</p>
              <p className="text-lg font-bold">4</p>
            </div>
          </div>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-500 p-2 text-white"><Calendar size={20} /></div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Matches Today</p>
              <p className="text-lg font-bold">8</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Match Management Table */}
      <Card className="p-0 overflow-hidden border-none shadow-xl">
        <div className="bg-secondary/50 p-4 border-b">
          <h2 className="font-bold">Score Updates</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Match Info</th>
                <th className="px-6 py-4 text-center">Score Update</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {matches.map((match) => (
                <tr key={match.id} className="transition-colors hover:bg-secondary/10">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="font-bold">{match.teamA} vs {match.teamB}</p>
                      <p className="text-xs text-muted-foreground">{match.sport} • {match.type}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      {editingId === match.id ? (
                        <>
                          <input
                            type="number"
                            value={scores.a}
                            onChange={(e) => setScores({ ...scores, a: parseInt(e.target.value) || 0 })}
                            className="w-12 rounded-lg border border-primary bg-background p-1 text-center font-bold"
                          />
                          <span className="font-bold">:</span>
                          <input
                            type="number"
                            value={scores.b}
                            onChange={(e) => setScores({ ...scores, b: parseInt(e.target.value) || 0 })}
                            className="w-12 rounded-lg border border-primary bg-background p-1 text-center font-bold"
                          />
                        </>
                      ) : (
                        <span className="text-xl font-black">{match.scoreA} : {match.scoreB}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "rounded-full px-2 py-1 text-[10px] font-black uppercase",
                      match.status === "Live" ? "bg-emerald-500/10 text-emerald-500" : "bg-secondary text-muted-foreground"
                    )}>
                      {match.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === match.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => saveScore(match.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(match)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:bg-primary hover:text-white transition-all ml-auto"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
