import { z } from 'zod';
import { Role } from '@prisma/client';

export const updateUserSchema = z.object({
  nombre: z.string().min(3).optional(),
  telefono: z.string().min(6).optional(),
  activo: z.boolean().optional(),
  role: z.nativeEnum(Role).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.nativeEnum(Role).optional(),
  search: z.string().optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const idParamSchema = z.object({
  id: z.string().uuid('id inválido'),
});
