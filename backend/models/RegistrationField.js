import mongoose from "mongoose";

const registrationFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ["text", "email", "tel"], default: "text" },
    enabled: { type: Boolean, default: true },
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("RegistrationField", registrationFieldSchema);
