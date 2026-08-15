import { Router } from 'express';
import { getDrivers, getDriver, createDriver, updateDriver, deleteDriver } from '../controllers/driverController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN'), getDrivers);
router.get('/:id', requireRole('ADMIN'), getDriver);
router.post('/', requireRole('ADMIN'), createDriver);
router.put('/:id', requireRole('ADMIN'), updateDriver);
router.delete('/:id', requireRole('ADMIN'), deleteDriver);

export default router;
