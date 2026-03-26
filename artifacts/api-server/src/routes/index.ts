import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import restaurantsRouter from "./restaurants";
import menuItemsRouter from "./menuItems";
import ordersRouter from "./orders";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/restaurants", restaurantsRouter);
router.use("/menu-items", menuItemsRouter);
router.use("/orders", ordersRouter);
router.use("/admin", adminRouter);

export default router;
