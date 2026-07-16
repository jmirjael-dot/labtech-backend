import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../shared/utils/jwt';
import { AppError } from '../shared/errors/AppError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Token de acceso no proporcionado'));
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(AppError.unauthorized('Token de acceso inválido o expirado'));
  }
}
