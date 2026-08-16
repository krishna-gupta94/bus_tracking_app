import { Router } from 'express';
import {
  getMyBoardingStatus,
  recordStudentPing,
  getRouteBoardingOverview,
  getBusOnboardStudents,
  runBoardingSimulation,
} from '../controllers/boardingController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Student endpoints
router.get('/my-status', requireRole('STUDENT', 'ADMIN'), getMyBoardingStatus);
router.post('/student-ping', requireRole('STUDENT'), recordStudentPing);

// Admin & Emergency endpoints
router.get('/admin/route/:routeId', requireRole('ADMIN'), getRouteBoardingOverview);
router.get('/bus/:busId/onboard', requireRole('ADMIN', 'DRIVER'), getBusOnboardStudents);

// Simulation & testing endpoint
router.post('/simulate', requireRole('ADMIN'), runBoardingSimulation);

export default router;
