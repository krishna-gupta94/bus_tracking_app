import { Router } from 'express';
import {
  submitRegistration,
  getRegistrationStatus,
  emailVerifiedWebhook,
  listRegistrationRequests,
  getRegistrationRequest,
  getDocumentUrl,
  approveRequest,
  rejectRequest,
  setupPassword,
  resendSetupLink,
} from '../controllers/registrationController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// ── Public (no auth required) ──────────────────────────────────────────────
router.post('/submit',                      submitRegistration);
router.get('/status/:requestId',            getRegistrationStatus);
router.post('/webhook/email-verified',      emailVerifiedWebhook);
router.post('/setup-password',              setupPassword);

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
router.post('/requests/:id/resend-setup-link',
  authenticate, requireRole('ADMIN'),
  resendSetupLink
);

export default router;
