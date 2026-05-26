import { MatchData, MatchPeriod } from "@/lib/types";

export const DEFAULT_FULL_MATCH_SECONDS = 90 * 60;

export const formatMatchClock = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export const parseMatchClock = (timer?: string) => {
  if (!timer) return 0;

  const [minutes, seconds] = timer.split(":").map(value => Number.parseInt(value, 10));
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return 0;

  return minutes * 60 + seconds;
};

export const getMatchElapsedSeconds = (match: MatchData, now = Date.now()) => {
  const savedElapsed = match.elapsedSeconds ?? parseMatchClock(match.timer);

  if (now > 0 && match.status === "Live" && match.clockRunning && match.timerStartedAt) {
    return savedElapsed + Math.floor((now - match.timerStartedAt) / 1000);
  }

  return savedElapsed;
};

export const getMatchClockText = (match: MatchData, now = Date.now()) => {
  return formatMatchClock(getMatchElapsedSeconds(match, now));
};

export const getMatchPeriod = (match: MatchData): MatchPeriod => {
  if (match.period) return match.period;
  if (match.status === "Finished") return "Full Time";
  return "First Half";
};

export const getMatchFullTimeSeconds = (match: MatchData) => {
  return match.fullMatchSeconds && match.fullMatchSeconds > 0
    ? Math.floor(match.fullMatchSeconds)
    : DEFAULT_FULL_MATCH_SECONDS;
};

export const getClockStopState = (
  elapsedSeconds: number,
  period: MatchPeriod,
  fullMatchSeconds = DEFAULT_FULL_MATCH_SECONDS,
): { elapsedSeconds: number; period: MatchPeriod; status: MatchData["status"]; clockRunning: boolean } | null => {
  const fullTimeSeconds = Math.max(1, Math.floor(fullMatchSeconds));
  const halfTimeSeconds = Math.max(1, Math.floor(fullTimeSeconds / 2));

  if (elapsedSeconds >= fullTimeSeconds || period === "Full Time") {
    return {
      elapsedSeconds: fullTimeSeconds,
      period: "Full Time",
      status: "Finished",
      clockRunning: false,
    };
  }

  if (elapsedSeconds >= halfTimeSeconds && period === "First Half") {
    return {
      elapsedSeconds: halfTimeSeconds,
      period: "Half Time",
      status: "Live",
      clockRunning: false,
    };
  }

  return null;
};
