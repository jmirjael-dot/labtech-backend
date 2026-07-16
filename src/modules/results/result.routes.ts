import { Router } from 'express';
import { ResultController } from './result.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole, STAFF_ROLES } from '../../middlewares/role.middleware';
import { createResultSchema, sampleIdParamSchema } from './result.schema';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/results/{sampleId}:
 *   post:
 *     tags: [Results]
 *     summary: Registra el resultado del análisis (solo laboratorista/admin), genera el PDF y avanza la muestra a TERMINADO
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ley, metodo, laboratorista]
 *             properties:
 *               ley: { type: string, example: "4.85 g/t" }
 *               metodo: { type: string, example: "Fire Assay + AAS" }
 *               laboratorista: { type: string }
 *               observaciones: { type: string }
 *     responses:
 *       201: { description: Resultado registrado }
 *       409: { description: La muestra no está en Control de Calidad, o ya tiene resultado }
 */
router.post(
  '/:sampleId',
  requireRole(...STAFF_ROLES),
  validate({ params: sampleIdParamSchema, body: createResultSchema }),
  ResultController.create
);

/**
 * @openapi
 * /api/v1/results/{sampleId}:
 *   get:
 *     tags: [Results]
 *     summary: Obtiene el resultado de una muestra (con URL del PDF del informe)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Resultado encontrado }
 *       404: { description: Aún no hay resultado disponible }
 */
router.get('/:sampleId', validate({ params: sampleIdParamSchema }), ResultController.getBySample);

/**
 * @openapi
 * /api/v1/results/{sampleId}/entregar:
 *   patch:
 *     tags: [Results]
 *     summary: Marca la muestra como ENTREGADO (cierre del ciclo)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Muestra marcada como entregada }
 */
router.patch(
  '/:sampleId/entregar',
  requireRole(...STAFF_ROLES),
  validate({ params: sampleIdParamSchema }),
  ResultController.marcarEntregado
);

/**
 * @openapi
 * /api/v1/results/{sampleId}/enviar-email:
 *   post:
 *     tags: [Results]
 *     summary: Envía el PDF del informe al correo del cliente (solo staff)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Correo enviado }
 *       409: { description: No hay PDF generado, o el envío de correos no está configurado }
 */
router.post(
  '/:sampleId/enviar-email',
  requireRole(...STAFF_ROLES),
  validate({ params: sampleIdParamSchema }),
  ResultController.enviarEmail
);

export default router;
