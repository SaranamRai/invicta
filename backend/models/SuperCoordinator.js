import mongoose from "mongoose";

const superCoordinatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["supercoordinator"], default: "supercoordinator" },
    phone: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("SuperCoordinator", superCoordinatorSchema);
