import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";

import { connectDB, getDBStatus } from "./config/db.js";
import Admin from "./models/Admin.js";
import SuperCoordinator from "./models/SuperCoordinator.js";
import Coordinator from "./models/Coordinator.js";
import Volunteer from "./models/Volunteer.js";
import authRoutes from "./routes/authRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import volunteerRoutes from "./routes/volunteerRoutes.js";
import coordinatorRoutes from "./routes/coordinatorRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import Sport from "./models/Sport.js";
import { getRecommendedPlayerCount } from "./utils/sportPlayerCounts.js";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET not set in environment - using temporary development secret");
  process.env.JWT_SECRET ||= "dev_secret_change_me";
}

const app = express();
const port = process.env.PORT || 5000;
const defaultAccounts = [
  {
    role: "admin",
    model: Admin,
    name: process.env.ADMIN_NAME || "Admin",
    email: process.env.ADMIN_EMAIL || "admin@gmail.com",
    password: process.env.ADMIN_PASSWORD || "1234",
  },
  {
    role: "supercoordinator",
    model: SuperCoordinator,
    name: process.env.SUPERCOORDINATOR_NAME || "Super Coordinator",
    email: process.env.SUPERCOORDINATOR_EMAIL || "supercoordinator@gmail.com",
    password: process.env.SUPERCOORDINATOR_PASSWORD || "1234",
  },
  {
    role: "volunteer",
    model: Volunteer,
    name: process.env.VOLUNTEER_NAME || "Volunteer",
    email: process.env.VOLUNTEER_EMAIL || "volunteer@gmail.com",
    password: process.env.VOLUNTEER_PASSWORD || "1234",
  },
  {
    role: "volunteer",
    model: Volunteer,
    name: process.env.FOOTBALL_VOLUNTEER_NAME || "Football Volunteer",
    email: process.env.FOOTBALL_VOLUNTEER_EMAIL || "volunteerfootball@gmail.com",
    password: process.env.FOOTBALL_VOLUNTEER_PASSWORD || "1234",
    assignedSport: "football",
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
    name: process.env.FOOTBALL_COORDINATOR_NAME || "Football Coordinator",
    email: process.env.FOOTBALL_COORDINATOR_EMAIL || "coordinatorfootball@gmail.com",
    password: process.env.FOOTBALL_COORDINATOR_PASSWORD || "1234",
    department: process.env.FOOTBALL_COORDINATOR_DEPARTMENT || "",
    assignedSport: "football",
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
      assignedSport: account.assignedSport,
    });

    console.log(`Default ${account.role} account created: ${email}`);
  }
}

async function ensureLegacySportPlayerCounts() {
  const sports = await Sport.find({
    status: "active",
    $or: [
      { maxPlayers: { $exists: false } },
      { maxPlayers: { $lte: 1 } },
      { minPlayers: { $exists: false } },
    ],
  });

  for (const sport of sports) {
    const recommended = getRecommendedPlayerCount(sport.sportName || sport.name);
    if (!recommended || recommended <= 1) continue;

    sport.minPlayers = recommended;
    sport.maxPlayers = recommended;
    await sport.save();
    console.log(`Updated ${sport.sportName || sport.name} player count to ${recommended}`);
  }
}

console.log("CLIENT_URL:", process.env.CLIENT_URL);
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.FRONTEND_ORIGIN,
  vercelUrl,
  process.env.ALLOWED_ORIGINS,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
]
  .filter(Boolean)
  .flatMap((origin) => String(origin).split(","))
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter((origin, index, self) => origin && self.indexOf(origin) === index);

console.log("Allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.trim().replace(/\/$/, "");

      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }

      if (cleanOrigin.endsWith(".vercel.app") && process.env.NODE_ENV === "production") {
        return callback(null, true);
      }

      console.error("Blocked by CORS:", cleanOrigin);
      console.error("Allowed origins:", allowedOrigins);

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", async (_req, res, next) => {
  try {
    res.json({
      status: "ok",
      service: "sports-management-api",
      database: await getDBStatus(),
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/volunteer", volunteerRoutes);
app.use("/api/coordinator", coordinatorRoutes);
app.use("/api/registrations", registrationRoutes);

app.use((error, _req, res, next) => {
  void next;
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "Server error" });
});

await connectDB();
await ensureDefaultAccounts();
await ensureLegacySportPlayerCounts();

app.listen(port, "127.0.0.1", () => {
  console.log(`API server running on http://127.0.0.1:${port}`);
});
