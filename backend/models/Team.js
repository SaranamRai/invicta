import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    sport: { type: String, required: true, trim: true, lowercase: true },
    sportName: { type: String, trim: true },
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" },
    tournamentName: { type: String, trim: true },
    source: { type: String, enum: ["manual", "registration"], default: "manual" },
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: "TeamRegistration", default: null },
    category: { type: String, enum: ["Male", "Female", "Mixed"], default: "Male" },
    captainName: { type: String, trim: true },
    captainRegNo: { type: String, trim: true, uppercase: true },
    captainEmail: { type: String, trim: true, lowercase: true },
    captainPhone: { type: String, trim: true },
    captainProfilePhoto: { type: String },
    captainIdCardImage: { type: String },
    contactNumber: { type: String, trim: true },
    email: { type: String, trim: true },
    viceCaptainName: { type: String, trim: true },
    members: [{ type: mongoose.Schema.Types.Mixed }],
    logo: { type: String },
    status: { type: String, enum: ["draft", "ready", "registered", "pending", "approved", "completed", "withdrawn", "rejected"], default: "draft" },
    submittedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    registeredAt: { type: Number },
    playerRegisteredAt: [{ type: Number }],
    createdBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);


export default mongoose.model("Team", teamSchema);
