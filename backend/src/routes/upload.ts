import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import {
  uploadRegistrationDoc,
  validateDocumentFile,
} from '../services/documentService';

const router = Router();

// Memory storage — files are processed and forwarded to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB guard
});

/**
 * POST /api/upload/registration-doc
 * Upload a single registration document (College ID or Bus Slip).
 *
 * Form fields:
 *   - file       (multipart file)
 *   - requestId  (RegistrationRequest ID)
 *   - docType    ('college-id' | 'bus-slip')
 */
router.post(
  '/registration-doc',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const { requestId, docType } = req.body as { requestId?: string; docType?: string };

    if (!requestId) {
      res.status(400).json({ success: false, message: 'requestId is required' }); return;
    }
    if (!docType || !['college-id', 'bus-slip'].includes(docType)) {
      res.status(400).json({ success: false, message: 'docType must be college-id or bus-slip' }); return;
    }

    // Verify the registration request exists and is still in a pending state
    const regReq = await prisma.registrationRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true },
    });
    if (!regReq) {
      res.status(404).json({ success: false, message: 'Registration request not found' }); return;
    }
    if (!['PENDING', 'PENDING_ADMIN_REVIEW', 'EMAIL_VERIFICATION_PENDING'].includes(regReq.status)) {
      res.status(400).json({ success: false, message: 'Documents cannot be uploaded for this request status' }); return;
    }

    // Validate file type and size
    const validationError = validateDocumentFile(req.file.mimetype, req.file.size);
    if (validationError) {
      res.status(400).json({ success: false, message: validationError }); return;
    }

    // Upload to private Supabase Storage
    const storagePath = await uploadRegistrationDoc(
      requestId,
      docType as 'college-id' | 'bus-slip',
      req.file.buffer,
      req.file.mimetype
    );

    // Persist path + metadata on the RegistrationRequest
    const originalName = req.file.originalname || (docType === 'college-id' ? 'college-id.pdf' : 'bus-slip.pdf');
    await prisma.registrationRequest.update({
      where: { id: requestId },
      data: docType === 'college-id'
        ? {
            collegeIdPath: storagePath,
            collegeIdName: originalName,
            collegeIdType: req.file.mimetype,
            collegeIdSize: req.file.size,
            collegeIdUploadedAt: new Date(),
          }
        : {
            busSlipPath: storagePath,
            busSlipName: originalName,
            busSlipType: req.file.mimetype,
            busSlipSize: req.file.size,
            busSlipUploadedAt: new Date(),
          },
    });

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        storagePath,
        fileName: originalName,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });
  }
);

export default router;
