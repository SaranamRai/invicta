import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    registrationNo: { type: String, required: true, trim: true, uppercase: true },
    department: { type: String, default: "" },
    semester: { type: String, default: "" },
    gender: { type: String, enum: ["", "Male", "Female"], default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: false }
);

const teamRegistrationSchema = new mongoose.Schema(
  {
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport", required: true },
    sportName: { type: String, required: true, trim: true },
    category: { type: String, enum: ["Male", "Female"], required: true },
    department: { type: String, required: true, trim: true, uppercase: true },
    teamName: { type: String, required: true, trim: true },
    teamLogo: { type: String, default: "" },
    captainName: { type: String, required: true, trim: true },
    captainRegNo: { type: String, required: true, trim: true, uppercase: true },
    captainEmail: { type: String, required: true, trim: true, lowercase: true },
    captainPhone: { type: String, required: true, trim: true },
    members: { type: [memberSchema], default: [] },
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
