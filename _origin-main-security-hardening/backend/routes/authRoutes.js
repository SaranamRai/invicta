import { Router } from "express";
import { currentSession, login, logout, refreshSession } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { loginLimiter } from "../middleware/securityMiddleware.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.get("/session", authMiddleware, currentSession);
router.post("/refresh", refreshSession);
router.post("/logout", logout);

export default router;
