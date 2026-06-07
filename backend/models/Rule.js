import mongoose from "mongoose";

const ruleSchema = new mongoose.Schema(
  {
    sportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
    sport: { type: String, trim: true, lowercase: true },
    sportName: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    rules: { type: String, required: true },
    description: { type: String },
    attachmentData: { type: String },
    attachmentName: { type: String, trim: true },
    attachmentType: { type: String, trim: true },
    attachmentKind: { type: String, enum: ["document", "image"] },
    createdByName: { type: String, trim: true },
    createdByEmail: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Rule", ruleSchema);
