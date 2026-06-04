import mongoose from "mongoose";

const fixtureSchema = new mongoose.Schema(
  {
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport", required: true },
    matchTitle: { type: String, required: true, trim: true },
    teamA: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    teamB: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    venue: { type: String, trim: true },
    date: { type: String, trim: true },
    time: { type: String, trim: true },
    round: { type: String, trim: true },
    status: {
      type: String,
      enum: ["upcoming", "live", "half-time", "completed", "delayed", "cancelled"],
      default: "upcoming",
    },
    assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: "Volunteer" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Fixture", fixtureSchema);
