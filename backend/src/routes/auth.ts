import { Router } from 'express';
import {
  login,
  logout,
  getMe,
  changePassword,
  adminResetPassword,
} from '../controllers/authController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// User Self Password Change (Student, Driver, Admin)
router.put('/change-password', authenticate, changePassword);

// Admin Reset Password for any Student or Driver
router.put('/admin/reset-password/:userId', authenticate, requireRole('ADMIN'), adminResetPassword);

export default router;
