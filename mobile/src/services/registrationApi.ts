import axios from 'axios';
import * as FileSystem from 'expo-file-system';

// ─── API client ──────────────────────────────────────────────────────────────
// Uses same base URL pattern as AuthContext.
// Imported statically — serverUrl is passed in from calls.

export async function submitRegistration(
  serverUrl: string,
  data: {
    name: string;
    studentCode: string;
    email: string;
    phone?: string;
    password: string;
    courseStartYear: number;
    courseEndYear: number;
    routeId: string;
    busId: string;
    stopId: string;
  }
): Promise<{ requestId: string; email: string; studentCode: string; status: string }> {
  const res = await axios.post(`${serverUrl}/registration/submit`, data, { timeout: 15000 });
  return res.data.data;
}

export async function getRegistrationStatus(
  serverUrl: string,
  requestId: string
): Promise<{
  id: string;
  status: string;
  emailVerified: boolean;
  rejectionReason?: string;
  name: string;
  email: string;
  studentCode: string;
}> {
  const res = await axios.get(`${serverUrl}/registration/status/${requestId}`, { timeout: 10000 });
  return res.data.data;
}

export async function setupPassword(
  serverUrl: string,
  data: { requestId: string; token: string; password: string; confirmPassword: string }
): Promise<void> {
  await axios.post(`${serverUrl}/registration/setup-password`, data, { timeout: 15000 });
}

export async function getPublicRoutes(
  serverUrl: string
): Promise<Array<{ id: string; name: string; description?: string }>> {
  const res = await axios.get(`${serverUrl}/routes/public`, { timeout: 10000 });
  return res.data.data;
}

export async function getBusesForRoute(
  serverUrl: string,
  routeId: string
): Promise<Array<{ id: string; busNumber: string; capacity: number; status: string }>> {
  const res = await axios.get(`${serverUrl}/routes/public/${routeId}/buses`, { timeout: 10000 });
  return res.data.data;
}

export async function getStopsForRoute(
  serverUrl: string,
  routeId: string
): Promise<Array<{ id: string; name: string; sequence: number; address?: string }>> {
  const res = await axios.get(`${serverUrl}/routes/public/${routeId}/stops`, { timeout: 10000 });
  return res.data.data;
}

export async function uploadRegistrationDoc(
  serverUrl: string,
  requestId: string,
  docType: 'college-id' | 'bus-slip',
  fileUri: string,
  mimeType: string
): Promise<string> {
  const uploadUrl = `${serverUrl}/upload/registration-doc`.replace('/api/', '/');
  // Use expo-file-system uploadAsync for multipart upload
  const result = await FileSystem.uploadAsync(
    uploadUrl.replace('/registration/submit', '').replace('/api', '') + (serverUrl.includes('/api') ? '' : '/api') + '/upload/registration-doc',
    fileUri,
    {
      httpMethod: 'POST',
      uploadType: (FileSystem as any).FileSystemUploadType?.MULTIPART ?? 0,
      fieldName: 'file',
      mimeType,
      parameters: {
        requestId,
        docType,
      },
    }
  );

  if (result.status !== 200 && result.status !== 201) {
    const body = JSON.parse(result.body);
    throw new Error(body.message || 'Upload failed');
  }

  const body = JSON.parse(result.body);
  return body.data.storagePath;
}

/** Simple document upload using the exact serverUrl format */
export async function uploadDoc(
  serverUrl: string,
  requestId: string,
  docType: 'college-id' | 'bus-slip',
  fileUri: string,
  mimeType: string
): Promise<string> {
  // Derive upload base URL from serverUrl (e.g. http://192.168.1.10:5000/api)
  const base = serverUrl.replace(/\/api\/?$/, '');
  const uploadUrl = `${base}/api/upload/registration-doc`;

  const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'POST',
    uploadType: (FileSystem as any).FileSystemUploadType?.MULTIPART ?? 0,
    fieldName: 'file',
    mimeType,
    parameters: { requestId, docType },
  });

  if (result.status < 200 || result.status >= 300) {
    const body = JSON.parse(result.body);
    throw new Error(body.message || 'Upload failed');
  }

  const body = JSON.parse(result.body);
  return body.data.storagePath;
}
