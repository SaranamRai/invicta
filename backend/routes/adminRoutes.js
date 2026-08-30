import { Router } from "express";
import { adminHandlers, listIssues, listRoleAccounts, listRules, listTournaments, reviewRule, reviewTeamRegistration, tournamentReport, updateRoleAccount, deleteRoleAccount, verifyResult } from "../controllers/adminController.js";
import {
  createTeam,
  bulkRescheduleFixtures,
  createFixture,
  deleteFixture,
  deleteFixtures,
  deleteTeam,
  generateFixtures,
  listFixtures,
  listTeams,
  replaceFixtures,
  rescheduleFixture,
  updateFixture,
  updateTeam,
  listPlayers,
  updatePlayer,
  deletePlayer,
} from "../controllers/adminDataController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import * as technicalAdmin from "../controllers/technicalAdminController.js";

const router = Router();

const adminOrSuper = allowRoles("admin", "supercoordinator");
const adminOnly = allowRoles("admin");
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

router.get("/health", adminOnly, technicalAdmin.health);
router.get("/stats", adminOnly, technicalAdmin.stats);
router.get("/database-status", adminOnly, technicalAdmin.databaseStatus);
router.get("/api-logs", adminOnly, technicalAdmin.apiLogs);
router.get("/error-logs", adminOnly, technicalAdmin.errorLogs);
router.get("/audit-logs", adminOnly, technicalAdmin.auditLogs);
router.get("/live-monitoring", adminOnly, technicalAdmin.liveMonitoring);
router.get("/email-status", adminOnly, technicalAdmin.emailStatus);
router.post("/test-smtp", adminOnly, technicalAdmin.testSmtp);
router.post("/test-mongodb", adminOnly, technicalAdmin.testMongoDb);
router.patch("/system-users/:role/:id/status", adminOnly, technicalAdmin.updateSystemUserStatus);
router.post("/system-users/:role/:id/reset-password", adminOnly, technicalAdmin.resetSystemUserPassword);

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
router.post("/fixtures/generate", superOnly, generateFixtures);
router.post("/fixtures", superOnly, createFixture);
router.put("/fixtures", superOnly, replaceFixtures);
router.delete("/fixtures", superOnly, deleteFixtures);
router.post("/fixtures/reschedule", superOnly, bulkRescheduleFixtures);
router.post("/fixtures/:id/reschedule", superOnly, rescheduleFixture);
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
router.get("/rules", adminOrSuper, listRules);
router.post("/rules", superOnly, adminHandlers.createRule);
router.patch("/rules/:id/review", superOnly, reviewRule);
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
router.get("/tournaments/:id/report", adminOrSuper, tournamentReport);
router.put("/tournaments/:id", superOnly, adminHandlers.updateTournament);
router.patch("/tournaments/:id/registration", superOnly, adminHandlers.toggleTournamentRegistration);
router.delete("/tournaments/:id", superOnly, adminHandlers.deleteTournament);
router.get("/players", adminOrSuper, listPlayers);
router.put("/players/:id", superOnly, updatePlayer);
router.delete("/players/:id", superOnly, deletePlayer);
router.get("/registration-fields", adminOrSuper, adminHandlers.listRegistrationFields);
router.put("/registration-fields", superOnly, adminHandlers.replaceRegistrationFields);
router.get("/issues", adminOrSuper, listIssues);

export default router;
