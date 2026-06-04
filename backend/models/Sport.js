import mongoose from "mongoose";

const sportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    playersPerTeam: { type: Number, default: 1 },
    substitutes: { type: Number, default: 0 },
    rules: { type: String, default: "" },
    status: { type: String, default: "active" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Sport", sportSchema);
