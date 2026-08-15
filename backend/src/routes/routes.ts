import { Router } from 'express';
import {
  getRoutes, getRoute, createRoute, updateRoute, deleteRoute,
  addStop, updateStop, deleteStop, getStopsByRoute, reorderStops
} from '../controllers/routeController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getRoutes);
router.get('/:id', getRoute);
router.post('/', requireRole('ADMIN'), createRoute);
router.put('/:id', requireRole('ADMIN'), updateRoute);
router.delete('/:id', requireRole('ADMIN'), deleteRoute);

// Stops — specific routes must come before /:id to avoid conflicts
router.get('/:routeId/stops', getStopsByRoute);
router.post('/:routeId/stops', requireRole('ADMIN'), addStop);
router.put('/:routeId/stops/reorder', requireRole('ADMIN'), reorderStops);
router.put('/stops/:id', requireRole('ADMIN'), updateStop);
router.delete('/stops/:id', requireRole('ADMIN'), deleteStop);

export default router;
