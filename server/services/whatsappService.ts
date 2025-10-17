import { Boom } from '@hapi/boom';
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  isJidUser
} from 'baileys';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import QRCode from 'qrcode';
import prisma from '../../src/lib/prisma';

const sessions = new Map();

// Initialize WhatsApp connection
export const initWhatsApp = async (
  sessionId: string,
  sessionName: string
): Promise<{ qrCode: string; success: boolean }> => {
  try {
  // Resolve session directory in ESM-safe way
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Create session directory if it doesn't exist
  const sessionDir = path.join(__dirname, '../../whatsapp-sessions', sessionName);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Load auth state
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    // Create WhatsApp socket
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    // Save session (store is optional with current baileys build; keep a lightweight placeholder)
    const storePlaceholder = {
      // minimal API used by other parts of the app if any
      read: () => {},
      write: () => {},
      bind: () => {},
    };

    sessions.set(sessionId, {
      sock,
      store: storePlaceholder,
      sessionName,
      isConnected: false,
    });

    // Listen for auth updates
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Generate QR code as base64 image
        const qrCode = await QRCode.toDataURL(qr);

        // Update QR code in database
        await prisma.whatsAppSession.update({
          where: { id: sessionId },
          data: { qrCode },
        });
      }

      if (connection === 'open') {
        // Update session status
        sessions.get(sessionId).isConnected = true;

        await prisma.whatsAppSession.update({
          where: { id: sessionId },
          data: {
            status: 'connected',
            qrCode: null,
          },
        });

        console.log(`WhatsApp session ${sessionName} connected`);
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;

        console.log(`WhatsApp connection closed for ${sessionName}. Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          // Try to reconnect
          initWhatsApp(sessionId, sessionName);
        } else {
          // Update session status
          sessions.get(sessionId).isConnected = false;

          await prisma.whatsAppSession.update({
            where: { id: sessionId },
            data: { status: 'disconnected' },
          });
        }
      }
    });

    // Generate initial QR code
    const qrCode = await QRCode.toDataURL('Loading QR code...');

    return { qrCode, success: true };
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    return { qrCode: '', success: false };
  }
};

// Get session status
export const getSessionStatus = async (sessionId: string): Promise<string> => {
  const session = sessions.get(sessionId);

  if (!session) {
    return 'not_found';
  }

  return session.isConnected ? 'connected' : 'disconnected';
};

// Disconnect session
export const disconnectSession = async (sessionId: string): Promise<boolean> => {
  try {
    const session = sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Logout and close connection
    await session.sock.logout();

    // Remove session
    sessions.delete(sessionId);

    return true;
  } catch (error) {
    console.error('Error disconnecting session:', error);
    return false;
  }
};

// Send WhatsApp message
export const sendWhatsAppMessage = async (
  sessionId: string,
  phoneNumber: string,
  message: string
): Promise<boolean> => {
  try {
    const session = sessions.get(sessionId);

    if (!session || !session.isConnected) {
      return false;
    }

    // Format phone number if needed
    let jid = phoneNumber;
    if (!isJidUser(phoneNumber)) {
      jid = phoneNumber.includes('@c.us') ?
        phoneNumber :
        `${phoneNumber.replace(/[^\d]/g, '')}@s.whatsapp.net`;
    }

    // Send message
    await session.sock.sendMessage(jid, { text: message });

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
};