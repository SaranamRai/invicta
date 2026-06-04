import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    sportType: { type: String, trim: true },
    status: { type: String, default: "available" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Venue", venueSchema);
