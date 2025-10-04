import express from 'express';
import { handleGetUserById, handleGetUserByUsernameOrName, handleGetUserLoggedIn } from './controller/userController.js';
import { authenticate } from '../middlewares/authMiddlewares.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.use(authenticate);
//router.use(apiLimiter);

router.get('/info', handleGetUserLoggedIn);
router.get('/:userid', handleGetUserById);
router.get('/', handleGetUserByUsernameOrName);

export default router;