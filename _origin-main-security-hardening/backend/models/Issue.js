import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId },
    reportedByRole: { type: String, enum: ["admin", "volunteer", "coordinator"], required: true },
    status: { type: String, enum: ["pending", "solved"], default: "pending" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Issue", issueSchema);
