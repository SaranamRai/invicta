import mongoose from "mongoose";

const apiLogSchema = new mongoose.Schema(
  {
    method: { type: String, required: true },
    path: { type: String, required: true, index: true },
    statusCode: { type: Number, required: true, index: true },
    durationMs: { type: Number, required: true },
    isSlow: { type: Boolean, default: false, index: true },
    userRole: { type: String, default: "" },
    userEmail: { type: String, default: "" },
  },
  { timestamps: true }
);

apiLogSchema.index({ createdAt: -1 });

export default mongoose.models.ApiLog || mongoose.model("ApiLog", apiLogSchema);
