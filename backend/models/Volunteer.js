import mongoose from "mongoose";

const volunteerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["volunteer"], default: "volunteer" },
    assignedSport: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
    assignedFixture: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture" },
    phone: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Volunteer", volunteerSchema);
