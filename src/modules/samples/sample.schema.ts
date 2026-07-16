import { z } from 'zod';
import { MineralType, MineralTarget, SampleStatus } from '@prisma/client';

export const createSampleSchema = z.object({
  tipoMineral: z.nativeEnum(MineralType),
  mineral: z.nativeEnum(MineralTarget),
  descripcion: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  observaciones: z.string().optional(),
});
export type CreateSampleInput = z.infer<typeof createSampleSchema>;

export const updateSampleStatusSchema = z.object({
  estado: z.nativeEnum(SampleStatus),
  nota: z.string().optional(),
});
export type UpdateSampleStatusInput = z.infer<typeof updateSampleStatusSchema>;

export const listSamplesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.nativeEnum(SampleStatus).optional(),
  clienteId: z.string().uuid().optional(),
  search: z.string().optional(),
});
export type ListSamplesQuery = z.infer<typeof listSamplesQuerySchema>;

export const idParamSchema = z.object({
  id: z.string().uuid('id inválido'),
});
