import mongoose from "mongoose";

const idVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["verified", "mismatch", "unreadable", "manual_review", "pending", "old_registration"],
      default: "pending",
    },
    verified: { type: Boolean, default: false },
    extractedRegistrationNumber: { type: String, default: "" },
    confidence: { type: Number, default: 0 },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const memberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    registrationNo: { type: String, required: true, trim: true, uppercase: true },
    department: { type: String, default: "" },
    semester: { type: String, default: "" },
    gender: { type: String, enum: ["", "Male", "Female"], default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    idVerification: { type: idVerificationSchema, default: () => ({}) },
  },
  { _id: false }
);

const allPlayerSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    registrationNumber: { type: String, default: "" },
    role: { type: String, enum: ["captain", "member"], default: "member" },
    idVerified: { type: Boolean, default: false },
    idVerificationStatus: { type: String, default: "pending" },
  },
  { _id: false }
);

const teamRegistrationSchema = new mongoose.Schema(
  {
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport", required: true },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", default: null },
    tournamentName: { type: String, default: "", trim: true },
    sportName: { type: String, required: true, trim: true },
    category: { type: String, enum: ["Male", "Female"], required: true },
    department: { type: String, required: true, trim: true, uppercase: true },
    teamName: { type: String, required: true, trim: true },
    teamLogo: { type: String, default: "" },
    captainName: { type: String, required: true, trim: true },
    captainRegNo: { type: String, required: true, trim: true, uppercase: true },
    captainEmail: { type: String, required: true, trim: true, lowercase: true },
    captainPhone: { type: String, required: true, trim: true },
    captainIdVerification: { type: idVerificationSchema, default: () => ({}) },
    members: { type: [memberSchema], default: [] },
    allPlayers: { type: [allPlayerSchema], default: [] },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("TeamRegistration", teamRegistrationSchema);
