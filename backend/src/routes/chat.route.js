import { Router } from "express";
import { handleManualChat } from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT,handleManualChat);

export default router;