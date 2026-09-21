"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, GraduationCap } from "lucide-react";

const depts: never[] = [];

export default function DepartmentsPage() {
  return (
    <div className="space-y-10">
      <header className="border-b border-border pb-8">
        <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary">Department Hub</h1>
        <p className="text-muted-foreground font-medium mt-1 uppercase tracking-widest text-xs">Manage and view athletic performance by department.</p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {depts.length > 0 ? depts.map((dept, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
          </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-3xl">
            <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <GraduationCap size={40} className="text-slate-600" />
            </div>
            <h3 className="text-2xl font-black sport-heading opacity-50 uppercase">No Departments Configured</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mt-2">The administrative board has not added any departments yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}


