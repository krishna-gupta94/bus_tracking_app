import { Router } from 'express';
import {
  submitRegistration,
  getRegistrationStatus,
  listRegistrationRequests,
  getRegistrationRequest,
  getDocumentUrl,
  approveRequest,
  rejectRequest,
} from '../controllers/registrationController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// ── Public (no auth required) ──────────────────────────────────────────────
router.post('/submit',           submitRegistration);
router.get('/status/:requestId', getRegistrationStatus);

// ── Admin only ─────────────────────────────────────────────────────────────
router.get('/requests',
  authenticate, requireRole('ADMIN'),
  listRegistrationRequests
);
router.get('/requests/:id',
  authenticate, requireRole('ADMIN'),
  getRegistrationRequest
);
router.get('/requests/:id/document-url',
  authenticate, requireRole('ADMIN'),
  getDocumentUrl
);
router.post('/requests/:id/approve',
  authenticate, requireRole('ADMIN'),
  approveRequest
);
router.post('/requests/:id/reject',
  authenticate, requireRole('ADMIN'),
  rejectRequest
);

export default router;
