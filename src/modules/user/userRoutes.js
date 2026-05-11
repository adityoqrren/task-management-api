import express from 'express';
import { handleGetUserById, handleGetUserByUsernameOrName, handleGetUserLoggedIn } from './controller/userController.js';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';
//import { apiLimiter } from '../../../shared/middlewares/rateLimiter.js';
const router = express.Router();

router.use(authenticate);
//router.use(apiLimiter);

/**
 * @swagger
 * /api/users/info:
 *   get:
 *     summary: Get logged-in user information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 id: "uuid-user-id"
 *                 username: "johndoe"
 *                 name: "John Doe"
 *                 email: "john@example.com"
 *                 createdAt: "2024-01-01T00:00:00.000Z"
 */
router.get('/info', handleGetUserLoggedIn);

/**
 * @swagger
 * /api/users/{userid}:
 *   get:
 *     summary: Get user details by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *     responses:
 *       200:
 *         description: User details retrieved
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 id: "uuid-user-id"
 *                 username: "johndoe"
 *                 name: "John Doe"
 */
router.get('/:userid', handleGetUserById);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Search users by username or name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Search query for name or username
 *     responses:
 *       200:
 *         description: List of users found
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 - id: "uuid-1"
 *                   username: "jane"
 *                   name: "Jane Doe"
 */
router.get('/', handleGetUserByUsernameOrName);

export default router;