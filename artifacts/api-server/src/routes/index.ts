import { Router } from "express";
import calibrationsRouter from "./calibrations";
import authRouter from "./auth";
import instrumentUpdateRouter from "./instrument-update";

const router = Router();

router.use(calibrationsRouter);
router.use(authRouter);
router.use(instrumentUpdateRouter);

export default router;
