import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, trim: true, required: true },
    performedBy: { type: String, trim: true },
    role: { type: String, trim: true },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    route: { type: String, trim: true },
    ip: { type: String, trim: true },
    device: { type: String, trim: true },
    details: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("AuditLog", auditLogSchema);
