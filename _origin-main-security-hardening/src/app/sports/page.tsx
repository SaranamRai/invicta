"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ArrowRight, Loader2, Trophy } from "lucide-react";
import Link from "next/link";
import { getPublicSports, MongoSport } from "@/lib/api";
import { SportMark } from "@/components/sport-mark";


export default function SportsPage() {
  const [sports, setSports] = useState<MongoSport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPublicSports()
      .then((data) => {
        if (mounted) setSports(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-10">
      <header className="border-b border-border pb-8">
        <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary">Sports</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted-foreground">
          Choose a sport to see registered departments, player lists, and fixtures for that event.
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-xl border border-border">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      ) : (
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {sports.length > 0 ? sports.map((sport, i) => (
          <motion.div
            key={sport._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={`/sports/${sport._id}`}>
              <Card className="group relative h-72 cursor-pointer overflow-hidden border-2 shadow-2xl hover:border-accent transition-all">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 transition-opacity group-hover:opacity-100" />
                
                <div className="relative flex h-full flex-col items-center justify-center space-y-6">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-secondary/50 border border-border shadow-inner transition-all group-hover:scale-110 group-hover:rotate-3">
                    <SportMark name={sport.sportName || sport.name || ""} className="h-14 w-14 text-accent opacity-80" />
                  </div>
                  <div className="text-center px-6">
                    <h3 className="text-3xl font-black sport-heading tracking-wide uppercase">{sport.sportName || sport.name}</h3>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{sport.categories?.join(" / ") || "Male / Female"}</p>
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
            <h3 className="text-xl font-black sport-heading opacity-50">No sports configured yet</h3>
          </div>
        )}
      </div>
      )}

    </div>
  );
}
