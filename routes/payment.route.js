import {
  initializePayment,
  verifyPayment,
  paymentWebhook,
} from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { Router } from "express";

const router = Router();

router.post("/intialize", authenticate, initializePayment);
router.get("/verify/:reference", verifyPayment);
router.post("/webhook", paymentWebhook);

export default router;
