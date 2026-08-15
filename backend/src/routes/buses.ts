import { Router } from 'express';
import { getBuses, getBus, createBus, updateBus, deleteBus } from '../controllers/busController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'DRIVER', 'STUDENT'), getBuses);
router.get('/:id', requireRole('ADMIN', 'DRIVER', 'STUDENT'), getBus);
router.post('/', requireRole('ADMIN'), createBus);
router.put('/:id', requireRole('ADMIN'), updateBus);
router.delete('/:id', requireRole('ADMIN'), deleteBus);

export default router;
