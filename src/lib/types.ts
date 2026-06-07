export type MatchPeriod = "First Half" | "Half Time" | "Second Half" | "Full Time";

export interface ScoreEvent {
  id: string;
  team: "A" | "B";
  teamName: string;
  points: number;
  scoreA: number;
  scoreB: number;
  period: MatchPeriod;
  matchTime: string;
  elapsedSeconds: number;
  timestamp: number;
  volunteerEmail: string;
}

export interface MatchData {
  id: string;
  teamA: string;
  teamB: string;
  sport: string;
  type: string;
  scoreA: number;
  scoreB: number;
  status: "Upcoming" | "Live" | "Finished";
  time?: string;
  date?: string;
  venue?: string;
  lastUpdated: number;
  startedAt?: number;
  endedAt?: number;
  timerStartedAt?: number;
  elapsedSeconds?: number;
  fullMatchSeconds?: number;
  clockRunning?: boolean;
  period?: MatchPeriod;
  timer?: string;
  foulsA?: number;
  foulsB?: number;
  announcements?: string[];
  scoreEvents?: ScoreEvent[];
  imageUrl?: string;
}

export interface ActivityLog {
  id: string;
  matchId: string;
  action: string;
  timestamp: number;
  volunteerEmail: string;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: "info" | "warning" | "success";
  href?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentHtml?: string;
}

export interface LiveFeedPost {
  id: string;
  matchId: string;
  matchTitle: string;
  content: string;
  imageUrl?: string;
  timestamp: number;
  volunteerEmail: string;
}
