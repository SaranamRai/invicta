import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import {
  submitRegistration,
  listPendingRegistrations,
  listApprovedRegistrations,
  approveRegistration,
  rejectRegistration,
  exportApprovedExcel,
} from "../controllers/registrationController.js";

const router = Router();

// All registration routes require authentication
router.use(authMiddleware);

// Submit a new registration (any authenticated user)
router.post("/", submitRegistration);

// Pending registrations (supercoordinator or admin)
router.get("/pending", allowRoles("supercoordinator", "admin"), listPendingRegistrations);

// Approved registrations (role-based filtering inside controller)
router.get("/approved", allowRoles("admin", "supercoordinator", "coordinator", "volunteer"), listApprovedRegistrations);

// Approve a registration (supercoordinator only)
router.patch("/:id/approve", allowRoles("supercoordinator"), approveRegistration);

// Reject a registration (supercoordinator only)
router.patch("/:id/reject", allowRoles("supercoordinator"), rejectRegistration);

// Export approved registrations as Excel (admin or supercoordinator)
router.get("/export-excel", allowRoles("admin", "supercoordinator"), exportApprovedExcel);

export default router;
