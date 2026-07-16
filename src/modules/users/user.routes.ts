import { Router } from 'express';
import { UserController } from './user.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole, STAFF_ROLES } from '../../middlewares/role.middleware';
import { updateUserSchema, listUsersQuerySchema, idParamSchema } from './user.schema';

const router = Router();

router.use(authenticate, requireRole(...STAFF_ROLES));

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: Lista usuarios (clientes y staff) con paginación y búsqueda
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista paginada de usuarios }
 */
router.get('/', validate({ query: listUsersQuerySchema }), UserController.list);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Obtiene un usuario por id
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario encontrado }
 *       404: { description: No encontrado }
 */
router.get('/:id', validate({ params: idParamSchema }), UserController.getById);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Actualiza datos de un usuario (nombre, teléfono, rol, estado activo)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario actualizado }
 */
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateUserSchema }),
  UserController.update
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Desactiva un usuario (soft delete, preserva historial)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario desactivado }
 */
router.delete('/:id', validate({ params: idParamSchema }), UserController.remove);

export default router;
