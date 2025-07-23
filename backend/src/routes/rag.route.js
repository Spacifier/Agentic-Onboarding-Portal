import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  scrapeAndIndexData,
  getRecommendations,
  getCibilScore,
  processDocument,
  explainRecommendation,
  searchCreditCards,
  healthCheck,
} from "../controllers/rag.controller.js";

const router = Router();

// Public routes
router.route("/health").get(healthCheck);

// Protected routes
router.route("/scrape-and-index").post(verifyJWT, scrapeAndIndexData);
router.route("/recommendations").post(verifyJWT, getRecommendations);
router.route("/cibil-score").post(verifyJWT, getCibilScore);
router.route("/process-document").post(
  verifyJWT,
  upload.single("document"),
  processDocument
);
router.route("/explain/:cardName").post(verifyJWT, explainRecommendation);
router.route("/search").get(verifyJWT, searchCreditCards);

export default router;