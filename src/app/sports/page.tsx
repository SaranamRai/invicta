"use client";

import React from "react";
import { motion } from "framer-motion";
import { sports } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";


export default function SportsPage() {
  return (
    <div className="space-y-10">
      <header className="border-b border-border pb-8">
        <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary">Sports Disciplines</h1>
        <p className="text-muted-foreground font-medium mt-1 uppercase tracking-widest text-xs">Browse all sports disciplines and their respective leagues.</p>
      </header>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {sports.length > 0 ? sports.map((sport, i) => (
          <motion.div
            key={sport.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={`/sports/${sport.id}`}>
              <Card className="group relative h-72 cursor-pointer overflow-hidden border-2 shadow-2xl hover:border-accent transition-all">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 transition-opacity group-hover:opacity-100" />
                
                <div className="relative flex h-full flex-col items-center justify-center space-y-6">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-secondary/50 border border-border shadow-inner transition-all group-hover:scale-110 group-hover:rotate-3">
                    <Trophy size={40} className="text-accent opacity-50" />
                  </div>
                  <div className="text-center px-6">
                    <h3 className="text-3xl font-black sport-heading tracking-wide uppercase">{sport.name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2">Awaiting Tournament Configuration</p>
                  </div>
                </div>

                <div className="absolute bottom-6 right-6 translate-x-10 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xl">
                    <ArrowRight size={24} />
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>

        )) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl">
            <Trophy className="mx-auto text-muted-foreground opacity-20 mb-4" size={64} />
            <h3 className="text-xl font-black sport-heading opacity-50">NO DISCIPLINES CONFIGURED</h3>
          </div>
        )}
      </div>

    </div>
  );
}

