import { Router } from "express";
import { adminHandlers, listIssues, verifyResult } from "../controllers/adminController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authMiddleware, allowRoles("admin"));

router.post("/sports", adminHandlers.createSport);
router.put("/sports/:id", adminHandlers.updateSport);
router.delete("/sports/:id", adminHandlers.deleteSport);
router.post("/departments", adminHandlers.createDepartment);
router.put("/departments/:id", adminHandlers.updateDepartment);
router.delete("/departments/:id", adminHandlers.deleteDepartment);
router.post("/fixtures", adminHandlers.createFixture);
router.put("/fixtures/:id", adminHandlers.updateFixture);
router.delete("/fixtures/:id", adminHandlers.deleteFixture);
router.post("/announcements", adminHandlers.createAnnouncement);
router.post("/rules", adminHandlers.createRule);
router.post("/results", adminHandlers.createResult);
router.put("/results/:id/verify", verifyResult);
router.post("/create-admin", adminHandlers.createAdmin);
router.post("/create-volunteer", adminHandlers.createVolunteer);
router.post("/create-coordinator", adminHandlers.createCoordinator);
router.get("/issues", listIssues);

export default router;
