import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId },
    postedByRole: { type: String, enum: ["admin", "supercoordinator", "volunteer", "coordinator"], required: true },
    priority: { type: String, enum: ["normal", "important", "urgent"], default: "normal" },
    visibleToPublic: { type: Boolean, default: true },
    attachmentName: { type: String, trim: true },
    attachmentType: { type: String, trim: true },
    attachmentHtml: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Announcement", announcementSchema);
