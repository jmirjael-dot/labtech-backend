import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../shared/errors/AppError';

interface ValidateSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/** Valida req.body / req.params / req.query contra esquemas Zod y normaliza errores 400. */
export function validate(schemas: ValidateSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        return next(AppError.badRequest('Datos de entrada inválidos', result.error.flatten()));
      }
      req.body = result.data;
    }
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        return next(AppError.badRequest('Parámetros inválidos', result.error.flatten()));
      }
      req.params = result.data as typeof req.params;
    }
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        return next(AppError.badRequest('Query params inválidos', result.error.flatten()));
      }
      req.query = result.data as typeof req.query;
    }
    next();
  };
}
