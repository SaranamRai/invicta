import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    venueName: { type: String, trim: true },
    location: { type: String, trim: true },
    sportType: { type: String, trim: true },
    capacity: { type: Number },
    status: { type: String, default: "active" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Venue", venueSchema);
