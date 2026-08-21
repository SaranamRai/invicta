import mongoose from "mongoose";

const coordinatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    registrationNo: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["coordinator"], default: "coordinator" },
    department: { type: String, trim: true },
    assignedSport: { type: String, trim: true, lowercase: true },
    assignedSportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
    assignedSportName: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    createdByRole: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    phone: { type: String, trim: true },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Coordinator", coordinatorSchema);
