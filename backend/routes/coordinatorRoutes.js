import { Router } from "express";
import {
  assignFixtureVolunteer,
  coordinatorFixtures,
  coordinatorVolunteers,
  createCoordinatorIssue,
  createCoordinatorVolunteer,
  createPlayer,
  myDepartment,
  publishRule,
  updatePlayer,
  updateTeam,
} from "../controllers/coordinatorController.js";
import { createTeam } from "../controllers/adminDataController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authMiddleware, allowRoles("coordinator"));

router.get("/my-department", myDepartment);
router.post("/teams", createTeam);
router.put("/teams/:id", updateTeam);
router.post("/players", createPlayer);
router.put("/players/:id", updatePlayer);
router.get("/fixtures", coordinatorFixtures);
router.patch("/fixtures/:id/volunteer", assignFixtureVolunteer);
router.get("/volunteers", coordinatorVolunteers);
router.post("/issues", createCoordinatorIssue);
router.post("/rules", publishRule);
router.post("/create-volunteer", createCoordinatorVolunteer);

export default router;
