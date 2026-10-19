import express from 'express';
import {
  handleGetUserById,
  handleGetUserByUsernameOrName,
  handleGetUserLoggedIn,
  handleUpdateProfile,
  handleUploadProfilePhoto,
  handleDeleteProfilePhoto,
} from './controller/userController.js';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';
import { validateRequest } from '../../shared/middlewares/validateRequest.js';
import { uploadImage } from '../../shared/middlewares/uploadMiddleware.js';
import { updateProfileSchema } from './userValidation.js';
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
 * /api/users/me:
 *   patch:
 *     summary: Update the logged-in user's full name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe Updated"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch('/me', validateRequest(updateProfileSchema), handleUpdateProfile);

/**
 * @swagger
 * /api/users/me/photo:
 *   post:
 *     summary: Upload or replace the logged-in user's profile photo (JPEG, PNG, WEBP max 2MB)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Profile photo uploaded successfully
 *   delete:
 *     summary: Delete the logged-in user's profile photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile photo deleted successfully
 */
router.post('/me/photo', uploadImage.single('file'), handleUploadProfilePhoto);
router.delete('/me/photo', handleDeleteProfilePhoto);

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