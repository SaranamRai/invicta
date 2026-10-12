import mongoose from "mongoose";

import ApiLog from "../models/ApiLog.js";
import AuditLog from "../models/AuditLog.js";
import ErrorLog from "../models/ErrorLog.js";
import { getDBStatus } from "../config/db.js";
import { getSmtpStatus } from "../utils/emailService.js";

const startedAt = Date.now();

function since(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sendCsv(res, filename, rows, columns) {
  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(csv);
}

export async function monitoringSummary(_req, res) {
  const [database, smtp, failedLoginAttempts, activeUsers, slowApis, recentErrors, recentAudits, avgApiResponse] = await Promise.all([
    getDBStatus(),
    getSmtpStatus(),
    AuditLog.countDocuments({ action: "failed_login", createdAt: { $gte: since(60) } }),
    AuditLog.distinct("userId", { userId: { $ne: "" }, createdAt: { $gte: since(30) } }),
    ApiLog.find({ responseTimeMs: { $gte: 1000 } }).sort({ responseTimeMs: -1, createdAt: -1 }).limit(10).lean(),
    ErrorLog.find({}).sort({ createdAt: -1 }).limit(10).lean(),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(10).lean(),
    ApiLog.aggregate([
      { $match: { createdAt: { $gte: since(15) } } },
      { $group: { _id: null, averageMs: { $avg: "$responseTimeMs" }, count: { $sum: 1 } } },
    ]),
  ]);

  return res.json({
    backend: "online",
    mongodb: database.connected ? "connected" : "disconnected",
    database,
    smtp,
    socketIo: "not_configured",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    activeUsers: activeUsers.length,
    failedLoginAttempts,
    apiResponseTimeMs: Math.round(avgApiResponse[0]?.averageMs || 0),
    apiSamples: avgApiResponse[0]?.count || 0,
    slowApis,
    recentErrors,
    recentAudits,
  });
}

export async function listAuditLogs(_req, res) {
  const rows = await AuditLog.find({}).sort({ createdAt: -1 }).limit(100).lean();
  return res.json(rows);
}

export async function listErrorLogs(_req, res) {
  const rows = await ErrorLog.find({}).sort({ createdAt: -1 }).limit(100).lean();
  return res.json(rows);
}

export async function downloadAuditLogs(_req, res) {
  const rows = await AuditLog.find({}).sort({ createdAt: -1 }).limit(1000).lean();
  return sendCsv(res, "invicta-audit-logs.csv", rows, [
    "createdAt",
    "action",
    "method",
    "route",
    "statusCode",
    "responseTimeMs",
    "userId",
    "userRole",
    "ipAddress",
    "browser",
  ]);
}

export async function downloadErrorLogs(_req, res) {
  const rows = await ErrorLog.find({}).sort({ createdAt: -1 }).limit(1000).lean();
  return sendCsv(res, "invicta-error-logs.csv", rows, [
    "createdAt",
    "method",
    "route",
    "statusCode",
    "errorMessage",
    "userId",
    "userRole",
    "ipAddress",
    "browser",
  ]);
}

export function socketStatus(_req, res) {
  return res.json({
    status: "not_configured",
    secureTransport: process.env.NODE_ENV === "production" ? "wss_required" : "ws_allowed_in_development",
    readyState: mongoose.connection.readyState,
  });
}
