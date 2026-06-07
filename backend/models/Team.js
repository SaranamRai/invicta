import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    sport: { type: String, required: true, trim: true, lowercase: true },
    sportName: { type: String, trim: true },
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
    captainName: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true },
    viceCaptainName: { type: String, trim: true },
    members: [{ type: String, trim: true }],
    logo: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    registeredAt: { type: Number },
    playerRegisteredAt: [{ type: Number }],
    createdBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Team", teamSchema);
