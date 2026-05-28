import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import contactsRouter from "./contacts";
import batchesRouter from "./batches";
import inventoryRouter from "./inventory";
import salesRouter from "./sales";
import reportsRouter from "./reports";
import settlementsRouter from "./settlements";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(contactsRouter);
router.use(batchesRouter);
router.use(inventoryRouter);
router.use(salesRouter);
router.use(reportsRouter);
router.use(settlementsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);

export default router;
