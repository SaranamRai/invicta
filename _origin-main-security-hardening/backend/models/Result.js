import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    fixtureId: { type: mongoose.Schema.Types.ObjectId, ref: "Fixture", required: true },
    winnerTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    loserTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    finalScore: { type: String, trim: true },
    verifiedByAdmin: { type: Boolean, default: false },
    submittedBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model("Result", resultSchema);
