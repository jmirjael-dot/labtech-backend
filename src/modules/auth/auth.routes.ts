import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { authRateLimiter } from '../../middlewares/rateLimit.middleware';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Crea una cuenta de cliente (usada por la PWA)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, telefono, documento, password]
 *             properties:
 *               nombre: { type: string }
 *               email: { type: string }
 *               telefono: { type: string }
 *               documento: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Cuenta creada, devuelve tokens y usuario }
 *       409: { description: Email o documento ya registrado }
 */
router.post('/register', authRateLimiter, validate({ body: registerSchema }), AuthController.register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión (cliente o staff) y devuelve access + refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login exitoso }
 *       401: { description: Credenciales inválidas }
 */
router.post('/login', authRateLimiter, validate({ body: loginSchema }), AuthController.login);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rota el refresh token y devuelve un nuevo par de tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Tokens renovados }
 *       401: { description: Refresh token inválido, expirado o reutilizado }
 */
router.post('/refresh', authRateLimiter, validate({ body: refreshSchema }), AuthController.refresh);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoca un refresh token (cierra sesión en ese dispositivo)
 *     responses:
 *       200: { description: Sesión cerrada }
 */
router.post('/logout', validate({ body: refreshSchema }), AuthController.logout);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Devuelve el usuario autenticado actual
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario actual }
 *       401: { description: No autenticado }
 */
router.get('/me', authenticate, AuthController.me);

export default router;
