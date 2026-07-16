import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { requireRole, STAFF_ROLES } from '../../middlewares/role.middleware';
import { uploadComprobante } from '../uploads/upload.middleware';
import {
  initiatePaymentSchema,
  validatePaymentSchema,
  idParamSchema,
  sampleIdParamSchema,
} from './payment.schema';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/payments/{sampleId}/initiate:
 *   post:
 *     tags: [Payments]
 *     summary: Inicia el pago de una muestra (Culqi cobra al instante; Yape/BCP devuelven datos para pagar)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [metodo]
 *             properties:
 *               metodo: { type: string, enum: [CULQI, YAPE_BUSINESS, TRANSFERENCIA_BCP] }
 *               culqiTokenId: { type: string, description: "Requerido si metodo=CULQI" }
 *     responses:
 *       200: { description: Pago iniciado o completado }
 */
router.post(
  '/:sampleId/initiate',
  validate({ params: sampleIdParamSchema, body: initiatePaymentSchema }),
  PaymentController.initiate
);

/**
 * @openapi
 * /api/v1/payments/{sampleId}/comprobante:
 *   post:
 *     tags: [Payments]
 *     summary: Sube la captura del comprobante de pago (Yape/transferencia)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               comprobante: { type: string, format: binary }
 *     responses:
 *       200: { description: Comprobante subido, pago pasa a EN_REVISION }
 */
router.post(
  '/:sampleId/comprobante',
  validate({ params: sampleIdParamSchema }),
  uploadComprobante,
  PaymentController.uploadComprobante
);

/**
 * @openapi
 * /api/v1/payments/{sampleId}:
 *   get:
 *     tags: [Payments]
 *     summary: Consulta el pago asociado a una muestra
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Pago encontrado }
 */
router.get('/:sampleId', validate({ params: sampleIdParamSchema }), PaymentController.getBySample);

/**
 * @openapi
 * /api/v1/payments/{id}/validate:
 *   patch:
 *     tags: [Payments]
 *     summary: Aprueba o rechaza un pago en revisión (solo staff del laboratorio)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado: { type: string, enum: [APROBADO, RECHAZADO] }
 *               nota: { type: string }
 *     responses:
 *       200: { description: Pago validado; si fue aprobado la muestra avanza a PAGADO y se genera la boleta }
 */
router.patch(
  '/:id/validate',
  requireRole(...STAFF_ROLES),
  validate({ params: idParamSchema, body: validatePaymentSchema }),
  PaymentController.validate
);

export default router;
