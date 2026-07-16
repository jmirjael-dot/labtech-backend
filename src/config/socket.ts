import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env, corsOrigins } from './env';

export let io: SocketIOServer;

interface AccessTokenPayload {
  sub: string;
  role: string;
}

/**
 * Salas usadas para segmentar eventos:
 * - `dashboard`      → staff del laboratorio (Dashboard Ejecutivo), recibe TODO
 * - `cliente:<id>`   → un cliente específico, recibe solo lo suyo (PWA)
 */
export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('No autorizado: falta token'));

      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('No autorizado: token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = socket.data as { userId: string; role: string };

    if (role === 'CLIENTE') {
      socket.join(`cliente:${userId}`);
    } else {
      // OPERADOR, LABORATORISTA, ADMIN → todos ven el war room del dashboard
      socket.join('dashboard');
    }

    socket.on('disconnect', () => {
      /* no-op: útil como punto de extensión para métricas de presencia */
    });
  });

  return io;
}

/** Emite un evento a todo el Dashboard Ejecutivo (staff). */
export function emitToDashboard(event: string, payload: unknown) {
  io?.to('dashboard').emit(event, payload);
}

/** Emite un evento a un cliente específico (su PWA). */
export function emitToCliente(clienteId: string, event: string, payload: unknown) {
  io?.to(`cliente:${clienteId}`).emit(event, payload);
}
