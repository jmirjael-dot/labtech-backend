import { z } from 'zod';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export const initiatePaymentSchema = z.object({
  metodo: z.nativeEnum(PaymentMethod),
  /** Requerido solo cuando metodo = CULQI (token generado por Culqi.js en el frontend). */
  culqiTokenId: z.string().optional(),
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const validatePaymentSchema = z.object({
  estado: z.enum([PaymentStatus.APROBADO, PaymentStatus.RECHAZADO]),
  nota: z.string().optional(),
});
export type ValidatePaymentInput = z.infer<typeof validatePaymentSchema>;

export const idParamSchema = z.object({
  id: z.string().uuid('id inválido'),
});
export const sampleIdParamSchema = z.object({
  sampleId: z.string().uuid('sampleId inválido'),
});
