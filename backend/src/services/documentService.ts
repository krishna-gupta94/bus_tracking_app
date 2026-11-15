import { uploadToStorage, createSignedUrl } from './supabaseAdmin';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

export const STUDENT_DOCS_BUCKET = 'student-documents';

/** Allowed MIME types for registration documents */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateDocumentFile(
  mimeType: string,
  sizeBytes: number
): string | null {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return `File type "${mimeType}" is not allowed. Accepted: JPEG, PNG, HEIC, WEBP, PDF.`;
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return `File size ${(sizeBytes / 1024 / 1024).toFixed(1)} MB exceeds the 10 MB limit.`;
  }
  return null;
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  return map[mimeType] || 'bin';
}

/**
 * Upload a registration document to the private `student-documents` bucket.
 * Falls back to local disk storage if Supabase credentials are not configured.
 * @param requestId  RegistrationRequest.id
 * @param docType    'college-id' | 'bus-slip'
 * @param buffer     File buffer
 * @param mimeType   MIME type of the file
 * @returns          Storage path (e.g. "registrations/abc123/college-id.jpg")
 */
export async function uploadRegistrationDoc(
  requestId: string,
  docType: 'college-id' | 'bus-slip',
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = getExtension(mimeType);
  const storagePath = `registrations/${requestId}/${docType}.${ext}`;

  if (
    config.supabaseUrl &&
    config.supabaseServiceRoleKey &&
    config.supabaseServiceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE'
  ) {
    try {
      return await uploadToStorage(STUDENT_DOCS_BUCKET, storagePath, buffer, mimeType);
    } catch (err) {
      console.warn('[DocumentService] Supabase upload failed, falling back to local disk storage:', err);
    }
  }

  // Fallback to local disk storage
  const localDir = path.join(process.cwd(), 'uploads', 'registrations', requestId);
  await fs.promises.mkdir(localDir, { recursive: true });
  const localFilePath = path.join(localDir, `${docType}.${ext}`);
  await fs.promises.writeFile(localFilePath, buffer);
  return storagePath;
}

/**
 * Generate a 15-minute signed URL for Admin document review.
 * Falls back to local file path URL if Supabase storage is not configured.
 */
export async function getDocumentSignedUrl(storagePath: string): Promise<string> {
  if (
    config.supabaseUrl &&
    config.supabaseServiceRoleKey &&
    config.supabaseServiceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE'
  ) {
    try {
      return await createSignedUrl(STUDENT_DOCS_BUCKET, storagePath, 900);
    } catch (err) {
      console.warn('[DocumentService] Supabase signed URL generation failed, falling back to local file link:', err);
    }
  }

  const baseUrl = process.env.API_BASE_URL || `http://localhost:${config.port}`;
  return `${baseUrl}/api/upload/file/${storagePath}`;
}

/**
 * Delete registration documents from storage
 */
export async function deleteRegistrationDocs(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  if (
    config.supabaseUrl &&
    config.supabaseServiceRoleKey &&
    config.supabaseServiceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE'
  ) {
    try {
      const { deleteFromStorage } = await import('./supabaseAdmin');
      await deleteFromStorage(STUDENT_DOCS_BUCKET, paths);
    } catch (e) {}
  }
  for (const p of paths) {
    try {
      const localFilePath = path.join(process.cwd(), 'uploads', p);
      if (fs.existsSync(localFilePath)) {
        await fs.promises.unlink(localFilePath);
      }
    } catch (e) {}
  }
}
