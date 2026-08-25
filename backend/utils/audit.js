import AuditLog from "../models/AuditLog.js";

export function audit(req, action, details = "") {
  return AuditLog.create({
    action,
    details,
    performedBy: req.user?.email || req.user?.id || "",
    role: req.user?.role || "",
    route: req.originalUrl || req.path || "",
    ip: req.ip || "",
    device: req.get?.("user-agent") || "",
  }).catch(() => {});
}
