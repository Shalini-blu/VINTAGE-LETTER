import { Router, type IRouter } from "express";
import healthRouter from "./health";
import lettersRouter from "./letters";

const router: IRouter = Router();

router.use(healthRouter);
router.use(lettersRouter);

export default router;
