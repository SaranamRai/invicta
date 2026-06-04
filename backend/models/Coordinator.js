import mongoose from "mongoose";

const coordinatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["coordinator"], default: "coordinator" },
    department: { type: String, trim: true },
    assignedSport: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
    phone: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Coordinator", coordinatorSchema);
