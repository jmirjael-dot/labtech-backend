import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { AppError } from '../shared/errors/AppError';

/** Restringe el acceso a los roles indicados. Usar después de `authenticate`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('No tienes permisos para realizar esta acción'));
    }
    next();
  };
}

export const STAFF_ROLES: Role[] = ['OPERADOR', 'LABORATORISTA', 'ADMIN'];
