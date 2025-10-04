import express from 'express';
import { handleRegister, handleLogin, handleGetUserInfoLogin, handleUpdateToken, handleDeleteToken } from './controller/authController.js';
import { authenticate } from '../middlewares/authMiddlewares.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { loginSchema, registerSchema, updateTokenSchema } from './authValidation.js';

const router = express.Router();

router.post('/register', validateRequest(registerSchema), handleRegister);
router.post('/login', validateRequest(loginSchema), handleLogin);
router.get('/info', authenticate, handleGetUserInfoLogin);
router.put('/token', validateRequest(updateTokenSchema), handleUpdateToken);
router.delete('/token', validateRequest(updateTokenSchema), handleDeleteToken);

export default router;
