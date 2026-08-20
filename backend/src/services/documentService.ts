import { uploadToStorage, createSignedUrl } from './supabaseAdmin';
import path from 'path';

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
  return uploadToStorage(STUDENT_DOCS_BUCKET, storagePath, buffer, mimeType);
}

/**
 * Generate a 15-minute signed URL for Admin document review.
 */
export async function getDocumentSignedUrl(storagePath: string): Promise<string> {
  return createSignedUrl(STUDENT_DOCS_BUCKET, storagePath, 900);
}

/**
 * Delete registration documents from storage
 */
export async function deleteRegistrationDocs(paths: string[]): Promise<void> {
  const { deleteFromStorage } = await import('./supabaseAdmin');
  await deleteFromStorage(STUDENT_DOCS_BUCKET, paths);
}
