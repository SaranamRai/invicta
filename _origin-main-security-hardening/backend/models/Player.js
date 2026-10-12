import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNo: { type: String, trim: true },
    registrationNo: { type: String, trim: true },
    department: { type: String, trim: true },
    semester: { type: String, trim: true },
    phone: { type: String, trim: true },
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    isCaptain: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Player", playerSchema);
