import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    method: { type: String, required: true },
    route: { type: String, required: true, index: true },
    statusCode: { type: Number, required: true },
    responseTimeMs: { type: Number, default: 0 },
    userId: { type: String, default: "" },
    userRole: { type: String, default: "anonymous", index: true },
    ipAddress: { type: String, default: "" },
    browser: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
