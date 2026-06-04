import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";
import Volunteer from "../models/Volunteer.js";
import Coordinator from "../models/Coordinator.js";

const roleModels = [
  { role: "admin", model: Admin },
  { role: "volunteer", model: Volunteer },
  { role: "coordinator", model: Coordinator },
];

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
  const exists = await Promise.any(
    roleModels.map(({ model: roleModel }) => roleModel.findOne({ email: normalizedEmail }))
  ).catch(() => null);

  if (exists) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const account = await model.create({
    ...rest,
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role,
  });

  return res.status(201).json({
    id: account._id,
    name: account.name,
    email: account.email,
    role,
  });
}
