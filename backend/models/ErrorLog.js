import mongoose from "mongoose";

const errorLogSchema = new mongoose.Schema(
  {
    errorType: { type: String, trim: true, default: "api_error" },
    route: { type: String, trim: true },
    method: { type: String, trim: true },
    statusCode: { type: Number, default: 0 },
    message: { type: String, trim: true },
    userRole: { type: String, trim: true },
    userEmail: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    ip: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("ErrorLog", errorLogSchema);
