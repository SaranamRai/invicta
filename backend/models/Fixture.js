import mongoose from "mongoose";

const fixtureSchema = new mongoose.Schema(
  {
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport", required: true },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" },
    tournamentName: { type: String, trim: true },
    sport: { type: String, required: true, trim: true, lowercase: true },
    sportName: { type: String, trim: true },
    // Competition category is match identity, not a player-gender inference.
    category: { type: String, enum: ["Male", "Female", "Mixed"], required: true, trim: true },
    matchTitle: { type: String, required: true, trim: true },
    teamA: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    teamB: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    teamAName: { type: String, trim: true },
    teamBName: { type: String, trim: true },
    departmentA: { type: String, trim: true },
    departmentB: { type: String, trim: true },
    venue: { type: String, trim: true },
    date: { type: String, trim: true },
    time: { type: String, trim: true },
    startTime: { type: Date },
    endTime: { type: Date },
    fullMatchSeconds: { type: Number, default: 90 * 60 },
    matchGapMinutes: { type: Number, default: 0 },
    scoreA: { type: Number, default: 0 },
    scoreB: { type: Number, default: 0 },
    endedAt: { type: String },
    round: { type: String, trim: true },
    status: {
      type: String,
      enum: ["upcoming", "live", "paused", "half-time", "completed", "delayed", "cancelled"],
      default: "upcoming",
    },
    timerStartedAt: { type: Number },
    timerPausedAt: { type: Number },
    totalPausedMs: { type: Number, default: 0 },
    pausePeriods: [{ type: mongoose.Schema.Types.Mixed }],
    completedAt: { type: Number },
    isCompleted: { type: Boolean, default: false },
    assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: "Volunteer" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

fixtureSchema.index({ date: 1, time: 1 });
fixtureSchema.index({ date: 1, status: 1, tournamentId: 1, sportId: 1, category: 1 });
fixtureSchema.index({ tournamentId: 1, sportId: 1, status: 1 });
fixtureSchema.index({ tournamentId: 1, sportId: 1, category: 1, status: 1 });

export default mongoose.model("Fixture", fixtureSchema);
