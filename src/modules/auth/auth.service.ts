import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  expiresInToDate,
} from '../../shared/utils/jwt';
import type { RegisterInput, LoginInput } from './auth.schema';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

async function issueTokens(user: { id: string; email: string; role: any }, createdByIp?: string): Promise<AuthTokens> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });

  const jti = uuid();
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      token: refreshToken,
      userId: user.id,
      expiresAt: expiresInToDate(env.JWT_REFRESH_EXPIRES_IN),
      createdByIp,
    },
  });

  return { accessToken, refreshToken };
}

export const AuthService = {
  async register(input: RegisterInput, ip?: string) {
    const [emailTaken, docTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email: input.email } }),
      prisma.user.findUnique({ where: { documento: input.documento } }),
    ]);
    if (emailTaken) throw AppError.conflict('Ya existe una cuenta con este correo');
    if (docTaken) throw AppError.conflict('Ya existe una cuenta con este RUC/DNI');

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        nombre: input.nombre,
        email: input.email,
        telefono: input.telefono,
        documento: input.documento,
        passwordHash,
        role: 'CLIENTE',
      },
    });

    const tokens = await issueTokens(user, ip);
    return { user: sanitizeUser(user), ...tokens };
  },

  async login(input: LoginInput, ip?: string) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.activo) throw AppError.unauthorized('Credenciales inválidas');

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!validPassword) throw AppError.unauthorized('Credenciales inválidas');

    const tokens = await issueTokens(user, ip);
    return { user: sanitizeUser(user), ...tokens };
  },

  /**
   * Rotación de refresh tokens: cada refresh invalida el token usado
   * y emite uno nuevo. Si se reutiliza un token ya revocado, se asume
   * robo de token y se revoca toda la sesión del usuario.
   */
  async refresh(refreshTokenRaw: string, ip?: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenRaw);
    } catch {
      throw AppError.unauthorized('Refresh token inválido o expirado');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshTokenRaw } });
    if (!stored) throw AppError.unauthorized('Refresh token no reconocido');

    if (stored.revoked) {
      // Posible reuso de token robado: revocar toda la familia de tokens del usuario
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revoked: false },
        data: { revoked: true },
      });
      throw AppError.unauthorized('Sesión comprometida, vuelve a iniciar sesión');
    }

    if (stored.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token expirado');
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.activo) throw AppError.unauthorized('Usuario no encontrado o inactivo');

    const tokens = await issueTokens(user, ip);

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true, replacedBy: tokens.refreshToken },
    });

    return { user: sanitizeUser(user), ...tokens };
  },

  async logout(refreshTokenRaw: string) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshTokenRaw },
      data: { revoked: true },
    });
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('Usuario no encontrado');
    return sanitizeUser(user);
  },
};
