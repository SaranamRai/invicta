import { Router } from "express";
import { listPublic, registerPublicTeam, getSportDetailView } from "../controllers/publicController.js";
import { askInvictaAssistant } from "../controllers/invictaAssistantController.js";

const router = Router();

router.post("/assistant", askInvictaAssistant);

router.get("/sports", listPublic("sports"));
router.get("/fixtures", listPublic("fixtures"));
router.get("/live-scores", listPublic("live-scores"));
router.get("/live-feeds", listPublic("live-feeds"));
router.get("/results", listPublic("results"));
router.get("/announcements", listPublic("announcements"));
router.get("/rules", listPublic("rules"));
router.get("/standings", listPublic("points-table"));
router.get("/points-table", listPublic("points-table"));
router.get("/gallery", listPublic("gallery"));
router.get("/tournaments", listPublic("tournaments"));
router.get("/teams", listPublic("teams"));
router.post("/teams", registerPublicTeam);
router.post("/registrations", registerPublicTeam);
router.get("/sports/:sportId/detail", getSportDetailView);

export default router;
