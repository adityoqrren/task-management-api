import express from 'express';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';
import { handleGetDashboardStatistics } from './controller/dashboardController.js';
import { dashboardLimiter } from '../../shared/middlewares/rateLimiter.js';

const router = express.Router();

router.use(authenticate);
router.use(dashboardLimiter);

router.get('/statistics', handleGetDashboardStatistics);

export default router;
