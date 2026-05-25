"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, MapPin, Clock, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { matches } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tabs = ["All Matches", "Live", "Upcoming", "Finished"];

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState("All Matches");

  const filteredMatches = matches.filter(match => {
    if (activeTab === "All Matches") return true;
    return match.status === activeTab;
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);


  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter sport-heading text-primary">Match Center</h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase tracking-widest text-[10px]">
            {formatFullDate(selectedDate)}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-4 relative">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setSelectedDate(now);
              }}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all border border-border"
            >
              Today
            </button>
            <div className="flex items-center gap-3 rounded-2xl bg-card border-2 border-border p-2">
              <button 
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setMonth(d.getMonth() - 1);
                  setCurrentDate(d);
                }}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div 
                className="flex items-center gap-3 px-4 py-1 cursor-pointer group"
                onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              >
                <CalendarIcon size={18} className="text-accent group-hover:scale-110 transition-transform" />
                <span className="font-black sport-heading tracking-wide min-w-[120px] text-center group-hover:text-accent transition-colors">
                  {formatMonth(currentDate)}
                </span>
              </div>

              <button 
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setMonth(d.getMonth() + 1);
                  setCurrentDate(d);
                }}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Custom Calendar Picker Modal */}
          <AnimatePresence>
            {isCalendarOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-24 right-0 z-50 w-[360px] rounded-[2.5rem] bg-[#020617] border-2 border-white/10 p-8 shadow-[0_30px_70px_rgba(0,0,0,0.8)] backdrop-blur-3xl"
              >
                <div className="space-y-8">
                  {/* Month/Year Selection Header */}
                  <div className="flex items-center justify-between gap-4">
                    <select 
                      value={currentDate.getMonth()}
                      onChange={(e) => {
                        const d = new Date(currentDate);
                        d.setMonth(parseInt(e.target.value));
                        setCurrentDate(d);
                      }}
                      className="flex-1 bg-white/5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent"
                    >
                      {months.map((m, i) => <option key={m} value={i} className="bg-[#020617]">{m}</option>)}
                    </select>
                    <select 
                      value={currentDate.getFullYear()}
                      onChange={(e) => {
                        const d = new Date(currentDate);
                        d.setFullYear(parseInt(e.target.value));
                        setCurrentDate(d);
                      }}
                      className="flex-1 bg-white/5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent"
                    >
                      {years.map(y => <option key={y} value={y} className="bg-[#020617]">{y}</option>)}
                    </select>
                  </div>

                  {/* Day Names */}
                  <div className="grid grid-cols-7 gap-1">
                    {dayNames.map(day => (
                      <div key={day} className="text-center text-[8px] font-black uppercase tracking-tighter text-slate-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Day Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: days }).map((_, i) => {
                      const dayNumber = i + 1;
                      const isSelected = selectedDate.getDate() === dayNumber && 
                                       selectedDate.getMonth() === currentDate.getMonth() &&
                                       selectedDate.getFullYear() === currentDate.getFullYear();
                      const isToday = new Date().getDate() === dayNumber && 
                                     new Date().getMonth() === currentDate.getMonth() &&
                                     new Date().getFullYear() === currentDate.getFullYear();

                      return (
                        <button
                          key={dayNumber}
                          onClick={() => {
                            const d = new Date(currentDate);
                            d.setDate(dayNumber);
                            setSelectedDate(d);
                            setIsCalendarOpen(false);
                          }}
                          className={cn(
                            "h-10 w-10 rounded-xl text-xs font-black transition-all flex items-center justify-center relative group",
                            isSelected ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20" : 
                            isToday ? "bg-accent/10 text-accent border border-accent/20" : 
                            "hover:bg-white/10 text-slate-400"
                          )}
                        >
                          {dayNumber}
                          {isToday && !isSelected && <div className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Navigation Tabs */}

      <div className="flex gap-4 p-1 bg-secondary/50 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
              activeTab === tab 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "text-muted-foreground hover:text-primary hover:bg-white/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Match List */}
      <div className="grid gap-8">
        <AnimatePresence mode="popLayout">
          {filteredMatches.length > 0 ? filteredMatches.map((match, i) => (
            <motion.div
              key={match.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card variant={match.status === "Live" ? "scoreboard" : "default"} className="group relative overflow-hidden p-0 border-2">
                {match.status === "Live" && (
                  <div className="absolute left-0 top-0 h-full w-2 bg-accent" />
                )}
                
                <div className="flex flex-col md:flex-row md:items-stretch">
                  {/* Status & Info */}
                  <div className={cn(
                    "p-8 md:w-72 flex flex-col justify-center border-b md:border-b-0 md:border-r",
                    match.status === "Live" ? "bg-white/5 border-white/10" : "bg-secondary/30 border-border"
                  )}>
                    <div className="space-y-4">
                      <div className={cn(
                        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest",
                        match.status === "Live" ? "bg-accent/20 text-accent" :
                        match.status === "Upcoming" ? "bg-blue-500/10 text-blue-500" :
                        "bg-slate-500/10 text-slate-500"
                      )}>
                        {match.status === "Live" && <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
                        {match.status === "Live" ? "ON AIR" : match.status}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest opacity-60">
                          <Clock size={14} className="text-accent" />
                          {match.time}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest opacity-60">
                          <MapPin size={14} className="text-accent" />
                          Arena A-04
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Teams & Score */}
                  <div className="flex-1 p-8 flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-8 md:px-8">
                      {/* Team A */}
                      <div className="flex flex-1 flex-col items-center gap-4 text-center md:flex-row md:text-left group/team">
                        <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center text-3xl group-hover/team:scale-110 transition-transform">
                          🏆
                        </div>
                        <div>
                          <span className="block text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-1">Home</span>
                          <span className="text-2xl font-black sport-heading tracking-wide uppercase">{match.teamA}</span>
                        </div>
                      </div>

                      {/* Scoreboard Display */}
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "flex items-center gap-6 rounded-2xl px-10 py-5 border-2 transition-all shadow-2xl",
                          match.status === "Live" ? "bg-black/60 border-accent/40" : "bg-secondary border-border"
                        )}>
                          <span className={cn(
                            "text-6xl font-black scoreboard-number leading-none tracking-tighter",
                            match.status === "Upcoming" ? "opacity-20" : "text-white"
                          )}>
                            {match.status === "Upcoming" ? "00" : match.scoreA.toString().padStart(2, '0')}
                          </span>
                          <span className="text-accent font-black text-4xl opacity-50 italic">:</span>
                          <span className={cn(
                            "text-6xl font-black scoreboard-number leading-none tracking-tighter",
                            match.status === "Upcoming" ? "opacity-20" : "text-white"
                          )}>
                            {match.status === "Upcoming" ? "00" : match.scoreB.toString().padStart(2, '0')}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-accent tracking-[0.4em] sport-heading">{match.sport}</span>
                      </div>


                      {/* Team B */}
                      <div className="flex flex-1 flex-col-reverse items-center gap-4 text-center md:flex-row md:justify-end md:text-right group/team">
                        <div>
                          <span className="block text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-1">Away</span>
                          <span className="text-2xl font-black sport-heading tracking-wide uppercase">{match.teamB}</span>
                        </div>
                        <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center text-3xl group-hover/team:scale-110 transition-transform">
                          🥈
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center p-6 bg-white/5 md:w-48 md:border-l border-white/10">
                    <button className="w-full rounded-xl bg-accent px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-accent-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-accent/20">
                      LIVE FEED
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 rounded-[2.5rem] bg-card/30 border-2 border-dashed border-white/10 text-center"
            >
              <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center mb-8">
                <CalendarIcon size={48} className="text-slate-600" />
              </div>
              <h3 className="text-3xl font-black sport-heading text-white uppercase">No Scheduled Events</h3>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-2 max-w-md">The arena is currently silent. Stay tuned for administrative updates.</p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

