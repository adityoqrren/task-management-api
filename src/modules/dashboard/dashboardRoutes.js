import express from 'express';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';
import { handleGetDashboardStatistics } from './controller/dashboardController.js';

const router = express.Router();

router.use(authenticate);

router.get('/statistics', handleGetDashboardStatistics);

export default router;
