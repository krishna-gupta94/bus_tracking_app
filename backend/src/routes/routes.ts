import { Router, Request, Response } from 'express';
import {
  getRoutes, getRoute, createRoute, updateRoute, deleteRoute,
  addStop, updateStop, deleteStop, getStopsByRoute, reorderStops
} from '../controllers/routeController';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../prisma/client';

const router = Router();

// ── Public endpoints (no auth) — used by the self-registration form ──────────

/** List active routes for the registration dropdown */
router.get('/public', async (_req: Request, res: Response): Promise<void> => {
  const routes = await prisma.route.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: routes });
});

/** List buses assigned to a specific route */
router.get('/public/:routeId/buses', async (req: Request, res: Response): Promise<void> => {
  const routeId = req.params.routeId as string;
  const buses = await prisma.bus.findMany({
    where: { routeId, status: { not: 'RETIRED' } },
    select: { id: true, busNumber: true, capacity: true, status: true },
    orderBy: { busNumber: 'asc' },
  });
  res.json({ success: true, data: buses });
});

/** List stops belonging to a specific route */
router.get('/public/:routeId/stops', async (req: Request, res: Response): Promise<void> => {
  const routeId = req.params.routeId as string;
  const stops = await prisma.stop.findMany({
    where: { routeId, status: 'ACTIVE' },
    select: { id: true, name: true, sequence: true, address: true },
    orderBy: { sequence: 'asc' },
  });
  res.json({ success: true, data: stops });
});

// ── Authenticated endpoints ───────────────────────────────────────────────────
router.use(authenticate);

// Stops — specific routes must come before /:id to avoid conflicts
router.get('/:routeId/stops', getStopsByRoute);
router.post('/:routeId/stops', requireRole('ADMIN'), addStop);
router.put('/:routeId/stops/reorder', requireRole('ADMIN'), reorderStops);
router.put('/stops/:id', requireRole('ADMIN'), updateStop);
router.delete('/stops/:id', requireRole('ADMIN'), deleteStop);

router.get('/', getRoutes);
router.get('/:id', getRoute);
router.post('/', requireRole('ADMIN'), createRoute);
router.put('/:id', requireRole('ADMIN'), updateRoute);
router.delete('/:id', requireRole('ADMIN'), deleteRoute);

export default router;
