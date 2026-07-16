import { Router } from 'express';
import { SampleController } from './sample.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole, STAFF_ROLES } from '../../middlewares/role.middleware';
import {
  createSampleSchema,
  updateSampleStatusSchema,
  listSamplesQuerySchema,
  idParamSchema,
} from './sample.schema';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/samples:
 *   post:
 *     tags: [Samples]
 *     summary: Registra una nueva muestra (usado por la PWA del cliente)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipoMineral, mineral, descripcion]
 *             properties:
 *               tipoMineral: { type: string, enum: [OXIDO, SULFURO] }
 *               mineral: { type: string, enum: [ORO, PLATA, COBRE, PLOMO, ZINC, CARBON, ANTIMONIO] }
 *               descripcion: { type: string }
 *               observaciones: { type: string }
 *     responses:
 *       201: { description: Muestra creada con precio calculado y estado PENDIENTE_PAGO }
 */
router.post('/', validate({ body: createSampleSchema }), SampleController.create);

/**
 * @openapi
 * /api/v1/samples:
 *   get:
 *     tags: [Samples]
 *     summary: Lista muestras (el cliente ve solo las suyas; el staff ve todas — Dashboard Ejecutivo)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista paginada de muestras }
 */
router.get('/', validate({ query: listSamplesQuerySchema }), SampleController.list);

/**
 * @openapi
 * /api/v1/samples/{id}:
 *   get:
 *     tags: [Samples]
 *     summary: Detalle de una muestra, incluyendo historial de estados, pago y resultado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Detalle de la muestra }
 *       403: { description: Un cliente intentó ver una muestra que no es suya }
 *       404: { description: No encontrada }
 */
router.get('/:id', validate({ params: idParamSchema }), SampleController.getById);

/**
 * @openapi
 * /api/v1/samples/{id}/status:
 *   patch:
 *     tags: [Samples]
 *     summary: Avanza el estado de una muestra (solo staff del laboratorio)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado: { type: string }
 *               nota: { type: string }
 *     responses:
 *       200: { description: Estado actualizado, emite evento en tiempo real a cliente y dashboard }
 *       409: { description: Transición de estado inválida }
 */
router.patch(
  '/:id/status',
  requireRole(...STAFF_ROLES),
  validate({ params: idParamSchema, body: updateSampleStatusSchema }),
  SampleController.updateStatus
);

export default router;
