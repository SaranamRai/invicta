import mongoose from "mongoose";

const errorLogSchema = new mongoose.Schema(
  {
    type: { type: String, default: "Error" },
    route: { type: String, default: "", index: true },
    method: { type: String, default: "" },
    statusCode: { type: Number, default: 500, index: true },
    message: { type: String, default: "" },
    userRole: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

errorLogSchema.index({ createdAt: -1 });

export default mongoose.models.ErrorLog || mongoose.model("ErrorLog", errorLogSchema);
