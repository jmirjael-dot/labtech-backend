import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import type { UpdateUserInput, ListUsersQuery } from './user.schema';

function sanitize<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

export const UserService = {
  async list(query: ListUsersQuery) {
    const { page, pageSize, role, search } = query;

    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { documento: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: items.map(sanitize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('Usuario no encontrado');
    return sanitize(user);
  },

  async update(id: string, input: UpdateUserInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('Usuario no encontrado');

    const updated = await prisma.user.update({ where: { id }, data: input });
    return sanitize(updated);
  },

  async remove(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw AppError.notFound('Usuario no encontrado');

    // Soft delete: se preserva el historial de muestras/pagos del cliente
    const deactivated = await prisma.user.update({ where: { id }, data: { activo: false } });
    return sanitize(deactivated);
  },
};
