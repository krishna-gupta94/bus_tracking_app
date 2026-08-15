import { Router } from 'express';
import { getTrips, getActiveTrips, startTrip, endTrip } from '../controllers/tripController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'DRIVER'), getTrips);
router.get('/active', getActiveTrips);
router.post('/start', requireRole('DRIVER'), startTrip);
router.post('/end', requireRole('DRIVER'), endTrip);

export default router;
