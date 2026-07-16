import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { initSocket } from './config/socket';
import { prisma } from './config/database';
import { logger } from './shared/utils/logger';

async function bootstrap() {
  const app = createApp();
  const httpServer = http.createServer(app);

  initSocket(httpServer);

  await prisma.$connect();
  logger.info('✅ Conexión a PostgreSQL establecida');

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 LabTech Minero API corriendo en ${env.API_URL} (${env.NODE_ENV})`);
    logger.info(`📄 Documentación Swagger en ${env.API_URL}/api-docs`);
    logger.info(`🔌 Socket.io escuchando en el mismo puerto (namespace raíz)`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} recibido, cerrando servidor...`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('❌ Error fatal al iniciar el servidor', { err });
  process.exit(1);
});
