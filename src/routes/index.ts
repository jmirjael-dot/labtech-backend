import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import sampleRoutes from '../modules/samples/sample.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import resultRoutes from '../modules/results/result.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'labtech-minero-backend', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/samples', sampleRoutes);
router.use('/payments', paymentRoutes);
router.use('/results', resultRoutes);

export default router;
