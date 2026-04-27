import { Router } from "express";
import calibrationsRouter from "./calibrations";
import authRouter from "./auth"; // 🔥 tambahkan ini

const router = Router();

router.use(calibrationsRouter);
router.use(authRouter); // 🔥 tambahkan ini

export default router;