import { z } from 'zod';

export const registerSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(6, 'Teléfono inválido'),
  documento: z.string().min(8, 'RUC/DNI inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken inválido'),
});
export type RefreshInput = z.infer<typeof refreshSchema>;
