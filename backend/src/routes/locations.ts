import { Router } from 'express';
import { updateLocation, getLatestLocation, getTripLocations } from '../controllers/locationController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/update', requireRole('DRIVER'), updateLocation);
router.get('/bus/:busId', getLatestLocation);
router.get('/trip/:tripId', getTripLocations);

export default router;
