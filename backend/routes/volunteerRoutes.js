import { Router } from "express";
import {
  assignedMatches,
  createIssue,
  createLiveFeed,
  submitResult,
  updateLiveScore,
  uploadGallery,
} from "../controllers/volunteerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authMiddleware, allowRoles("volunteer"));

router.get("/assigned-matches", assignedMatches);
router.put("/live-scores/:fixtureId", updateLiveScore);
router.post("/live-feeds", createLiveFeed);
router.post("/gallery", uploadGallery);
router.post("/issues", createIssue);
router.post("/results/submit", submitResult);

export default router;
