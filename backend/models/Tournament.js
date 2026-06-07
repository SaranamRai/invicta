import mongoose from "mongoose";

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sport: { type: String, required: true, trim: true, lowercase: true },
    startDate: { type: String, trim: true },
    endDate: { type: String, trim: true },
    registrationOpen: { type: Boolean, default: false },
    type: { type: String, enum: ["round-robin", "knockout"], default: "round-robin" },
    status: { type: String, enum: ["upcoming", "ongoing", "completed"], default: "upcoming" },
    teamsCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Tournament", tournamentSchema);
