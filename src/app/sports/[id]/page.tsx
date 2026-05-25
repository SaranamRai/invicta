"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sports } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Users, User, ArrowLeft, Trophy, Search } from "lucide-react";
import Link from "next/link";


export default function SportDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const sport = sports.find((s) => s.id === params.id);
  const [activeTab, setActiveTab] = useState("Teams");


  if (!sport) return <div className="p-20 text-center font-black">Sport Not Found</div>;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-8">
        <div className="flex items-center gap-6">
          <Link href="/sports" className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary uppercase">{sport.name} ARENA</h1>
            <p className="text-muted-foreground font-medium mt-1 uppercase tracking-widest text-xs">Squad rosters & department rankings</p>
          </div>
        </div>

        <div className="flex gap-4 p-1 bg-secondary/50 rounded-2xl">
          {["Teams", "Members"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === tab ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Teams</p>
              <p className="text-2xl font-black sport-heading">0</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Members</p>
              <p className="text-2xl font-black sport-heading">0</p>
            </div>
          </div>
        </Card>
      </div>


      {/* Main Content */}
      <div className="min-h-[400px] rounded-[2.5rem] bg-card/30 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center p-20">
        <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center mb-8">
          {activeTab === "Teams" ? <Users size={48} className="text-slate-600" /> : <User size={48} className="text-slate-600" />}
        </div>
        <h3 className="text-3xl font-black sport-heading text-white uppercase">NO {activeTab.toUpperCase()} REGISTERED</h3>
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-2 max-w-md">
          Administrative oversight is pending for the {sport.name} {activeTab.toLowerCase()}. Data will appear here once the season commences.
        </p>
      </div>
    </div>
  );
}
