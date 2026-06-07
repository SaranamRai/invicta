import mongoose from "mongoose";

const liveFeedSchema = new mongoose.Schema(
  {
    fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture" },
    message: { type: String, required: true, trim: true },
    imageUrl: { type: String },
    volunteerEmail: { type: String, trim: true },
    type: {
      type: String,
      enum: ["goal", "wicket", "point", "foul", "injury", "timeout", "announcement", "delay", "result"],
      default: "announcement",
    },
    addedBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("LiveFeed", liveFeedSchema);
