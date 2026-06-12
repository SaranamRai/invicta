import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";
import Volunteer from "../models/Volunteer.js";
import Coordinator from "../models/Coordinator.js";
import SuperCoordinator from "../models/SuperCoordinator.js";

const roleModels = [
  { role: "admin", model: Admin },
  { role: "supercoordinator", model: SuperCoordinator },
  { role: "volunteer", model: Volunteer },
  { role: "coordinator", model: Coordinator },
];

function normalizeSport(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function signToken(account, role) {
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
    { expiresIn: "7d" }
  );
}

async function sendRoleAccountEmail({ account, role, password }) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || smtpUser;
  const loginLink = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000/login";

  if (!smtpHost || !smtpUser || !smtpPass || !from) {
    return { sent: false, skipped: true };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: { user: smtpUser, pass: smtpPass },
    });
    const roleLabel = role === "coordinator" ? "Coordinator" : role === "volunteer" ? "Volunteer" : role;
    const assignedSport = account.assignedSport || "your assigned sport";

    await transporter.sendMail({
      from,
      to: account.email,
      subject: `INVlCTA ${roleLabel} Account`,
      text: [
        `Hello ${account.name},`,
        "",
        `You have been selected as ${roleLabel} for ${assignedSport} in INVlCTA Sports Management System.`,
        "",
        `Name: ${account.name}`,
        `Email/Username: ${account.email}`,
        `Role: ${roleLabel}`,
        `Assigned sport: ${assignedSport}`,
        `Password: ${password}`,
        `Login link: ${loginLink}`,
      ].join("\n"),
    });

    return { sent: true };
  } catch (error) {
    console.error(`Failed to send ${role} account email:`, error);
    return { sent: false, error };
  }
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

    return res.json({
      token: signToken(account, role),
      role,
      name: account.name,
      id: account._id,
      email: account.email,
      department: account.department || "",
      assignedSport: account.assignedSport?.toString?.() || "",
    });
  }

  return res.status(403).json({ message: "Access denied" });
}

export async function createRoleAccount(model, role, req, res) {
  const { name, email, password, ...rest } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = await Promise.any(
    roleModels.map(({ model: roleModel }) => roleModel.findOne({ email: normalizedEmail }))
  ).catch(() => null);

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

  const emailResult = role === "coordinator" || role === "volunteer"
    ? await sendRoleAccountEmail({ account, role, password })
    : { sent: false, skipped: true };

  return res.status(201).json({
    id: account._id,
    name: account.name,
    email: account.email,
    role,
    assignedSport: account.assignedSport || "",
    registrationNumber: account.registrationNumber || "",
    phone: account.phone || "",
    message: emailResult.sent || emailResult.skipped
      ? "Account created successfully."
      : "Account created, but email could not be sent.",
  });
}
