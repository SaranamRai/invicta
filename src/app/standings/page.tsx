"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Filter, Download, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { standings, sports } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const categories = ["Inter-Department"];

export default function StandingsPage() {
  const [activeSport, setActiveSport] = useState(sports[0]?.id || "");
  const [activeCategory, setActiveCategory] = useState(categories[0] || "");


  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary">INVICTA Tables</h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase tracking-widest text-xs">Real-time standings across all divisions</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-3 rounded-xl border-2 border-border bg-card px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:border-accent hover:text-accent">
            <Download size={18} /> DOWNLOAD STATS
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {sports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => setActiveSport(sport.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-2",
                activeSport === sport.id
                  ? "bg-primary border-primary text-primary-foreground shadow-xl"
                  : "bg-card border-border text-muted-foreground hover:border-accent hover:text-accent"
              )}
            >
              {sport.name}
            </button>

          ))}
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-secondary/50 border-2 border-border p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Standings Table */}
      <motion.div
        key={`${activeSport}-${activeCategory}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="p-0 overflow-hidden border-2 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary text-[10px] font-black uppercase tracking-[0.2em] text-secondary-foreground">
                <tr>
                  <th className="px-8 py-5">POS</th>
                  <th className="px-8 py-5">TEAM / COLLEGE</th>
                  <th className="px-8 py-5 text-center">P</th>
                  <th className="px-8 py-5 text-center text-emerald-500">W</th>
                  <th className="px-8 py-5 text-center text-rose-500">L</th>
                  <th className="px-8 py-5 text-center">D</th>
                  <th className="px-8 py-5 text-center">GD</th>
                  <th className="px-8 py-5 text-right">POINTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {standings.length > 0 ? standings.map((team, i) => (
                  <tr 
                    key={team.team} 
                    className={cn(
                      "group transition-all hover:bg-secondary/30",
                      i < 3 && "bg-accent/5"
                    )}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl font-black sport-heading text-xl shadow-inner",
                          i === 0 ? "bg-accent text-accent-foreground border-2 border-accent/20" : 
                          i === 1 ? "bg-slate-200 text-slate-800" : 
                          i === 2 ? "bg-amber-700/20 text-amber-900 dark:text-amber-200" : 
                          "bg-secondary text-muted-foreground"
                        )}>
                          {team.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-secondary border-2 border-border shadow-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                          {i === 0 ? "🏆" : "🛡️"}
                        </div>
                        <div>
                          <p className="text-lg font-black sport-heading tracking-wide uppercase">{team.team}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-accent">{activeCategory}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center font-bold text-lg">{team.played}</td>
                    <td className="px-8 py-6 text-center text-emerald-500 font-black text-lg sport-heading">{team.won}</td>
                    <td className="px-8 py-6 text-center text-rose-500 font-black text-lg sport-heading">{team.lost}</td>
                    <td className="px-8 py-6 text-center text-muted-foreground font-bold">0</td>
                    <td className="px-8 py-6 text-center font-black text-lg sport-heading text-primary">+12</td>
                    <td className="px-8 py-6 text-right">
                      <span className="inline-flex h-12 min-w-[80px] items-center justify-center rounded-xl bg-primary px-4 font-black text-xl sport-heading text-primary-foreground shadow-lg shadow-primary/20">
                        {team.pts}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                          <Trophy size={40} className="text-slate-700 opacity-30" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">No standings recorded for this category yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>
        </Card>
      </motion.div>


    </div>
  );
}

