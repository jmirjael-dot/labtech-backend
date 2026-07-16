import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AppError } from '../../shared/errors/AppError';
import { PaymentService } from './payment.service';

export const PaymentController = {
  initiate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await PaymentService.initiate(req.params.sampleId, req.user.sub, req.body);
    res.status(200).json({ ok: true, data: result });
  }),

  uploadComprobante: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    if (!req.file) throw AppError.badRequest('Adjunta la captura del comprobante (campo "comprobante")');

    const payment = await PaymentService.uploadComprobante(req.params.sampleId, req.user.sub, req.file);
    res.status(200).json({ ok: true, data: payment });
  }),

  validate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const payment = await PaymentService.validate(req.params.id, req.user.sub, req.body.estado, req.body.nota);
    res.status(200).json({ ok: true, data: payment });
  }),

  getBySample: asyncHandler(async (req: Request, res: Response) => {
    const payment = await PaymentService.getBySample(req.params.sampleId);
    res.status(200).json({ ok: true, data: payment });
  }),
};
