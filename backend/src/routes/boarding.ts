import { Router } from 'express';
import {
  getMyBoardingStatus,
  recordStudentPing,
  getRouteBoardingOverview,
  getBusOnboardStudents,
  runBoardingSimulation,
  confirmBoarding,
  getConflicts,
  getConflictDetail,
  resolveConflict,
  getPendingConfirmation,
  exportBoardingData,
} from '../controllers/boardingController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Student endpoints
router.get('/my-status', requireRole('STUDENT', 'ADMIN'), getMyBoardingStatus);
router.post('/student-ping', requireRole('STUDENT'), recordStudentPing);

// Boarding Conflict Detection — Student confirmation
router.post('/confirm', requireRole('STUDENT'), confirmBoarding);
router.get('/pending/:studentId', requireRole('STUDENT', 'ADMIN'), getPendingConfirmation);

// Admin & Emergency endpoints
router.get('/export', requireRole('ADMIN'), exportBoardingData);
router.get('/admin/route/:routeId', requireRole('ADMIN'), getRouteBoardingOverview);
router.get('/bus/:busId/onboard', requireRole('ADMIN', 'DRIVER'), getBusOnboardStudents);

// Boarding Conflict Detection — Admin conflict management
router.get('/conflicts', requireRole('ADMIN'), getConflicts);
router.get('/conflicts/:eventId', requireRole('ADMIN'), getConflictDetail);
router.patch('/conflicts/:eventId/resolve', requireRole('ADMIN'), resolveConflict);

// Simulation & testing endpoint
router.post('/simulate', requireRole('ADMIN'), runBoardingSimulation);

export default router;
