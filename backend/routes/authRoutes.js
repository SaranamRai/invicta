import { Router } from "express";
import { currentSession, login, logout } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", login);
router.get("/session", authMiddleware, currentSession);
router.post("/logout", logout);

export default router;
