import express from "express";
import { authenticate } from "../../shared/middlewares/authMiddlewares.js";
import { handleGenerateWebSocketToken } from "./controller/websocketController.js";

const router = express.Router();

router.post(
  "/token",
  authenticate,
  handleGenerateWebSocketToken
);

export default router;