import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_URL: z.string().default('http://localhost:4000'),
  CORS_ORIGINS: z.string().default('*'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerido'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET debe tener al menos 16 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_UPLOADS_DIR: z.string().default('uploads'),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  CULQI_PUBLIC_KEY: z.string().optional(),
  CULQI_SECRET_KEY: z.string().optional(),
  YAPE_BUSINESS_API_KEY: z.string().optional(),
  YAPE_BUSINESS_MERCHANT_ID: z.string().optional(),
  BCP_ACCOUNT_NUMBER: z.string().optional(),
  BCP_CCI: z.string().optional(),
  BCP_ACCOUNT_HOLDER: z.string().optional(),

  EMAIL_DRIVER: z.enum(['resend', 'smtp']).default('resend'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('LabTech Minero <no-reply@labtechminero.pe>'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  INVOICE_SERIES_BOLETA: z.string().default('B001'),
  INVOICE_SERIES_FACTURA: z.string().default('F001'),
  INVOICE_IGV_PERCENT: z.coerce.number().default(18),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins =
  env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',').map((o) => o.trim());
