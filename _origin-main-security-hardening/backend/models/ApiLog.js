import mongoose from "mongoose";

const apiLogSchema = new mongoose.Schema(
  {
    method: { type: String, required: true },
    route: { type: String, required: true, index: true },
    statusCode: { type: Number, required: true },
    responseTimeMs: { type: Number, required: true, index: true },
    userId: { type: String, default: "" },
    userRole: { type: String, default: "anonymous", index: true },
    ipAddress: { type: String, default: "" },
    browser: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.ApiLog || mongoose.model("ApiLog", apiLogSchema);
