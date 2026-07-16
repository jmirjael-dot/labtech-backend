import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors/AppError';
import { logger } from '../shared/utils/logger';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Errores de aplicación (esperados)
  if (err instanceof AppError) {
    if (!err.isOperational || err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, path: req.originalUrl });
    }
    return res.status(err.statusCode).json({
      ok: false,
      message: err.message,
      details: err.details,
    });
  }

  // Errores conocidos de Prisma (constraint únicos, FK, etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        ok: false,
        message: `Ya existe un registro con ese valor único (${(err.meta?.target as string[])?.join(', ')})`,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ ok: false, message: 'Registro no encontrado' });
    }
  }

  // Error inesperado
  logger.error('Error no controlado', { err, path: req.originalUrl });
  return res.status(500).json({
    ok: false,
    message: 'Error interno del servidor',
  });
}
