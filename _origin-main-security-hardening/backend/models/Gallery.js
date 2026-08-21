import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId },
    uploadedByRole: { type: String, enum: ["admin", "volunteer", "coordinator"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Gallery", gallerySchema);
