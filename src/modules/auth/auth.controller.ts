import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { AppError } from '../../shared/errors/AppError';
import { AuthService } from './auth.service';

export const AuthController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.register(req.body, req.ip);
    res.status(201).json({ ok: true, data: result });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body, req.ip);
    res.status(200).json({ ok: true, data: result });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.refresh(req.body.refreshToken, req.ip);
    res.status(200).json({ ok: true, data: result });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await AuthService.logout(req.body.refreshToken);
    res.status(200).json({ ok: true, message: 'Sesión cerrada' });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await AuthService.me(req.user.sub);
    res.status(200).json({ ok: true, data: user });
  }),
};
