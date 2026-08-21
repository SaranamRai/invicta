import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import ApiLog from "../models/ApiLog.js";
import AuditLog from "../models/AuditLog.js";
import ErrorLog from "../models/ErrorLog.js";

const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|smtp|mongo|api[_-]?key/i;
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"],
      "img-src": ["'self'", "data:", "blob:", "https:"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'", "https:", "wss:"],
      "font-src": ["'self'", "data:"],
      "object-src": ["'none'"],
      "upgrade-insecure-requests": [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 15552000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

export const sanitizeInputs = [
  hpp(),
  mongoSanitize({
    replaceWith: "_",
  }),
];

function rateLimitMessage(message) {
  return { message };
}

export const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many public API requests. Please try again in a minute."),
});

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many login attempts. Please wait one minute and try again."),
});

export const registrationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many registration requests. Please wait one minute and try again."),
});

export const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many admin API requests. Please wait one minute and try again."),
});

export function enforceHttps(req, res, next) {
  if (process.env.NODE_ENV !== "production") return next();
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "").split(",")[0].trim();
  if (proto === "https" || req.secure) return next();
  if (!req.headers.host) return res.status(403).json({ message: "HTTPS is required" });
  return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
}

export function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || req.ip || "";
}

export function maskSensitive(value) {
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.test(key) ? "[REDACTED]" : maskSensitive(entry),
    ])
  );
}

function getAuditAction(req, statusCode) {
  if (req.originalUrl.includes("/auth/login")) {
    return statusCode < 400 ? "login" : "failed_login";
  }
  if (req.originalUrl.includes("/auth/logout")) return "logout";
  if (req.originalUrl.includes("/registrations") && req.method === "POST") return "registration";
  if (req.originalUrl.includes("/approve") || req.originalUrl.includes("/review")) return "registration_approval";
  if (req.originalUrl.includes("/fixtures/generate")) return "fixture_generation";
  if (req.originalUrl.includes("/live-scores")) return "score_update";
  if (req.originalUrl.includes("/results")) return "result_verification";
  if (req.originalUrl.includes("/announcements")) return "announcement_change";
  if (req.originalUrl.includes("/report")) return "report_generation";
  if (req.originalUrl.includes("/create-") || req.originalUrl.includes("/role-accounts")) {
    return req.method === "DELETE" ? "user_deletion" : "user_change";
  }
  return MUTATING_METHODS.has(req.method) ? "data_change" : "";
}

export function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const responseTimeMs = Date.now() - startedAt;
    const baseLog = {
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs,
      userId: req.user?.id || "",
      userRole: req.user?.role || "anonymous",
      ipAddress: getClientIp(req),
      browser: req.headers["user-agent"] || "",
    };

    void ApiLog.create(baseLog).catch(() => {});

    const action = getAuditAction(req, res.statusCode);
    if (action) {
      void AuditLog.create({
        ...baseLog,
        action,
        metadata: {
          params: maskSensitive(req.params || {}),
          query: maskSensitive(req.query || {}),
          body: maskSensitive(req.body || {}),
        },
      }).catch(() => {});
    }
  });

  return next();
}

export function errorLogger(error, req, res, _next) {
  const statusCode = error.status || error.statusCode || 500;

  void ErrorLog.create({
    route: req.originalUrl || req.url || "",
    method: req.method || "",
    errorMessage: error.message || "Server error",
    statusCode,
    stackTrace: process.env.NODE_ENV === "production" ? "" : error.stack || "",
    userId: req.user?.id || "",
    userRole: req.user?.role || "anonymous",
    ipAddress: getClientIp(req),
    browser: req.headers?.["user-agent"] || "",
  }).catch(() => {});

  const message = statusCode >= 500
    ? "Something went wrong. Please try again later."
    : error.message || "Request failed";
  return res.status(statusCode).json({ message });
}
