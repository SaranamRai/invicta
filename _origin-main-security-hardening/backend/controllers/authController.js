import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";
import Volunteer from "../models/Volunteer.js";
import Coordinator from "../models/Coordinator.js";
import SuperCoordinator from "../models/SuperCoordinator.js";
import { getEmailErrorMessage, sendAccountCreatedEmail } from "../utils/emailService.js";

const AUTH_COOKIE_NAME = "sportsAuthToken";
const REFRESH_COOKIE_NAME = "sportsRefreshToken";
const ACCESS_TOKEN_MAX_AGE_MS = 30 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const roleModels = [
  { role: "admin", model: Admin },
  { role: "supercoordinator", model: SuperCoordinator },
  { role: "volunteer", model: Volunteer },
  { role: "coordinator", model: Coordinator },
];

function normalizeSport(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function signAccessToken(account, role) {
  return jwt.sign(
    {
      id: account._id.toString(),
      role,
      name: account.name,
      email: account.email,
      department: account.department || "",
      assignedSport: account.assignedSport?.toString?.() || "",
    },
    process.env.JWT_SECRET,
    { expiresIn: "30m" }
  );
}

function signRefreshToken(account, role) {
  return jwt.sign(
    {
      id: account._id.toString(),
      role,
      tokenType: "refresh",
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function getCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  };
}

function getCookie(req, name) {
  const rawCookie = req.headers.cookie || "";
  return rawCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function toSession(account, role, token) {
  return {
    ...(token ? { token } : {}),
    role,
    name: account.name,
    id: account._id || account.id,
    email: account.email,
    department: account.department || "",
    assignedSport: account.assignedSport?.toString?.() || account.assignedSport || "",
    assignedSportId: account.assignedSportId?.toString?.() || account.assignedSportId || "",
    assignedSportName: account.assignedSportName || "",
  };
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  for (const { role, model } of roleModels) {
    const account = await model.findOne({ email: normalizedEmail });
    if (!account) continue;

    const passwordMatches = await bcrypt.compare(password, account.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signAccessToken(account, role);
    const refreshToken = signRefreshToken(account, role);
    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
    return res.json(toSession(account, role));
  }

  return res.status(403).json({ message: "Access denied" });
}

export function currentSession(req, res) {
  if (!req.user) {
    return res.status(401).json({ message: "Login required" });
  }

  return res.json({
    role: req.user.role,
    name: req.user.name,
    id: req.user.id,
    email: req.user.email,
    department: req.user.department || "",
    assignedSport: req.user.assignedSport || "",
    assignedSportId: req.user.assignedSportId || "",
    assignedSportName: req.user.assignedSportName || "",
  });
}

export function logout(_req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  return res.json({ message: "Logged out" });
}

export async function refreshSession(req, res) {
  const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
  if (!refreshToken) {
    return res.status(401).json({ message: "Login required" });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    if (payload.tokenType !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const roleModel = roleModels.find((entry) => entry.role === payload.role);
    if (!roleModel) return res.status(401).json({ message: "Invalid refresh token" });

    const account = await roleModel.model.findById(payload.id);
    if (!account) return res.status(401).json({ message: "Invalid refresh token" });

    const token = signAccessToken(account, roleModel.role);
    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
    return res.json(toSession(account, roleModel.role));
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
}

export async function createRoleAccount(model, role, req, res) {
  const { name, email, password, ...rest } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingAccounts = await Promise.all(
    roleModels.map(({ model: roleModel }) => roleModel.findOne({ email: normalizedEmail }).lean())
  );
  const exists = existingAccounts.find(Boolean);

  if (exists) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const assignedSport = normalizeSport(rest.assignedSport || rest.sport);
  const account = await model.create({
    ...rest,
    ...(assignedSport ? { assignedSport } : {}),
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role,
    createdBy: req.user?.id,
    createdByRole: req.user?.role,
  });

  const shouldSendDutyEmail = role === "coordinator" || role === "volunteer";
  let emailResult = { sent: false, skipped: !shouldSendDutyEmail };
  let emailErrorMessage = "";
  if (shouldSendDutyEmail) {
    try {
      emailResult = await sendAccountCreatedEmail({
        name: account.name,
        email: account.email,
        role,
        assignedSport: account.assignedSportName || account.assignedSport || "",
        password,
      });
    } catch (error) {
      console.error(`Failed to send ${role} account email:`, error);
      emailErrorMessage = getEmailErrorMessage(error);
      emailResult = { sent: false, skipped: false };
    }
  }

  return res.status(201).json({
    id: account._id,
    name: account.name,
    email: account.email,
    role,
    assignedSport: account.assignedSport || "",
    registrationNumber: account.registrationNumber || "",
    phone: account.phone || "",
    emailSent: emailResult.sent,
    message: emailResult.sent || !shouldSendDutyEmail
      ? "Account created successfully."
      : `Account created, but ${emailErrorMessage}`,
  });
}
