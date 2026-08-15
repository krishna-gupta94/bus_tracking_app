import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getBusETA, getMyStopETA } from '../controllers/etaController';

const router = Router();

router.use(authenticate);

// Student helper endpoint
router.get('/eta/my-stop', getMyStopETA);

// Specific bus ETA endpoint: GET /api/buses/:busId/eta?stopId=...
router.get('/:busId/eta', getBusETA);

export default router;
