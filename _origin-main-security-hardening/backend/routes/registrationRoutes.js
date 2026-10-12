import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import {
  submitRegistration,
  listPendingRegistrations,
  listApprovedRegistrations,
  approveRegistration,
  rejectRegistration,
  deleteApprovedRegistration,
  exportApprovedExcel,
  verifyClientOcrIdCard,
  verifyIdCard,
} from "../controllers/registrationController.js";

const router = Router();
const ocrAttempts = new Map();

function limitOcrAttempts(req, res, next) {
  const key = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const current = ocrAttempts.get(key) || { count: 0, resetAt: now + windowMs };
  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + windowMs;
  }
  current.count += 1;
  ocrAttempts.set(key, current);
  if (current.count > 20) {
    return res.status(429).json({ success: false, message: "Too many ID verification attempts. Please try again later." });
  }
  return next();
}

// Public OCR check returns a backend-signed token used by final registration.
router.post("/verify-id-card", limitOcrAttempts, verifyIdCard);
router.post("/verify-id-card/client-ocr", limitOcrAttempts, verifyClientOcrIdCard);

// All remaining registration routes require authentication
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

// Delete an approved registration and its synced team (admin or supercoordinator)
router.delete("/:id", allowRoles("admin", "supercoordinator"), deleteApprovedRegistration);

// Export approved registrations as Excel (admin or supercoordinator)
router.get("/export-excel", allowRoles("admin", "supercoordinator"), exportApprovedExcel);

export default router;
