import axios, { AxiosError } from 'axios';
import prisma from '../../src/lib/prisma';

const SESSION_NAME = 'default';
const DEFAULT_BASE_URL = 'http://localhost:3000/api';

const RAW_BASE_URL = process.env.WAHA_BASE_URL || DEFAULT_BASE_URL;
const NORMALIZED_BASE = /\/api\/?$/.test(RAW_BASE_URL)
  ? RAW_BASE_URL
  : `${RAW_BASE_URL.replace(/\/+$/, '')}/api`;
const WAHA_BASE_URL = NORMALIZED_BASE.replace(/\/+$/, '');
const WAHA_API_KEY = process.env.WAHA_API_KEY;

const wahaClient = axios.create({
  baseURL: WAHA_BASE_URL,
  timeout: 15000,
});

wahaClient.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  const finalUrl = `${config.baseURL ?? WAHA_BASE_URL}${config.url ?? ''}`;
  console.debug('[WAHA] Request', method, finalUrl);
  return config;
});

wahaClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const axiosErr = error as AxiosError;
    const method = axiosErr.config?.method?.toUpperCase();
    const url = axiosErr.config?.url ? `${axiosErr.config?.baseURL ?? WAHA_BASE_URL}${axiosErr.config.url}` : undefined;
    const status = axiosErr.response?.status;
    if (method && url) {
      console.error('[WAHA] Response error', method, url, status, axiosErr.response?.data ?? axiosErr.message);
    }
    return Promise.reject(error);
  }
);

if (WAHA_API_KEY) {
  wahaClient.defaults.headers.common['X-Api-Key'] = WAHA_API_KEY;
}

if (!WAHA_API_KEY) {
  console.warn('WAHA_API_KEY não configurado; as requisições WAHA serão enviadas sem autenticação.');
}

type WahaStatus = 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | string | null | undefined;
type SessionStatus = 'connected' | 'connecting' | 'scan_qr_code' | 'disconnected' | 'failed';

interface SessionSnapshot {
  status: SessionStatus;
  rawStatus?: WahaStatus;
  qrCode: string | null;
}

const normalizeStatus = (status: WahaStatus): SessionStatus => {
  switch (status) {
    case 'WORKING':
      return 'connected';
    case 'SCAN_QR_CODE':
      return 'scan_qr_code';
    case 'STARTING':
      return 'connecting';
    case 'FAILED':
      return 'failed';
    default:
      return 'disconnected';
  }
};

const ensureSessionRow = async () => {
  const existing = await prisma.whatsAppSession.findUnique({ where: { name: SESSION_NAME } });
  if (!existing) {
    await prisma.whatsAppSession.create({ data: { name: SESSION_NAME, status: 'disconnected' } });
  }
};

const persistSnapshot = async (snapshot: SessionSnapshot) => {
  await ensureSessionRow();
  const data: Record<string, any> = {
    status: snapshot.status,
    qrCode: snapshot.qrCode,
  };

  if (snapshot.status === 'connected') {
    data.connectedAt = new Date();
  }
  if (snapshot.status === 'disconnected' || snapshot.status === 'failed') {
    data.connectedAt = null;
  }

  await prisma.whatsAppSession.update({
    where: { name: SESSION_NAME },
    data,
  });
};

const createRemoteSession = async () => {
  try {
    await wahaClient.post('/sessions', { name: SESSION_NAME, start: true });
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (!status || (status !== 400 && status !== 409)) {
      throw err;
    }
  }
};

const startRemoteSession = async () => {
  try {
    await wahaClient.post(`/sessions/${SESSION_NAME}/start`);
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (status && status !== 200 && status !== 409 && status !== 202) {
      throw err;
    }
  }
};

const fetchRemoteSession = async (): Promise<WahaStatus> => {
  try {
    const response = await wahaClient.get(`/sessions/${SESSION_NAME}`);
    return response.data?.status ?? null;
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (status === 404 || status === 400) {
      console.warn('WAHA session not found when fetching status. Consider running init.', axiosErr.response?.data);
      return null;
    }
    throw err;
  }
};

const fetchQrCode = async (): Promise<string | null> => {
  try {
    const response = await wahaClient.get(`/${SESSION_NAME}/auth/qr`, {
      params: { format: 'raw' },
    });
    if (typeof response.data === 'string') {
      return response.data;
    }
    return response.data?.value || null;
  } catch (err) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status;
    if (status === 404 || status === 400) {
      return null;
    }
    throw err;
  }
};

export const initWhatsApp = async (): Promise<SessionSnapshot> => {
  await ensureSessionRow();
  await createRemoteSession();
  await startRemoteSession();

  const remoteStatus = await fetchRemoteSession();
  const normalized = normalizeStatus(remoteStatus);
  const qrCode = normalized === 'scan_qr_code' ? await fetchQrCode() : null;

  const snapshot: SessionSnapshot = {
    status: normalized,
    rawStatus: remoteStatus,
    qrCode,
  };

  await persistSnapshot(snapshot);

  return snapshot;
};

export const getSessionStatus = async (): Promise<SessionSnapshot> => {
  await ensureSessionRow();
  try {
    const remoteStatus = await fetchRemoteSession();
    const normalized = normalizeStatus(remoteStatus);
    const qrCode = normalized === 'scan_qr_code' ? await fetchQrCode() : null;

    const snapshot: SessionSnapshot = {
      status: normalized,
      rawStatus: remoteStatus,
      qrCode,
    };

    await persistSnapshot(snapshot);

    return snapshot;
  } catch (error) {
    console.error('WAHA status fetch failed:', (error as Error).message);
    const snapshot: SessionSnapshot = {
      status: 'disconnected',
      rawStatus: 'ERROR',
      qrCode: null,
    };
    await persistSnapshot(snapshot);
    return snapshot;
  }
};

export const requestPairingCode = async (phoneNumber: string, method?: string) => {
  if (!phoneNumber) {
    throw new Error('phoneNumber is required');
  }

  const payload: Record<string, string> = {
    phoneNumber,
  };

  if (method) {
    payload.method = method;
  }

  const response = await wahaClient.post(`/${SESSION_NAME}/auth/request-code`, payload);
  return response.data ?? { success: true };
};

export const disconnectSession = async (): Promise<boolean> => {
  try {
    try {
      await wahaClient.post(`/sessions/${SESSION_NAME}/stop`);
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status !== 404) {
        throw err;
      }
    }

    const snapshot: SessionSnapshot = {
      status: 'disconnected',
      rawStatus: 'STOPPED',
      qrCode: null,
    };

    await persistSnapshot(snapshot);
    return true;
  } catch (error) {
    console.error('Error disconnecting WAHA session:', error);
    return false;
  }
};

const toChatId = (phoneNumber: string): string => {
  if (!phoneNumber) {
    throw new Error('phoneNumber is required');
  }

  const trimmed = phoneNumber.trim();
  if (trimmed.includes('@')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  return `${digits}@c.us`;
};

export const sendWhatsAppMessage = async (
  _sessionId: string,
  phoneNumber: string,
  message: string
): Promise<boolean> => {
  try {
    if (!message) {
      throw new Error('message is required');
    }

    const chatId = toChatId(phoneNumber);
    await wahaClient.post('/sendText', {
      session: SESSION_NAME,
      chatId,
      text: message,
      linkPreview: false,
    });

    return true;
  } catch (error) {
    const axiosErr = error as AxiosError;
    const status = axiosErr.response?.status;
    const errorMsg = axiosErr.response?.data;
    console.error('Error sending WhatsApp message via WAHA:', status || '', errorMsg || axiosErr.message);
    return false;
  }
};

export const getSessionQrCode = async (): Promise<string | null> => {
  return fetchQrCode();
};