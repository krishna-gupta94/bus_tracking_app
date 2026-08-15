import { Router } from 'express';
import { getStudents, getStudent, createStudent, updateStudent, deleteStudent } from '../controllers/studentController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN'), getStudents);
router.get('/:id', requireRole('ADMIN'), getStudent);
router.post('/', requireRole('ADMIN'), createStudent);
router.put('/:id', requireRole('ADMIN'), updateStudent);
router.delete('/:id', requireRole('ADMIN'), deleteStudent);

export default router;
