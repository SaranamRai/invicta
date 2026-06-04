import { Router } from "express";
import {
  coordinatorFixtures,
  createCoordinatorIssue,
  createPlayer,
  createTeam,
  myDepartment,
  updatePlayer,
  updateTeam,
} from "../controllers/coordinatorController.js";
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
router.post("/issues", createCoordinatorIssue);

export default router;
