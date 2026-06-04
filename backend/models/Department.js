import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    coordinatorId: { type: mongoose.Schema.Types.ObjectId, ref: "Coordinator" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Department", departmentSchema);
