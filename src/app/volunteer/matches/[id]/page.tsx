"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MatchData, MatchPeriod, ScoreEvent } from "@/lib/types";
import { getMatchById, updateMatchDetails, logActivity } from "@/lib/services/mongo-service";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Flag, Loader2, Pause, Play, Plus, Save, Square } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  formatMatchClock,
  getClockStopState,
  getMatchClockText,
  getMatchElapsedSeconds,
  getMatchFullTimeSeconds,
  getMatchPeriod,
  getScheduledFullTimeSeconds,
  parseMatchClock,
} from "@/lib/match-clock";
import { getRoleAccount } from "@/lib/role-auth";

export default function LiveMatchEditPanel() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [now, setNow] = useState(0);
  const autoStoppingRef = useRef(false);

  // Form states
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [status, setStatus] = useState<MatchData['status']>("Upcoming");
  const [timer, setTimer] = useState("");
  const [fullMatchTimer, setFullMatchTimer] = useState("90:00");
  const [extraTimeMinutes, setExtraTimeMinutes] = useState(5);
  const [announcement, setAnnouncement] = useState("");
  const [pauseReason, setPauseReason] = useState("Timeout");
  const assignedSport = getRoleAccount()?.assignedSport?.trim().toLowerCase() || "";
  const pauseReasons = ["Fault", "Player exchange", "Injury", "Timeout", "Referee issue", "Technical delay"];

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!matchId) return;
    let isMounted = true;

    async function loadMatch() {
      const data = await getMatchById(matchId);
      if (!isMounted) return;

      if (!data || (assignedSport && data.sport !== assignedSport)) {
        router.push("/volunteer/matches");
        return;
      }

      setMatch(data);
      if (loading) {
        setScoreA(data.scoreA || 0);
        setScoreB(data.scoreB || 0);
        setStatus(data.status || "Upcoming");
        setTimer(data.timer || "");
        setFullMatchTimer(formatMatchClock(getScheduledFullTimeSeconds(data)));
        setLoading(false);
      }
    }

    void loadMatch();
    const interval = window.setInterval(loadMatch, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [assignedSport, matchId, loading, router]);

  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  useEffect(() => {
    if (!match || saving || autoStoppingRef.current || match.status !== "Live" || !match.clockRunning) return;

    const elapsedSeconds = getMatchElapsedSeconds(match, now || Date.now());
    const stopState = getClockStopState(elapsedSeconds, getMatchPeriod(match), getMatchFullTimeSeconds(match));
    if (!stopState) return;

    const stopClock = async () => {
      autoStoppingRef.current = true;
      setSaving(true);
      try {
        const email = getRoleAccount()?.email || "volunteer";
        const currentNow = Date.now();
        const timer = formatMatchClock(stopState.elapsedSeconds);

        await updateMatchDetails(matchId, {
          status: stopState.status,
          period: stopState.period,
          clockRunning: false,
          timerStartedAt: 0,
          endedAt: stopState.status === "Finished" ? currentNow : match.endedAt || 0,
          elapsedSeconds: stopState.elapsedSeconds,
          timer,
        });

        await logActivity(matchId, `Auto stopped at ${stopState.period} (${timer})`, email);
        setStatus(stopState.status);
        setTimer(timer);
        setFullMatchTimer(formatMatchClock(getScheduledFullTimeSeconds(match)));
        showMessage(stopState.status === "Finished" ? "Match ended automatically at full time." : "Clock stopped automatically at half time.", "success");
      } catch (error) {
        console.error(error);
        showMessage("Failed to auto-stop clock.", "error");
      } finally {
        autoStoppingRef.current = false;
        setSaving(false);
      }
    };

    void stopClock();
  }, [match, matchId, now, saving]);

  const persistClockState = async (
    period: MatchPeriod,
    clockRunning: boolean,
    nextStatus: MatchData["status"],
    elapsedSecondsOverride?: number,
  ) => {
    if (!match) return;

    setSaving(true);
    try {
      const email = getRoleAccount()?.email || "volunteer";
      const currentNow = Date.now();
      const elapsedSeconds = elapsedSecondsOverride ?? getMatchElapsedSeconds(match, now || currentNow);
      const timer = formatMatchClock(elapsedSeconds);

      await updateMatchDetails(matchId, {
        status: nextStatus,
        period,
        clockRunning,
        timerStartedAt: clockRunning ? currentNow : 0,
        startedAt: elapsedSecondsOverride === 0 ? currentNow : match.startedAt || currentNow,
        endedAt: nextStatus === "Finished" ? currentNow : match.endedAt || 0,
        elapsedSeconds,
        timer,
      });

      await logActivity(matchId, `${period}: ${clockRunning ? "clock started" : "clock paused"} at ${timer}`, email);
      setStatus(nextStatus);
      setTimer(timer);
      setFullMatchTimer(formatMatchClock(getScheduledFullTimeSeconds(match)));
      showMessage(nextStatus === "Finished" ? "Match ended and synced to dashboard." : "Clock updated.", "success");
    } catch (error) {
      console.error(error);
      showMessage("Failed to update clock.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStartClock = () => {
    if (match?.status === "Finished") {
      showMessage("This match is already completed and cannot be started again.", "error");
      return;
    }
    return persistClockState("First Half", true, "Live", 0);
  };
  const handleHalfTime = () => persistClockState("Half Time", false, "Live");
  const handleSecondHalf = () => persistClockState("Second Half", true, "Live");
  const handleEndMatch = () => persistClockState("Full Time", false, "Finished");

  const handlePauseMatch = async () => {
    if (!match || match.status !== "Live" || !match.clockRunning) return;

    setSaving(true);
    try {
      const email = getRoleAccount()?.email || "volunteer@gmail.com";
      const currentNow = Date.now();
      const elapsedSeconds = getMatchElapsedSeconds(match, now || currentNow);
      const timer = formatMatchClock(elapsedSeconds);
      const pauseEvent = {
        reason: pauseReason,
        pausedAt: currentNow,
        elapsedSeconds,
      };

      await updateMatchDetails(matchId, {
        status: "Paused",
        clockRunning: false,
        timerStartedAt: 0,
        timerPausedAt: currentNow,
        elapsedSeconds,
        timer,
        pausePeriods: [pauseEvent, ...(match.pausePeriods || [])],
      });
      await logActivity(matchId, `Match paused: ${pauseReason}`, email);
      setStatus("Paused");
      setTimer(timer);
      showMessage("Match paused and saved.", "success");
    } catch (error) {
      console.error(error);
      showMessage("Failed to pause match.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResumeMatch = async () => {
    if (!match || match.status !== "Paused") return;

    setSaving(true);
    try {
      const email = getRoleAccount()?.email || "volunteer@gmail.com";
      const currentNow = Date.now();
      const elapsedSeconds = getMatchElapsedSeconds(match, now || currentNow);
      const timer = formatMatchClock(elapsedSeconds);
      const pausePeriods = [...(match.pausePeriods || [])];
      if (pausePeriods[0] && !pausePeriods[0].resumedAt) {
        pausePeriods[0] = { ...pausePeriods[0], resumedAt: currentNow };
      }

      await updateMatchDetails(matchId, {
        status: "Live",
        clockRunning: true,
        timerStartedAt: currentNow,
        timerPausedAt: 0,
        elapsedSeconds,
        timer,
        pausePeriods,
      });
      await logActivity(matchId, "Match resumed", email);
      setStatus("Live");
      setTimer(timer);
      showMessage("Match resumed.", "success");
    } catch (error) {
      console.error(error);
      showMessage("Failed to resume match.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExtraTime = async () => {
    if (!match || match.status === "Upcoming") return;

    setSaving(true);
    try {
      const email = getRoleAccount()?.email || "volunteer";
      const minutesToAdd = Math.max(1, Math.floor(extraTimeMinutes || 0));
      const nextExtraTimeSeconds = Math.max(0, match.extraTimeSeconds || 0) + minutesToAdd * 60;
      const elapsedSeconds = getMatchElapsedSeconds(match, now || Date.now());
      const nextStatus = match.status === "Finished" ? "Live" : match.status;
      const nextPeriod = match.period === "Full Time" ? "Second Half" : getMatchPeriod(match);

      await updateMatchDetails(matchId, {
        status: nextStatus,
        period: nextPeriod,
        clockRunning: false,
        timerStartedAt: 0,
        endedAt: 0,
        elapsedSeconds,
        timer: formatMatchClock(elapsedSeconds),
        extraTimeSeconds: nextExtraTimeSeconds,
      });

      await logActivity(matchId, `Added ${minutesToAdd} minute${minutesToAdd === 1 ? "" : "s"} extra time`, email);
      setStatus(nextStatus);
      showMessage(`${minutesToAdd} minute${minutesToAdd === 1 ? "" : "s"} extra time added. Start the clock when ready.`, "success");
    } catch (error) {
      console.error(error);
      showMessage("Failed to add extra time.", "error");
    } finally {
      setSaving(false);
    }
  };

  const recordScore = async (team: "A" | "B", points: number) => {
    if (!match || match.status === "Finished") return;

    setSaving(true);
    try {
      const email = getRoleAccount()?.email || "volunteer";
      const currentNow = Date.now();
      const elapsedSeconds = getMatchElapsedSeconds(match, now || currentNow);
      const matchTime = formatMatchClock(elapsedSeconds);
      const nextScoreA = team === "A" ? scoreA + points : scoreA;
      const nextScoreB = team === "B" ? scoreB + points : scoreB;
      const teamName = team === "A" ? match.teamA : match.teamB;
      const scoreEvent: ScoreEvent = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${currentNow}-${team}`,
        team,
        teamName,
        points,
        scoreA: nextScoreA,
        scoreB: nextScoreB,
        period: getMatchPeriod(match),
        matchTime,
        elapsedSeconds,
        timestamp: currentNow,
        volunteerEmail: email,
      };

      setScoreA(nextScoreA);
      setScoreB(nextScoreB);

      await updateMatchDetails(matchId, {
        scoreA: nextScoreA,
        scoreB: nextScoreB,
        status: "Live",
        elapsedSeconds,
        timer: matchTime,
        scoreEvents: [scoreEvent, ...(match.scoreEvents || [])].slice(0, 100),
      });
      await logActivity(matchId, `${teamName} +${points} at ${matchTime} (${scoreEvent.period}). Score ${nextScoreA}-${nextScoreB}`, email);
      showMessage("Point recorded with match time.", "success");
    } catch (error) {
      console.error(error);
      showMessage("Failed to record point.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const email = getRoleAccount()?.email || "volunteer";
      const enteredElapsedSeconds = match ? getMatchElapsedSeconds(match, now || Date.now()) : parseMatchClock(timer);
      const nextFullMatchSeconds = match ? getMatchFullTimeSeconds(match) : parseMatchClock(fullMatchTimer);
      const stopState = match ? getClockStopState(enteredElapsedSeconds, getMatchPeriod(match), nextFullMatchSeconds) : null;
      const nextElapsedSeconds = stopState?.elapsedSeconds ?? enteredElapsedSeconds;
      const nextTimer = formatMatchClock(nextElapsedSeconds);
      const nextFullMatchTimer = formatMatchClock(nextFullMatchSeconds);
      const nextStatus = stopState?.status ?? status;
      const nextPeriod = stopState?.period ?? (status === "Finished" ? "Full Time" : match?.period || "First Half");
      const currentNow = Date.now();

      await updateMatchDetails(matchId, {
        scoreA,
        scoreB,
        status: nextStatus,
        period: nextPeriod,
        timer: nextTimer,
        elapsedSeconds: nextElapsedSeconds,
        clockRunning: stopState || nextStatus === "Finished" ? false : match?.clockRunning || false,
        timerStartedAt: stopState || nextStatus === "Finished" || !match?.clockRunning ? 0 : currentNow,
        endedAt: nextStatus === "Finished" ? currentNow : match?.endedAt || 0,
      });
      
      setStatus(nextStatus);
      setTimer(nextTimer);
      setFullMatchTimer(formatMatchClock(match ? getScheduledFullTimeSeconds(match) : nextFullMatchSeconds));

      let actionLog = `Updated match status to ${nextStatus}. Score: ${scoreA}-${scoreB}`;
      if (nextTimer) actionLog += `. Timer: ${nextTimer}`;
      actionLog += `. Full match time: ${nextFullMatchTimer}`;
      if (stopState) actionLog += `. Auto stopped at ${stopState.period}`;
      
      await logActivity(matchId, actionLog, email);
      showMessage(stopState ? `Timer reached ${stopState.period.toLowerCase()} and stopped automatically.` : "Match details updated successfully!", "success");
    } catch (error) {
      console.error(error);
      showMessage("Failed to update match.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnnouncement = async () => {
    if (!announcement.trim()) return;
    setSaving(true);
    try {
      const email = getRoleAccount()?.email || "volunteer";
      const currentAnnouncements = match?.announcements || [];
      const newAnnouncements = [announcement, ...currentAnnouncements].slice(0, 5); // Keep last 5
      
      await updateMatchDetails(matchId, { announcements: newAnnouncements });
      await logActivity(matchId, `Added announcement: "${announcement}"`, email);
      
      setAnnouncement("");
      showMessage("Announcement added!", "success");
    } catch (error) {
      console.error(error);
      showMessage("Failed to add announcement.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !match) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <Link href="/volunteer/matches" className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase sport-heading">Update This Match</h1>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-400">
            {match.teamA} vs {match.teamB} / {match.sport}. Use the controls below to keep the public score and timeline accurate.
          </p>
        </div>
      </div>

      {message.text && (
        <div className={cn(
          "p-4 rounded-xl text-xs font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-4",
          message.type === "success" ? "bg-accent/20 text-accent border border-accent/20" : "bg-red-500/20 text-red-400 border border-red-500/20"
        )}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Controls */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-white/5 border-white/10 p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Clock Seen by Visitors</p>
                <div className="mt-2 flex flex-wrap items-end gap-4">
                  <span className="font-mono text-6xl font-black text-accent">{getMatchClockText(match, now)}</span>
                  <span className="mb-2 rounded-full bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">
                    {getMatchPeriod(match)}
                  </span>
                  {match.clockRunning && (
                    <span className="mb-2 flex items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-accent">
                      <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                      Running
                    </span>
                  )}
                  {match.status === "Paused" && (
                    <span className="mb-2 rounded-full bg-amber-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Paused
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[640px]">
                <button
                  onClick={handleStartClock}
                  disabled={saving || match.clockRunning || match.status === "Finished"}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-[10px] font-black uppercase tracking-widest text-accent-foreground disabled:opacity-50"
                >
                  <Play size={16} /> Start Match
                </button>
                <button
                  onClick={handlePauseMatch}
                  disabled={saving || match.status !== "Live" || !match.clockRunning}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <Pause size={16} /> Pause
                </button>
                <button
                  onClick={handleResumeMatch}
                  disabled={saving || match.status !== "Paused"}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <Play size={16} /> Resume
                </button>
                <button
                  onClick={handleSecondHalf}
                  disabled={saving || match.status !== "Live" || match.clockRunning}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <Flag size={16} /> Start 2nd Half
                </button>
                <button
                  onClick={handleEndMatch}
                  disabled={saving || match.status === "Finished"}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-500/20 px-3 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                >
                  <Square size={16} /> End Match
                </button>
                <button
                  onClick={handleHalfTime}
                  disabled={saving || match.status !== "Live" || !match.clockRunning}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <Pause size={16} /> Half Time
                </button>
                <select
                  value={pauseReason}
                  onChange={(event) => setPauseReason(event.target.value)}
                  className="col-span-2 h-12 rounded-xl border border-white/10 bg-black/40 px-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-accent sm:col-span-2"
                >
                  {pauseReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-8">
            <h2 className="text-xl font-black uppercase tracking-wider text-white border-b border-white/10 pb-4 mb-6">
              Score and Match Status
            </h2>
            
            <form onSubmit={handleSave} className="space-y-8">
              {/* Status & Timer */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MatchData["status"])}
                    className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm font-bold tracking-tight focus:outline-none focus:border-accent text-white"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Live">Live (In Progress)</option>
                    <option value="Finished">Finished</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Timer</label>
                  <input 
                    type="text" 
                    value={getMatchClockText(match, now)}
                    readOnly
                    placeholder="00:00"
                    className="w-full h-14 bg-black/30 border border-white/10 rounded-2xl px-4 text-sm font-bold tracking-tight text-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Match Time</label>
                  <input
                    type="text"
                    value={fullMatchTimer}
                    readOnly
                    className="w-full h-14 bg-black/30 border border-white/10 rounded-2xl px-4 text-sm font-bold tracking-tight text-slate-300"
                  />
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Extra Time Added</label>
                    <div className="mt-2 h-12 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm font-black text-accent">
                      {formatMatchClock(match.extraTimeSeconds || 0)}
                    </div>
                  </div>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Minutes</span>
                    <input
                      type="number"
                      min={1}
                      value={extraTimeMinutes}
                      onChange={(e) => setExtraTimeMinutes(Math.max(1, Number(e.target.value) || 1))}
                      className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-bold text-white outline-none focus:border-accent"
                    />
                  </label>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stop Time</p>
                    <p className="mt-2 h-12 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm font-black text-white">
                      {formatMatchClock(getMatchFullTimeSeconds(match))}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddExtraTime}
                  disabled={saving || match.status === "Upcoming"}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                >
                  <Plus size={15} /> Add Extra Time
                </button>
              </div>

              {/* Score Editor */}
              <div className="grid grid-cols-3 gap-6 items-center">
                <div className="space-y-4 text-center">
                  <label className="text-sm font-black uppercase tracking-widest text-white">{match.teamA}</label>
                  <div className="flex items-center justify-center gap-4">
                    <button type="button" onClick={() => setScoreA(Math.max(0, scoreA - 1))} className="h-12 w-12 rounded-xl bg-white/5 hover:bg-white/10 text-xl font-bold">-</button>
                    <span className="text-4xl font-black text-white w-16">{scoreA}</span>
                    <button type="button" onClick={() => recordScore("A", 1)} disabled={saving || match.status === "Finished"} className="h-12 w-12 rounded-xl bg-accent text-accent-foreground hover:scale-105 text-xl font-bold disabled:opacity-50">+</button>
                  </div>
                </div>

                <div className="text-center text-slate-500 font-bold text-2xl">VS</div>

                <div className="space-y-4 text-center">
                  <label className="text-sm font-black uppercase tracking-widest text-white">{match.teamB}</label>
                  <div className="flex items-center justify-center gap-4">
                    <button type="button" onClick={() => setScoreB(Math.max(0, scoreB - 1))} className="h-12 w-12 rounded-xl bg-white/5 hover:bg-white/10 text-xl font-bold">-</button>
                    <span className="text-4xl font-black text-white w-16">{scoreB}</span>
                    <button type="button" onClick={() => recordScore("B", 1)} disabled={saving || match.status === "Finished"} className="h-12 w-12 rounded-xl bg-accent text-accent-foreground hover:scale-105 text-xl font-bold disabled:opacity-50">+</button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full h-14 bg-accent text-accent-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-accent/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save and Update Public Pages
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-8">
          <Card className="bg-white/5 border-white/10 p-6">
            <h2 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/10 pb-4 mb-4">
              Scoring Timeline
            </h2>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {match.scoreEvents && match.scoreEvents.length > 0 ? match.scoreEvents.map(event => (
                <div key={event.id} className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black uppercase tracking-wide text-white">{event.teamName} +{event.points}</p>
                    <span className="font-mono text-xs font-black text-accent">{event.matchTime}</span>
                  </div>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {event.period} / Score {event.scoreA}-{event.scoreB}
                  </p>
                </div>
              )) : (
                <p className="py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Scoring events will appear here</p>
              )}
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6">
            <h2 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/10 pb-4 mb-4">
              Match Announcements
            </h2>
            <div className="space-y-4">
              <textarea
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Type a short update for visitors..."
                className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-medium focus:outline-none focus:border-accent text-white resize-none"
              />
              <button 
                onClick={handleAddAnnouncement}
                disabled={saving || !announcement.trim()}
                className="w-full h-12 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Post Announcement
              </button>
            </div>

            {/* Current Announcements */}
            <div className="mt-6 space-y-3">
              {match.announcements?.map((ann, i) => (
                <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5 text-xs text-slate-300">
                  {ann}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
