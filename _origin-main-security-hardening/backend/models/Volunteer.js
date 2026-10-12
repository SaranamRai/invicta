import mongoose from "mongoose";

const volunteerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["volunteer"], default: "volunteer" },
    assignedSport: { type: String, trim: true, lowercase: true },
    assignedSportId: { type: mongoose.Schema.Types.ObjectId, ref: "Sport" },
    assignedSportName: { type: String, trim: true },
    assignedFixture: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture" },
    assignedMatches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Fixture" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    createdByRole: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    registrationNumber: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Volunteer", volunteerSchema);
