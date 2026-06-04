import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport", required: true },
    captainName: { type: String, trim: true },
    viceCaptainName: { type: String, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Team", teamSchema);
