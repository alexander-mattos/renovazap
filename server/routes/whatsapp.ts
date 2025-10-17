import express from 'express';
import prisma from '../../src/lib/prisma';
import { initWhatsApp, getSessionStatus, disconnectSession, sendWhatsAppMessage } from '../services/whatsappService';

const router = express.Router();

// Initialize WhatsApp session
router.post('/init', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Session name is required' });
    }
    
    // Check if session already exists
    let session = await prisma.whatsAppSession.findUnique({
      where: { name },
    });
    
    if (!session) {
      // Create new session
      session = await prisma.whatsAppSession.create({
        data: { name },
      });
    }
    
    // Initialize WhatsApp connection and get QR code
    const { qrCode, success } = await initWhatsApp(session.id, name);
    
    if (success) {
      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: { qrCode, status: 'pending' },
      });
      
      res.json({ 
        message: 'WhatsApp session initialized', 
        sessionId: session.id,
        qrCode 
      });
    } else {
      res.status(500).json({ message: 'Failed to initialize WhatsApp session' });
    }
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    res.status(500).json({ message: 'Error initializing WhatsApp' });
  }
});

// Get session status
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.whatsAppSession.findUnique({
      where: { id },
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const status = await getSessionStatus(id);
    
    res.json({ 
      sessionId: id, 
      name: session.name,
      status: status,
      qrCode: session.qrCode
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({ message: 'Error getting session status' });
  }
});

// Disconnect session
router.post('/disconnect/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.whatsAppSession.findUnique({
      where: { id },
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const success = await disconnectSession(id);
    
    if (success) {
      await prisma.whatsAppSession.update({
        where: { id },
        data: { status: 'disconnected', qrCode: null },
      });
      
      res.json({ message: 'WhatsApp session disconnected' });
    } else {
      res.status(500).json({ message: 'Failed to disconnect session' });
    }
  } catch (error) {
    console.error('Error disconnecting session:', error);
    res.status(500).json({ message: 'Error disconnecting session' });
  }
});

// Send test message
router.post('/send-test', async (req, res) => {
  try {
    const { sessionId, phoneNumber, message } = req.body;
    
    if (!sessionId || !phoneNumber || !message) {
      return res.status(400).json({ 
        message: 'Session ID, phone number, and message are required' 
      });
    }
    
    const session = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.status !== 'connected' && session.status !== 'open') {
      return res.status(400).json({ message: 'WhatsApp session is not connected' });
    }
    
    const success = await sendWhatsAppMessage(sessionId, phoneNumber, message);
    
    if (success) {
      res.json({ message: 'Test message sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send test message' });
    }
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({ message: 'Error sending test message' });
  }
});

// Get all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.whatsAppSession.findMany();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

export { router as whatsappRouter };