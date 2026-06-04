import mongoose from "mongoose";

const liveScoreSchema = new mongoose.Schema({
  fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture", required: true },
  teamAName: { type: String, trim: true },
  teamBName: { type: String, trim: true },
  teamAScore: { type: Number, default: 0 },
  teamBScore: { type: Number, default: 0 },
  currentStatus: { type: String, default: "upcoming" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("LiveScore", liveScoreSchema);
