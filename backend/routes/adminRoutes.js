import { Router } from "express";
import { adminHandlers, listIssues, verifyResult } from "../controllers/adminController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authMiddleware);

// Coordinators manage fixtures, sports, departments and content. Admins are observer-only.
router.post("/sports", allowRoles("coordinator"), adminHandlers.createSport);
router.put("/sports/:id", allowRoles("coordinator"), adminHandlers.updateSport);
router.delete("/sports/:id", allowRoles("coordinator"), adminHandlers.deleteSport);

router.post("/departments", allowRoles("coordinator"), adminHandlers.createDepartment);
router.put("/departments/:id", allowRoles("coordinator"), adminHandlers.updateDepartment);
router.delete("/departments/:id", allowRoles("coordinator"), adminHandlers.deleteDepartment);

router.post("/fixtures", allowRoles("coordinator"), adminHandlers.createFixture);
router.put("/fixtures/:id", allowRoles("coordinator"), adminHandlers.updateFixture);
router.delete("/fixtures/:id", allowRoles("coordinator"), adminHandlers.deleteFixture);

router.post("/announcements", allowRoles("coordinator"), adminHandlers.createAnnouncement);
router.post("/rules", allowRoles("coordinator"), adminHandlers.createRule);
router.post("/results", allowRoles("coordinator"), adminHandlers.createResult);
router.put("/results/:id/verify", allowRoles("coordinator"), verifyResult);

// Account management remains admin-only
router.post("/create-admin", allowRoles("admin"), adminHandlers.createAdmin);
router.post("/create-volunteer", allowRoles("admin"), adminHandlers.createVolunteer);
router.post("/create-coordinator", allowRoles("admin"), adminHandlers.createCoordinator);

// Issue listing available to coordinators and admins
router.get("/issues", allowRoles("coordinator", "admin"), listIssues);

export default router;
