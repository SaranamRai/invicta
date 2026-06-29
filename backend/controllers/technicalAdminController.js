import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import Admin from "../models/Admin.js";
import Announcement from "../models/Announcement.js";
import ApiLog from "../models/ApiLog.js";
import AuditLog from "../models/AuditLog.js";
import Coordinator from "../models/Coordinator.js";
import Department from "../models/Department.js";
import ErrorLog from "../models/ErrorLog.js";
import Fixture from "../models/Fixture.js";
import LiveScore from "../models/LiveScore.js";
import Result from "../models/Result.js";
import Rule from "../models/Rule.js";
import Sport from "../models/Sport.js";
import SuperCoordinator from "../models/SuperCoordinator.js";
import Team from "../models/Team.js";
import TeamRegistration from "../models/TeamRegistration.js";
import Tournament from "../models/Tournament.js";
import Venue from "../models/Venue.js";
import Volunteer from "../models/Volunteer.js";
import { getEmailErrorMessage, getEmailStatus, sendSmtpTestEmail } from "../utils/emailService.js";

const roleModels = {
  admin: Admin,
  supercoordinator: SuperCoordinator,
  coordinator: Coordinator,
  volunteer: Volunteer,
};

const monitoredCollections = {
  admins: Admin,
  superCoordinators: SuperCoordinator,
  coordinators: Coordinator,
  volunteers: Volunteer,
  sports: Sport,
  tournaments: Tournament,
  teams: Team,
  registrations: TeamRegistration,
  fixtures: Fixture,
  liveScores: LiveScore,
  results: Result,
  announcements: Announcement,
  rules: Rule,
  venues: Venue,
  departments: Department,
  apiLogs: ApiLog,
  errorLogs: ErrorLog,
  auditLogs: AuditLog,
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function toPlainUser(user, role) {
  return {
    id: String(user._id),
    name: user.name || "",
    email: user.email || "",
    role,
    status: user.status || "active",
    assignedSport: user.assignedSportName || user.assignedSport || "",
    department: user.department || "",
    createdAt: user.createdAt,
  };
}

function getUserModel(role) {
  return roleModels[String(role || "").toLowerCase()] || null;
}

function summarizeDbState() {
  const state = mongoose.connection.readyState;
  return {
    connected: state === 1,
    readyState: state,
    host: mongoose.connection.host || "",
    name: mongoose.connection.name || "",
  };
}

function buildLiveWarning(fixture, liveScore) {
  const warnings = [];
  const updatedAt = liveScore?.updatedAt ? new Date(liveScore.updatedAt) : null;
  if (fixture.status === "live" && updatedAt && Date.now() - updatedAt.getTime() > 10 * 60 * 1000) {
    warnings.push("No score update for more than 10 minutes");
  }
  if (fixture.status === "completed" && liveScore?.currentStatus === "live") {
    warnings.push("Fixture completed but live score is still live");
  }
  if (fixture.status === "live" && !liveScore) {
    warnings.push("Live fixture has no score record");
  }
  return warnings;
}

export async function health(_req, res, next) {
  try {
    const email = await getEmailStatus();
    res.json({
      environment: process.env.NODE_ENV || "development",
      frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || "",
      backendUrl: process.env.BACKEND_URL || process.env.API_URL || "",
      uptimeSeconds: Math.round(process.uptime()),
      database: summarizeDbState(),
      smtp: email,
      liveScoreService: { healthy: true, message: "Live scoring data model reachable." },
      deployment: {
        vercelUrl: process.env.VERCEL_URL || "",
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID || "",
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "",
        deployedAt: process.env.VERCEL_DEPLOYMENT_CREATED_AT || "",
      },
      appVersion: process.env.npm_package_version || "1.0.0",
      checkedAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
}

export async function stats(_req, res, next) {
  try {
    const today = startOfToday();
    const [apiToday, failedToday, notFoundToday, serverErrorsToday, latestError, routeUsage, registrationSummary, fixtureSummary, users] = await Promise.all([
      ApiLog.countDocuments({ createdAt: { $gte: today } }),
      ApiLog.countDocuments({ createdAt: { $gte: today }, statusCode: { $gte: 400 } }),
      ApiLog.countDocuments({ createdAt: { $gte: today }, statusCode: 404 }),
      ApiLog.countDocuments({ createdAt: { $gte: today }, statusCode: { $gte: 500 } }),
      ErrorLog.findOne().sort({ createdAt: -1 }).lean(),
      ApiLog.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: "$route", count: { $sum: 1 }, avgResponseTimeMs: { $avg: "$responseTimeMs" } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      TeamRegistration.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Fixture.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Promise.all(Object.entries(roleModels).map(async ([role, Model]) => {
        const docs = await Model.find().sort({ createdAt: -1 }).limit(50).lean();
        return docs.map((doc) => toPlainUser(doc, role));
      })),
    ]);

    const avgResponse = await ApiLog.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, avgResponseTimeMs: { $avg: "$responseTimeMs" } } },
    ]);

    res.json({
      api: {
        requestsToday: apiToday,
        failedToday,
        notFoundToday,
        serverErrorsToday,
        averageResponseTimeMs: Math.round(avgResponse[0]?.avgResponseTimeMs || 0),
        lastError: latestError,
        mostUsedRoutes: routeUsage.map((route) => ({
          route: route._id || "unknown",
          count: route.count,
          avgResponseTimeMs: Math.round(route.avgResponseTimeMs || 0),
        })),
      },
      registrations: Object.fromEntries(registrationSummary.map((item) => [item._id || "unknown", item.count])),
      fixtures: Object.fromEntries(fixtureSummary.map((item) => [item._id || "unknown", item.count])),
      users: users.flat(),
      checkedAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
}

export async function databaseStatus(_req, res, next) {
  try {
    const entries = await Promise.all(Object.entries(monitoredCollections).map(async ([key, Model]) => ({
      key,
      collection: Model.collection.name,
      count: await Model.countDocuments(),
    })));

    res.json({
      database: summarizeDbState(),
      collections: entries,
      checkedAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
}

export async function apiLogs(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 250);
    const filter = {};
    if (req.query.status) filter.statusCode = Number(req.query.status);
    if (req.query.route) filter.route = { $regex: String(req.query.route), $options: "i" };
    const logs = await ApiLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ logs });
  } catch (error) {
    next(error);
  }
}

export async function errorLogs(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 250);
    const filter = {};
    if (req.query.status) filter.statusCode = Number(req.query.status);
    if (req.query.route) filter.route = { $regex: String(req.query.route), $options: "i" };
    const logs = await ErrorLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ logs });
  } catch (error) {
    next(error);
  }
}

export async function auditLogs(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 250);
    const filter = {};
    if (req.query.role) filter.role = String(req.query.role);
    if (req.query.action) filter.action = { $regex: String(req.query.action), $options: "i" };
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ logs });
  } catch (error) {
    next(error);
  }
}

export async function liveMonitoring(_req, res, next) {
  try {
    const fixtures = await Fixture.find({ status: { $in: ["live", "paused", "half-time", "completed"] } })
      .sort({ startTime: -1, createdAt: -1 })
      .limit(80)
      .lean();
    const liveScores = await LiveScore.find({ fixtureId: { $in: fixtures.map((fixture) => fixture._id) } }).lean();
    const byFixture = new Map(liveScores.map((score) => [String(score.fixtureId), score]));

    res.json({
      matches: fixtures.map((fixture) => {
        const liveScore = byFixture.get(String(fixture._id));
        return {
          id: String(fixture._id),
          matchTitle: fixture.matchTitle,
          sport: fixture.sportName || fixture.sport,
          category: fixture.category,
          status: fixture.status,
          teamAName: fixture.teamAName,
          teamBName: fixture.teamBName,
          scoreA: liveScore?.teamAScore ?? fixture.scoreA ?? 0,
          scoreB: liveScore?.teamBScore ?? fixture.scoreB ?? 0,
          lastScoreUpdate: liveScore?.updatedAt || null,
          warnings: buildLiveWarning(fixture, liveScore),
        };
      }),
      checkedAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
}

export async function emailStatus(_req, res, next) {
  try {
    res.json(await getEmailStatus());
  } catch (error) {
    next(error);
  }
}

export async function testSmtp(req, res, next) {
  try {
    const toEmail = process.env.ADMIN_EMAIL || req.user?.email;
    const result = await sendSmtpTestEmail(toEmail);
    await AuditLog.create({
      action: "test_smtp",
      performedBy: req.user?.email,
      role: req.user?.role,
      status: result.sent ? "success" : "failed",
      route: req.originalUrl,
      ip: req.ip,
      device: req.get("user-agent") || "",
      details: result.message,
    });
    res.json(result);
  } catch (error) {
    next(Object.assign(error, { status: 500, message: getEmailErrorMessage(error) }));
  }
}

export async function testMongoDb(_req, res, next) {
  try {
    const started = Date.now();
    const ping = await mongoose.connection.db.admin().ping();
    res.json({
      ok: ping.ok === 1,
      responseTimeMs: Date.now() - started,
      database: summarizeDbState(),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSystemUserStatus(req, res, next) {
  try {
    const Model = getUserModel(req.params.role);
    if (!Model) return res.status(400).json({ message: "Unsupported role." });
    const status = req.body?.status === "inactive" ? "inactive" : "active";
    const user = await Model.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found." });

    await AuditLog.create({
      action: "update_user_status",
      performedBy: req.user?.email,
      role: req.user?.role,
      route: req.originalUrl,
      ip: req.ip,
      device: req.get("user-agent") || "",
      details: `${req.params.role}:${req.params.id}:${status}`,
    });

    return res.json({ user: toPlainUser(user, req.params.role) });
  } catch (error) {
    next(error);
  }
}

export async function resetSystemUserPassword(req, res, next) {
  try {
    const Model = getUserModel(req.params.role);
    if (!Model) return res.status(400).json({ message: "Unsupported role." });
    const temporaryPassword = String(req.body?.temporaryPassword || "1234");
    const user = await Model.findByIdAndUpdate(
      req.params.id,
      { password: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found." });

    await AuditLog.create({
      action: "reset_user_password",
      performedBy: req.user?.email,
      role: req.user?.role,
      route: req.originalUrl,
      ip: req.ip,
      device: req.get("user-agent") || "",
      details: `${req.params.role}:${req.params.id}`,
    });

    return res.json({ message: "Password reset to temporary value.", temporaryPassword, user: toPlainUser(user, req.params.role) });
  } catch (error) {
    next(error);
  }
}
