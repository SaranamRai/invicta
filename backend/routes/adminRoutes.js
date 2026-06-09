import { Router } from "express";
import { adminHandlers, listIssues, listRoleAccounts, listTournaments, reviewTeamRegistration, updateRoleAccount, deleteRoleAccount, verifyResult } from "../controllers/adminController.js";
import {
  createTeam,
  createFixture,
  deleteFixture,
  deleteTeam,
  listFixtures,
  listTeams,
  replaceFixtures,
  updateFixture,
  updateTeam,
  listPlayers,
} from "../controllers/adminDataController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = Router();

const adminOrSuper = allowRoles("admin", "supercoordinator");
const superOnly = allowRoles("supercoordinator");

router.use(authMiddleware);

// Log tournament-related admin requests for debugging portal toggle 404s
router.use((req, res, next) => {
  try {
    if (req.path && req.path.includes('/tournaments')) {
      console.log('[adminRoutes] incoming:', req.method, req.path, 'body=', JSON.stringify(req.body || {}));
    }
    } catch {
    /* ignore logging errors */
  }
  return next();
});

router.get("/sports", adminOrSuper, adminHandlers.listSports);
router.post("/sports", superOnly, adminHandlers.createSport);
router.put("/sports/:id", superOnly, adminHandlers.updateSport);
router.delete("/sports/:id", superOnly, adminHandlers.deleteSport);
router.post("/departments", superOnly, adminHandlers.createDepartment);
router.put("/departments/:id", superOnly, adminHandlers.updateDepartment);
router.delete("/departments/:id", superOnly, adminHandlers.deleteDepartment);
router.get("/teams", adminOrSuper, listTeams);
router.post("/teams", superOnly, createTeam);
router.put("/teams/:id", superOnly, updateTeam);
router.delete("/teams/:id", superOnly, deleteTeam);
router.patch("/team-registrations/:id/review", superOnly, reviewTeamRegistration);
router.get("/fixtures", adminOrSuper, listFixtures);
router.post("/fixtures", superOnly, createFixture);
router.put("/fixtures", superOnly, replaceFixtures);
router.put("/fixtures/:id", superOnly, updateFixture);
router.delete("/fixtures/:id", superOnly, deleteFixture);
router.post("/announcements", superOnly, adminHandlers.createAnnouncement);
router.put("/announcements/:id", superOnly, adminHandlers.updateAnnouncement);
router.delete("/announcements/:id", superOnly, adminHandlers.deleteAnnouncement);
router.get("/venues", adminOrSuper, adminHandlers.listVenues);
router.post("/venues", superOnly, adminHandlers.createVenue);
router.put("/venues/:id", superOnly, adminHandlers.updateVenue);
router.delete("/venues/:id", superOnly, adminHandlers.deleteVenue);
router.get("/registrations/pending", adminOrSuper, adminHandlers.listPendingRegistrations);
router.post("/rules", superOnly, adminHandlers.createRule);
router.post("/results", superOnly, adminHandlers.createResult);
router.put("/results/:id/verify", adminOrSuper, verifyResult);
router.post("/create-admin", superOnly, adminHandlers.createAdmin);
router.post("/create-supercoordinator", superOnly, adminHandlers.createSuperCoordinator);
router.post("/create-volunteer", superOnly, adminHandlers.createVolunteer);
router.post("/create-coordinator", superOnly, adminHandlers.createCoordinator);
router.get("/role-accounts", adminOrSuper, listRoleAccounts);
router.put("/role-accounts/:id", superOnly, updateRoleAccount);
router.delete("/role-accounts/:id", superOnly, deleteRoleAccount);
router.get("/tournaments", adminOrSuper, listTournaments);
router.post("/tournaments", superOnly, adminHandlers.createTournament);
router.put("/tournaments/:id", superOnly, adminHandlers.updateTournament);
router.patch("/tournaments/:id/registration", superOnly, adminHandlers.toggleTournamentRegistration);
router.delete("/tournaments/:id", superOnly, adminHandlers.deleteTournament);
router.get("/players", adminOrSuper, listPlayers);
router.get("/issues", adminOrSuper, listIssues);

export default router;
