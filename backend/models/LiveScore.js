import mongoose from "mongoose";

const liveScoreSchema = new mongoose.Schema({
  fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture", required: true },
  teamAName: { type: String, trim: true },
  teamBName: { type: String, trim: true },
  teamAScore: { type: Number, default: 0 },
  teamBScore: { type: Number, default: 0 },
  currentStatus: { type: String, default: "upcoming" },
  timer: { type: String, trim: true },
  period: { type: String, trim: true },
  startedAt: { type: Number },
  endedAt: { type: Number },
  timerStartedAt: { type: Number },
  elapsedSeconds: { type: Number },
  fullMatchSeconds: { type: Number },
  clockRunning: { type: Boolean, default: false },
  announcements: [{ type: String, trim: true }],
  scoreEvents: [{ type: mongoose.Schema.Types.Mixed }],
  updatedBy: { type: mongoose.Schema.Types.ObjectId },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("LiveScore", liveScoreSchema);
