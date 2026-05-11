import express from 'express';
import { handleRegister, handleLogin, handleGetUserInfoLogin, handleUpdateToken, handleLogout } from './controller/authController.js';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';
import { validateRequest, validateRequestAuth } from '../../shared/middlewares/validateRequest.js';
import { loginSchema, registerSchema, updateTokenSchema } from './authValidation.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               username:
 *                 type: string
 *                 example: "johndoe"
 *               password:
 *                 type: string
 *                 example: "securepassword123"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "register success"
 *               data:
 *                 userId: "uuid-user-id"
 *       400:
 *         description: Invalid input or user already exists
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "Email already registered"
 */
router.post('/register', validateRequest(registerSchema), handleRegister);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "securepassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "login success"
 *               data:
 *                 accessToken: "eyJhbGciOiJIUzI1Ni..."
 *                 refreshToken: "eyJhbGciOiJIUzI1Ni..."
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "Invalid credentials"
 */
router.post('/login', validateRequest(loginSchema), handleLogin);

/**
 * @swagger
 * /api/auth/info:
 *   get:
 *     summary: Get logged-in user information
 *     tags: [Auth]
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
 *                 email: "user@example.com"
 *                 username: "johndoe"
 *                 name: "John Doe"
 *                 createdAt: "2024-01-01T00:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             example:
 *               status: "error"
 *               message: "Unauthorized"
 */
router.get('/info', authenticate, handleGetUserInfoLogin);

/**
 * @swagger
 * /api/auth/token:
 *   put:
 *     summary: Update access token using refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1Ni..."
 *     responses:
 *       200:
 *         description: Token updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "refresh token success"
 *               data: "new-access-token-jwt..."
 *       401:
 *         description: Invalid refresh token
 *   delete:
 *     summary: Revoke refresh token (Logout)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1Ni..."
 *     responses:
 *       200:
 *         description: Token revoked successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "delete token success"
 */
router.put('/token', validateRequestAuth(updateTokenSchema), handleUpdateToken);
router.delete('/token', validateRequestAuth(updateTokenSchema), handleLogout);

export default router;
