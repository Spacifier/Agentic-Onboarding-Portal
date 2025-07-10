import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { processDocumentUpload } from "../controllers/application.controller.js";

const router = Router();

router.route("/upload-docs").post(
    verifyJWT,
    upload.fields([
    { name: "aadhaar", maxCount: 1 },
    { name: "pan", maxCount: 1 },
    { name: "passport", maxCount: 1 },
    { name: "voterId", maxCount: 1 },
    { name: "payslip", maxCount: 1 },
    { name: "bankStatement", maxCount: 1 }
    ]),
    processDocumentUpload
);


export default router;
