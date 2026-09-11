import { Router } from "express";
import { chatWithInvicta } from "../controllers/aiController.js";

const router = Router();

router.post("/chat", chatWithInvicta);

export default router;
