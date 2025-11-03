import express from 'express';
import prisma from '../../src/lib/prisma';
import {
  initWhatsApp,
  getSessionStatus,
  disconnectSession,
  sendWhatsAppMessage,
  requestPairingCode,
  getSessionQrCode,
} from '../services/whatsappService';

const router = express.Router();
const SESSION_NAME = 'default';

const persistSnapshot = async (status: string, qrCode: string | null) => {
  await prisma.whatsAppSession.upsert({
    where: { name: SESSION_NAME },
    update: {
      status,
      qrCode,
      connectedAt: status === 'connected' ? new Date() : null,
    },
    create: {
      name: SESSION_NAME,
      status,
      qrCode,
      connectedAt: status === 'connected' ? new Date() : null,
    },
  });
};

router.post('/init', async (_req, res) => {
  try {
    const snapshot = await initWhatsApp();
    await persistSnapshot(snapshot.status, snapshot.qrCode);
    res.json({
      message: 'WhatsApp session initialized',
      status: snapshot.status,
      qrCode: snapshot.qrCode,
    });
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    res.status(500).json({ message: 'Error initializing WhatsApp session' });
  }
});

router.get('/status', async (_req, res) => {
  try {
    const snapshot = await getSessionStatus();
    await persistSnapshot(snapshot.status, snapshot.qrCode);
    res.json({
      status: snapshot.status,
      qrCode: snapshot.qrCode,
      rawStatus: snapshot.rawStatus,
    });
  } catch (error) {
    console.error('Error getting WhatsApp status:', error);
    res.status(500).json({ message: 'Error retrieving WhatsApp status' });
  }
});

router.get('/qr', async (_req, res) => {
  try {
    const qrCode = await getSessionQrCode();
    res.json({ qrCode });
  } catch (error) {
    console.error('Error fetching WhatsApp QR:', error);
    res.status(500).json({ message: 'Error retrieving QR code' });
  }
});

router.post('/pair-code', async (req, res) => {
  try {
    const { phoneNumber, method } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: 'phoneNumber is required' });
    }

    const result = await requestPairingCode(phoneNumber, method);
    res.status(201).json(result || { success: true });
  } catch (error) {
    console.error('Error requesting pairing code:', error);
    res.status(500).json({ message: 'Error requesting pairing code' });
  }
});

router.post('/disconnect', async (_req, res) => {
  try {
    const success = await disconnectSession();
    if (success) {
      await persistSnapshot('disconnected', null);
      return res.json({ message: 'WhatsApp session disconnected' });
    }

    res.status(500).json({ message: 'Failed to disconnect session' });
  } catch (error) {
    console.error('Error disconnecting session:', error);
    res.status(500).json({ message: 'Error disconnecting session' });
  }
});

router.post('/send-test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ message: 'phoneNumber and message are required' });
    }

    const snapshot = await getSessionStatus();
    if (snapshot.status !== 'connected') {
      return res.status(400).json({ message: 'WhatsApp session is not connected' });
    }

    const sent = await sendWhatsAppMessage(SESSION_NAME, phoneNumber, message);
    if (!sent) {
      return res.status(502).json({ message: 'Failed to send test message via WAHA' });
    }

    res.json({ message: 'Test message sent successfully' });
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({ message: 'Error sending test message' });
  }
});

router.get('/sessions', async (_req, res) => {
  try {
    const sessions = await prisma.whatsAppSession.findMany();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

export { router as whatsappRouter };