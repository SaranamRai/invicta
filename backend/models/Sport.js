import mongoose from "mongoose";

const sportSchema = new mongoose.Schema(
  {
    sportName: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    categories: {
      type: [String],
      enum: ["Male", "Female"],
      default: ["Male", "Female"],
    },
    type: { type: String, enum: ["indoor", "outdoor"], default: "outdoor" },
    rules: { type: String, default: "" },
    maxPlayers: { type: Number, default: 1, min: 1 },
    minPlayers: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

sportSchema.pre("validate", function syncLegacyName(next) {
  if (!this.sportName && this.name) this.sportName = this.name;
  if (!this.name && this.sportName) this.name = this.sportName;
  next();
});

export default mongoose.model("Sport", sportSchema);
