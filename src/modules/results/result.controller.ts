import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AppError } from '../../shared/errors/AppError';
import { ResultService } from './result.service';
import { STAFF_ROLES } from '../../middlewares/role.middleware';

function isStaff(role?: string) {
  return !!role && (STAFF_ROLES as string[]).includes(role);
}

export const ResultController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await ResultService.create(req.params.sampleId, req.body);
    res.status(201).json({ ok: true, data: result });
  }),

  getBySample: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await ResultService.getBySample(req.params.sampleId, req.user.sub, isStaff(req.user.role));
    res.status(200).json({ ok: true, data: result });
  }),

  marcarEntregado: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const sample = await ResultService.marcarEntregado(req.params.sampleId, req.user.sub);
    res.status(200).json({ ok: true, data: sample });
  }),

  /** Envía el PDF del informe por correo al cliente (solo staff). */
  enviarEmail: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await ResultService.enviarPorEmail(req.params.sampleId);
    res.status(200).json({ ok: true, data: result, message: `Correo enviado a ${result.enviadoA}` });
  }),
};
