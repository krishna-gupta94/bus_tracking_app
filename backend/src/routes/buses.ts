import { Router } from 'express';
import { getBuses, getBus, createBus, updateBus, deleteBus } from '../controllers/busController';
import { getBusETA, getMyStopETA, getRouteBusesETA } from '../controllers/etaController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/eta/my-stop', requireRole('ADMIN', 'DRIVER', 'STUDENT'), getMyStopETA);
router.get('/eta/my-route', requireRole('ADMIN', 'DRIVER', 'STUDENT'), getMyStopETA);
router.get('/route/:routeId/eta', requireRole('ADMIN', 'DRIVER', 'STUDENT'), getRouteBusesETA);
router.get('/:busId/eta', requireRole('ADMIN', 'DRIVER', 'STUDENT'), getBusETA);

router.get('/', requireRole('ADMIN', 'DRIVER', 'STUDENT'), getBuses);
router.get('/:id', requireRole('ADMIN', 'DRIVER', 'STUDENT'), getBus);
router.post('/', requireRole('ADMIN'), createBus);
router.put('/:id', requireRole('ADMIN'), updateBus);
router.delete('/:id', requireRole('ADMIN'), deleteBus);

export default router;
