import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AppError } from '../../shared/errors/AppError';
import { SampleService } from './sample.service';
import { STAFF_ROLES } from '../../middlewares/role.middleware';

function isStaff(role?: string) {
  return !!role && (STAFF_ROLES as string[]).includes(role);
}

export const SampleController = {
  /** Cliente crea su propia muestra (PWA). */
  create: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const sample = await SampleService.create(req.user.sub, req.body);
    res.status(201).json({ ok: true, data: sample });
  }),

  /** Cliente ve solo sus muestras; staff ve todas (Dashboard Ejecutivo). */
  list: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = isStaff(req.user.role)
      ? await SampleService.list(req.query as any)
      : await SampleService.listForClient(req.user.sub, req.query as any);
    res.status(200).json({ ok: true, ...result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const sample = await SampleService.getById(req.params.id, req.user.sub, isStaff(req.user.role));
    res.status(200).json({ ok: true, data: sample });
  }),

  /** Solo staff mueve el estado de una muestra (recepción, laboratorio, control de calidad). */
  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const updated = await SampleService.updateStatus(
      req.params.id,
      req.body.estado,
      req.user.sub,
      req.body.nota
    );
    res.status(200).json({ ok: true, data: updated });
  }),

  /**
   * Elimina una muestra — cliente dueño o staff. Solo permitido mientras
   * sigue PENDIENTE_PAGO (nunca se borra algo que ya tiene un pago real
   * registrado, para no perder trazabilidad de facturación).
   */
  remove: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await SampleService.remove(req.params.id, req.user.sub, isStaff(req.user.role));
    res.status(200).json({ ok: true, message: 'Muestra eliminada' });
  }),
};
