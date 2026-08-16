import { Router } from 'express';
import { createSOSAlert, getSOSAlerts, updateSOSStatus } from '../controllers/sosController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Any authenticated student/driver can create an emergency SOS alert
router.post('/', createSOSAlert);

// Only ADMIN can view and resolve alerts
router.get('/', requireRole('ADMIN'), getSOSAlerts);
router.patch('/:id/status', requireRole('ADMIN'), updateSOSStatus);

export default router;
