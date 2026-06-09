import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcryptjs";

import { connectDB } from "./config/db.js";
import Admin from "./models/Admin.js";
import Coordinator from "./models/Coordinator.js";
import Volunteer from "./models/Volunteer.js";
import authRoutes from "./routes/authRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import volunteerRoutes from "./routes/volunteerRoutes.js";
import coordinatorRoutes from "./routes/coordinatorRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET not set in environment — using temporary development secret");
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
}
const defaultAccounts = [
  {
    role: "admin",
    model: Admin,
    name: process.env.ADMIN_NAME || "Admin",
    email: process.env.ADMIN_EMAIL || "admin@gmail.com",
    password: process.env.ADMIN_PASSWORD || "1234",
  },
  {
    role: "volunteer",
    model: Volunteer,
    name: process.env.VOLUNTEER_NAME || "Volunteer",
    email: process.env.VOLUNTEER_EMAIL || "volunteer@gmail.com",
    password: process.env.VOLUNTEER_PASSWORD || "1234",
  },
  {
    role: "coordinator",
    model: Coordinator,
    name: process.env.COORDINATOR_NAME || "Coordinator",
    email: process.env.COORDINATOR_EMAIL || "coordinator@gmail.com",
    password: process.env.COORDINATOR_PASSWORD || "1234",
    department: process.env.COORDINATOR_DEPARTMENT || "",
  },
  {
    role: "coordinator",
    model: Coordinator,
    name: process.env.SUPER_COORDINATOR_NAME || "Super Coordinator",
    email: process.env.SUPER_COORDINATOR_EMAIL || "supercoordinator@gmail.com",
    password: process.env.SUPER_COORDINATOR_PASSWORD || "1234",
    department: process.env.SUPER_COORDINATOR_DEPARTMENT || "All",
  },
];

async function ensureDefaultAccounts() {
  for (const account of defaultAccounts) {
    const email = account.email.trim().toLowerCase();
    const existingAccount = await account.model.findOne({ email });
    if (existingAccount) continue;

    await account.model.create({
      name: account.name,
      email,
      password: await bcrypt.hash(account.password, 12),
      department: account.department,
    });

    console.log(`Default ${account.role} account created: ${email}`);
  }
}

app.use(cors({
  origin: process.env.CLIENT_URL || "http://127.0.0.1:3000",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "sports-management-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/volunteer", volunteerRoutes);
app.use("/api/coordinator", coordinatorRoutes);

app.use((error, _req, res, next) => {
  void next;
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "Server error" });
});

await connectDB();
await ensureDefaultAccounts();

app.listen(port, () => {
  console.log(`API server running on http://127.0.0.1:${port}`);
});
