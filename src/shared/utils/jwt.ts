import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import type { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // id único del refresh token (coincide con el registro en BD)
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/** Convierte "30d" / "15m" a milisegundos, para calcular expiresAt persistido en BD. */
export function expiresInToDate(expiresIn: string): Date {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) throw new Error(`Formato de expiración inválido: ${expiresIn}`);
  const [, amountStr, unit] = match;
  const amount = Number(amountStr);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + amount * unitMs[unit]);
}
