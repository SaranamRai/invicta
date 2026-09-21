import { Router } from "express";
import {
  assignFixtureVolunteer,
  coordinatorAnnouncements,
  coordinatorFixtures,
  coordinatorPointsTable,
  coordinatorVolunteers,
  createCoordinatorIssue,
  createCoordinatorVolunteer,
  createPlayer,
  myDepartment,
  publishRule,
  updateCoordinatorVolunteer,
  updatePlayer,
  updateTeam,
} from "../controllers/coordinatorController.js";
import { createTeam } from "../controllers/adminDataController.js";
import { listTeams } from "../controllers/adminDataController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { requireAssignedSportMatch } from "../middleware/assignedSportMiddleware.js";

const router = Router();

router.use(authMiddleware, allowRoles("coordinator"));

router.get("/my-department", myDepartment);
router.get("/teams", requireAssignedSportMatch, listTeams);
router.post("/teams", requireAssignedSportMatch, createTeam);
router.put("/teams/:id", requireAssignedSportMatch, updateTeam);
router.post("/players", requireAssignedSportMatch, createPlayer);
router.put("/players/:id", requireAssignedSportMatch, updatePlayer);
router.get("/fixtures", requireAssignedSportMatch, coordinatorFixtures);
router.get("/points-table", requireAssignedSportMatch, coordinatorPointsTable);
router.get("/announcements", coordinatorAnnouncements);
router.patch("/fixtures/:id/volunteer", requireAssignedSportMatch, assignFixtureVolunteer);
router.get("/volunteers", requireAssignedSportMatch, coordinatorVolunteers);
router.put("/volunteers/:id", requireAssignedSportMatch, updateCoordinatorVolunteer);
router.post("/issues", requireAssignedSportMatch, createCoordinatorIssue);
router.post("/rules", requireAssignedSportMatch, publishRule);
router.post("/create-volunteer", requireAssignedSportMatch, createCoordinatorVolunteer);

export default router;
