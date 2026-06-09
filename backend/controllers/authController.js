import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";
import Volunteer from "../models/Volunteer.js";
import Coordinator from "../models/Coordinator.js";
import SuperCoordinator from "../models/SuperCoordinator.js";
import Sport from "../models/Sport.js";
import { sendAccountCreatedEmail } from "../utils/emailService.js";

const roleModels = [
  { role: "admin", model: Admin },
  { role: "supercoordinator", model: SuperCoordinator },
  { role: "volunteer", model: Volunteer },
  { role: "coordinator", model: Coordinator },
];

function normalizeSport(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

async function resolveAssignedSport(rest) {
  const sportId = rest.assignedSportId || rest.sportId;
  const sportText = normalizeText(rest.assignedSportName || rest.assignedSport || rest.sport);
  let sport = null;

  if (sportId) {
    sport = await Sport.findById(sportId);
    if (!sport) {
      const error = new Error("Assigned sport was not found");
      error.status = 400;
      throw error;
    }
  } else if (sportText) {
    sport = await Sport.findOne({
      $or: [
        { sportName: new RegExp(`^${sportText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        { name: new RegExp(`^${sportText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        { sport: normalizeSport(sportText) },
      ],
    });

    if (!sport) {
      const sports = await Sport.find({ status: "active" }).lean();
      sport = sports.find((item) =>
        normalizeSport(item.sportName || item.name) === normalizeSport(sportText)
      );
    }
  }

  if (!sport) return {};

  const assignedSportName = sport.sportName || sport.name;
  return {
    assignedSportId: sport._id,
    assignedSportName,
    assignedSport: normalizeSport(assignedSportName),
  };
}

function signToken(account, role) {
  return jwt.sign(
    {
      userId: account._id.toString(),
      id: account._id.toString(),
      role,
      name: account.name,
      email: account.email,
      department: account.department || "",
      assignedSport: account.assignedSport?.toString?.() || "",
      assignedSportId: account.assignedSportId?.toString?.() || "",
      assignedSportName: account.assignedSportName || "",
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
      assignedSportId: account.assignedSportId?.toString?.() || "",
      assignedSportName: account.assignedSportName || "",
    });
  }

  return res.status(403).json({ message: "Access denied" });
}

export async function createRoleAccount(model, role, req, res) {
  const { name, email, password, registrationNo, phone, ...rest } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email))) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingAccounts = await Promise.all(
    roleModels.map(({ model: roleModel }) => roleModel.findOne({ email: normalizedEmail }).lean())
  );
  const exists = existingAccounts.some(Boolean);

  if (exists) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  // Validate assignedSportId exists in MongoDB if provided
  const sportId = rest.assignedSportId || rest.sportId;
  if (sportId) {
    const sportExists = await Sport.findById(sportId);
    if (!sportExists) {
      return res.status(400).json({ message: "Assigned sport was not found" });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  let assignedSportFields = {};
  try {
    assignedSportFields = await resolveAssignedSport(rest);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  const isCoordinator = role === "coordinator";

  let account;
  try {
    account = await model.create({
      ...rest,
      ...assignedSportFields,
      name,
      registrationNo: registrationNo || undefined,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      phone: phone || undefined,
      createdBy: req.user?.id,
      createdByRole: req.user?.role,
      mustChangePassword: isCoordinator ? true : undefined,
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    throw error;
  }

  // Attempt to send email
  let emailSent = false;
  try {
    await sendAccountCreatedEmail({
      name: account.name,
      email: account.email,
      role,
      assignedSport: account.assignedSportName || account.assignedSport || "",
      password,
      registrationNo: account.registrationNo,
    });
    emailSent = true;
  } catch (emailError) {
    console.error("[EMAIL] Failed to send account creation email:", emailError);
  }

  const response = {
    id: account._id,
    name: account.name,
    email: account.email,
    role,
    registrationNo: account.registrationNo || "",
    phone: account.phone || "",
    assignedSport: account.assignedSport || "",
    assignedSportId: account.assignedSportId?.toString?.() || "",
    assignedSportName: account.assignedSportName || "",
    mustChangePassword: account.mustChangePassword || false,
    emailSent,
  };

  if (emailSent) {
    response.message = "Account created successfully";
    return res.status(201).json(response);
  }

  response.message = "Coordinator created, but email could not be sent.";
  return res.status(201).json(response);
}
