import mongoose from "mongoose";

const pointsTableSchema = new mongoose.Schema({
  department: { type: String, required: true, trim: true },
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
  matchesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("PointsTable", pointsTableSchema);
