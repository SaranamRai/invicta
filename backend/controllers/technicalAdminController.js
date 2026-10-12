import mongoose from "mongoose";

import ApiLog from "../models/ApiLog.js";
import AuditLog from "../models/AuditLog.js";
import ErrorLog from "../models/ErrorLog.js";
import Admin from "../models/Admin.js";
import Coordinator from "../models/Coordinator.js";
import SuperCoordinator from "../models/SuperCoordinator.js";
import Volunteer from "../models/Volunteer.js";
import Fixture from "../models/Fixture.js";
import LiveScore from "../models/LiveScore.js";
import { getDBStatus } from "../config/db.js";
import { getSmtpStatus, sendAdminSmtpTest } from "../utils/emailService.js";

const startTime = Date.now();

function todayFilter() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return { createdAt: { $gte: start } };
}

function formatUptime() {
  const totalSeconds = Math.floor(process.uptime());
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export async function adminHealth(_req, res) {
  const database = await getDBStatus();
  const smtp = getSmtpStatus();

  res.json({
    status: "ok",
    backend: "online",
    mongodb: database.connected ? "connected" : "disconnected",
    smtp: smtp.configured ? "configured" : "not_configured",
    uptime: formatUptime(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    startedAt: new Date(startTime).toISOString(),
    timestamp: new Date().toISOString(),
  });
}

export async function adminStats(_req, res) {
  const today = todayFilter();
  const [totalRequests, failedRequests, slowestRoutes, responseTimes, roleCounts, liveMatches] = await Promise.all([
    ApiLog.countDocuments(today),
    ApiLog.countDocuments({ ...today, statusCode: { $gte: 400 } }),
    ApiLog.find(today).sort({ durationMs: -1 }).limit(5).select("method path statusCode durationMs createdAt").lean(),
    ApiLog.aggregate([
      { $match: today },
      { $group: { _id: null, average: { $avg: "$durationMs" }, max: { $max: "$durationMs" } } },
    ]),
    Promise.all([
      Admin.countDocuments(),
      SuperCoordinator.countDocuments(),
      Coordinator.countDocuments(),
      Volunteer.countDocuments(),
    ]),
    LiveScore.countDocuments({ currentStatus: { $in: ["live", "paused", "half-time"] } }),
  ]);

  res.json({
    totalRequestsToday: totalRequests,
    failedRequestsToday: failedRequests,
    averageResponseTimeMs: Math.round(responseTimes[0]?.average || 0),
    slowestResponseTimeMs: Math.round(responseTimes[0]?.max || 0),
    slowestRoutes,
    roleCounts: {
      admin: roleCounts[0],
      supercoordinator: roleCounts[1],
      coordinator: roleCounts[2],
      volunteer: roleCounts[3],
    },
    liveMatches,
  });
}

export async function databaseStatus(_req, res) {
  res.json(await getDBStatus());
}

export async function apiLogs(req, res) {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  res.json(await ApiLog.find({}).sort({ createdAt: -1 }).limit(limit).lean());
}

export async function errorLogs(req, res) {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  res.json(await ErrorLog.find({}).sort({ createdAt: -1 }).limit(limit).lean());
}

export async function auditLogs(req, res) {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  res.json(await AuditLog.find({}).sort({ createdAt: -1 }).limit(limit).lean());
}

export async function liveMonitoring(_req, res) {
  const [liveScores, fixtures] = await Promise.all([
    LiveScore.find({ currentStatus: { $in: ["live", "paused", "half-time"] } }).sort({ updatedAt: -1 }).limit(25).lean(),
    Fixture.countDocuments({ status: { $in: ["live", "paused", "half-time"] } }),
  ]);
  res.json({ activeFixtureCount: fixtures, liveScores });
}

export function emailStatus(_req, res) {
  res.json(getSmtpStatus());
}

export async function testSmtp(req, res) {
  const result = await sendAdminSmtpTest(req.user?.email);
  res.json(result);
}

export async function testMongodb(_req, res) {
  const ok = mongoose.connection.readyState === 1;
  res.json({
    ok,
    readyState: mongoose.connection.readyState,
    database: mongoose.connection.name || "",
    timestamp: new Date().toISOString(),
  });
}
