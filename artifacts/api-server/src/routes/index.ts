import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicRouter from "./public";
import authRouter from "./auth";
import localDataRouter from "./local-data";
import adminRouter from "./admin";
import webhookRouter from "./webhook";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(adminRouter);
router.use(localDataRouter);
router.use(webhookRouter);
router.use(publicRouter);

export default router;
