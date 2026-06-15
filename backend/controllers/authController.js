import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";
import Volunteer from "../models/Volunteer.js";
import Coordinator from "../models/Coordinator.js";
import SuperCoordinator from "../models/SuperCoordinator.js";
import { getEmailErrorMessage, sendAccountCreatedEmail } from "../utils/emailService.js";

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
