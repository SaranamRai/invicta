import { Router } from "express";
import { listPublic } from "../controllers/publicController.js";

const router = Router();

router.get("/sports", listPublic("sports"));
router.get("/fixtures", listPublic("fixtures"));
router.get("/live-scores", listPublic("live-scores"));
router.get("/live-feeds", listPublic("live-feeds"));
router.get("/results", listPublic("results"));
router.get("/announcements", listPublic("announcements"));
router.get("/rules", listPublic("rules"));
router.get("/points-table", listPublic("points-table"));
router.get("/gallery", listPublic("gallery"));
router.get("/teams", listPublic("teams"));

export default router;
