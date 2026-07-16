import multer from 'multer';
import { AppError } from '../../shared/errors/AppError';

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export const uploadComprobante = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(AppError.badRequest('Formato de archivo no permitido. Usa JPG, PNG, WEBP o PDF.'));
    }
    cb(null, true);
  },
}).single('comprobante');
