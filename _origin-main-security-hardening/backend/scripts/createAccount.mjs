import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import Coordinator from "../models/Coordinator.js";
import Volunteer from "../models/Volunteer.js";

dotenv.config();

const roleMap = {
  admin: Admin,
  coordinator: Coordinator,
  volunteer: Volunteer,
};

async function main() {
  const [,, role, email, password, name = "Imported User", department = ""] = process.argv;
  if (!role || !email || !password) {
    console.error("Usage: node createAccount.mjs <role> <email> <password> [name] [department]");
    process.exit(1);
  }

  const Model = roleMap[role];
  if (!Model) {
    console.error("Role must be one of: admin, coordinator, volunteer");
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sports_management_db";
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = await Promise.any([
    Admin.findOne({ email: normalizedEmail }),
    Coordinator.findOne({ email: normalizedEmail }),
    Volunteer.findOne({ email: normalizedEmail }),
  ]).catch(() => null);

  if (exists) {
    console.error("An account with that email already exists.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  const data = { name, email: normalizedEmail, password: hashed };
  if (role === "coordinator") data.department = department;

  const created = await Model.create(data);
  console.log(`Created ${role} account: ${created.email} (id: ${created._id})`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
