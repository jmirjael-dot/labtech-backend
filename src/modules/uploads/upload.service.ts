import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { env } from '../../config/env';

export interface StoredFile {
  url: string;
  key: string;
}

/**
 * Abstracción de almacenamiento. En desarrollo escribe a disco local
 * (servido como estático desde /uploads). En producción, cambiar
 * STORAGE_DRIVER=s3 para subir a AWS S3 sin tocar el resto del código.
 */
export const StorageService = {
  async saveBuffer(buffer: Buffer, originalName: string, folder: string): Promise<StoredFile> {
    if (env.STORAGE_DRIVER === 's3') {
      return saveToS3(buffer, originalName, folder);
    }
    return saveToLocal(buffer, originalName, folder);
  },
};

function safeExt(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return ext || '.bin';
}

async function saveToLocal(buffer: Buffer, originalName: string, folder: string): Promise<StoredFile> {
  const dir = path.join(process.cwd(), env.LOCAL_UPLOADS_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${uuid()}${safeExt(originalName)}`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);

  const key = `${folder}/${filename}`;
  return { key, url: `${env.API_URL}/uploads/${key}` };
}

async function saveToS3(buffer: Buffer, originalName: string, folder: string): Promise<StoredFile> {
  // Import perezoso: evita requerir aws-sdk si el proyecto corre en modo local.
  const AWS = await import('aws-sdk');
  const s3 = new AWS.S3({ region: env.AWS_REGION });

  const key = `${folder}/${uuid()}${safeExt(originalName)}`;

  await s3
    .putObject({
      Bucket: env.AWS_S3_BUCKET as string,
      Key: key,
      Body: buffer,
      ContentType: guessContentType(originalName),
    })
    .promise();

  return { key, url: `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}` };
}

function guessContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}
