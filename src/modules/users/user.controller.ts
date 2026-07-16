import type { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { UserService } from './user.service';

export const UserController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await UserService.list(req.query as any);
    res.status(200).json({ ok: true, ...result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.getById(req.params.id);
    res.status(200).json({ ok: true, data: user });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.update(req.params.id, req.body);
    res.status(200).json({ ok: true, data: user });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const user = await UserService.remove(req.params.id);
    res.status(200).json({ ok: true, data: user, message: 'Usuario desactivado' });
  }),
};
