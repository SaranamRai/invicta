import mongoose from "mongoose";

const ruleSchema = new mongoose.Schema(
  {
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
    title: { type: String, required: true, trim: true },
    rules: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Rule", ruleSchema);
