import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { initSocket } from './config/socket';
import { prisma } from './config/database';
import { logger } from './shared/utils/logger';
import { SampleService } from './modules/samples/sample.service';
import { PaymentService } from './modules/payments/payment.service';

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

  // 🎬 MODO DEMO: cada 20 segundos, (1) aprueba pagos que llevan un rato en
  // revisión y (2) avanza las muestras ya pagadas por el flujo del
  // laboratorio — todo sin staff real. Borra este bloque cuando conectes
  // validación manual real.
  setInterval(() => {
    PaymentService.autoAprobarPendientesDemo().catch((err) => {
      logger.error('Error en auto-aprobación de pagos (demo)', { err });
    });
    SampleService.autoProgresarDemo().catch((err) => {
      logger.error('Error en avance automático de muestras (demo)', { err });
    });
  }, 20000);

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
  console.error('❌ Error fatal al iniciar el servidor');
  console.error('Mensaje:', err instanceof Error ? err.message : err);
  console.error('Detalle completo:', err);
  process.exit(1);
});
