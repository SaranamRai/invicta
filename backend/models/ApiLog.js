import mongoose from "mongoose";

const apiLogSchema = new mongoose.Schema(
  {
    method: { type: String, trim: true },
    route: { type: String, trim: true },
    statusCode: { type: Number, default: 0 },
    responseTimeMs: { type: Number, default: 0 },
    userRole: { type: String, trim: true },
    userEmail: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    ip: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("ApiLog", apiLogSchema);
