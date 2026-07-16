import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'LabTech Minero API',
      version: '1.0.0',
      description:
        'API REST para el ecosistema LabTech Minero: PWA de clientes y Dashboard Ejecutivo. ' +
        'Gestiona autenticación, muestras, pagos, resultados y facturación.',
      contact: { name: 'LabTech Minero', url: 'https://labtechminero.pe' },
    },
    servers: [{ url: env.API_URL, description: env.NODE_ENV }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.schema.ts'],
});
