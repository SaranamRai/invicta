import mongoose from "mongoose";

const errorLogSchema = new mongoose.Schema(
  {
    route: { type: String, required: true, index: true },
    method: { type: String, required: true },
    errorMessage: { type: String, required: true },
    statusCode: { type: Number, default: 500 },
    stackTrace: { type: String, default: "" },
    userId: { type: String, default: "" },
    userRole: { type: String, default: "anonymous", index: true },
    ipAddress: { type: String, default: "" },
    browser: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.ErrorLog || mongoose.model("ErrorLog", errorLogSchema);
