import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { matches } from "@/lib/mock-data";
import { MatchData } from "@/lib/types";

const matchStatuses: MatchData["status"][] = ["Upcoming", "Live", "Finished"];

const normalizeStatus = (status: string): MatchData["status"] => {
  return matchStatuses.includes(status as MatchData["status"])
    ? (status as MatchData["status"])
    : "Upcoming";
};

export async function GET() {
  try {
    for (const match of matches) {
      const matchData: MatchData = {
        id: match.id,
        teamA: match.teamA,
        teamB: match.teamB,
        sport: match.sport,
        type: match.type,
        scoreA: match.scoreA || 0,
        scoreB: match.scoreB || 0,
        status: normalizeStatus(match.status),
        time: match.time || "TBD",
        timer: "00:00",
        elapsedSeconds: 0,
        clockRunning: false,
        period: match.status === "Finished" ? "Full Time" : "First Half",
        lastUpdated: Date.now(),
        announcements: [],
        scoreEvents: [],
      };
      
      await setDoc(doc(db, "matches", match.id), matchData);
    }
    
    return NextResponse.json({ message: "Dummy data seeded successfully!" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed dummy data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
