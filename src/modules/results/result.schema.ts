import { z } from 'zod';

export const createResultSchema = z.object({
  ley: z.string().min(1, 'La ley/resultado es requerida'),
  metodo: z.string().min(1, 'El método de análisis es requerido'),
  laboratorista: z.string().min(1, 'El laboratorista responsable es requerido'),
  observaciones: z.string().optional(),
});
export type CreateResultInput = z.infer<typeof createResultSchema>;

export const sampleIdParamSchema = z.object({
  sampleId: z.string().uuid('sampleId inválido'),
});
