import express from 'express'
import axios from 'axios'
import prisma from '../../src/lib/prisma';

const router = express.Router()

const BAILEYS_BASE = process.env.BAILEYS_BASE_URL || 'https://baileys.conversaexpress.com.br'

function forwardHeaders(req: express.Request) {
  const headers: Record<string, string> = {}
  // Use a dedicated header for Baileys API token to avoid forwarding the app JWT.
  // Client should send the Baileys token in 'x-baileys-token'. If present, forward it as Authorization to Baileys.
  const baileyToken = req.headers['x-baileys-token'] || req.headers['x-baileys-token'.toLowerCase()]
  if (baileyToken) {
    // If token is provided without 'Bearer ' prefix, keep it as-is (client can include 'Bearer ' or just the token).
    const t = Array.isArray(baileyToken) ? baileyToken[0] : String(baileyToken)
    headers['Authorization'] = t.startsWith('Bearer ') ? t : `Bearer ${t}`
  }
  if (req.headers['content-type']) headers['Content-Type'] = String(req.headers['content-type'])
  return headers
}

// Helper to forward a send request to the external Baileys API.
export async function forwardSend(body: any, token?: string, timeoutMs = 20000) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  const r = await axios.post(`${BAILEYS_BASE}/send`, body, { headers, timeout: timeoutMs });
  return r;
}

// Require Baileys token for these proxy endpoints. This avoids forwarding the Baileys token in Authorization
// and prevents the app JWT verification from trying to validate it.
router.use((req, res, next) => {
  const baileyToken = req.headers['x-baileys-token'] || req.headers['x-baileys-token'.toLowerCase()]
  if (!baileyToken) {
    return res.status(400).json({ error: "Missing Baileys token. Please send the Baileys API token in header 'x-baileys-token'" })
  }
  next()
})

// GET /status -> proxies to BAILEYS_BASE/status
router.get('/status', async (req, res) => {
  try {
    const headers = forwardHeaders(req)
    const r = await axios.get(`${BAILEYS_BASE}/status`, { headers, timeout: 5000 })
    // If connection is open, persist session in DB (upsert)
    try {
      const data = r.data || {}
      const connection = data.connection
      if (connection && String(connection.connection).toLowerCase() === 'open') {
        // derive a name if provided by Baileys, otherwise use 'default'
        const name = connection.id || connection.name || 'default'
        const now = new Date()
        // upsert session with metadata (userId if available and connectedAt)
        await prisma.whatsAppSession.upsert({
          where: { name },
          update: ({
            status: 'open',
            qrCode: data.qr || null,
            userId: (req as any).user?.id || null,
            connectedAt: now,
          } as any),
          create: ({
            name,
            status: 'open',
            qrCode: data.qr || null,
            userId: (req as any).user?.id || null,
            connectedAt: now,
          } as any),
        })
      }
    } catch (dbErr) {
      console.error('Error persisting WhatsApp session', dbErr)
    }
    res.status(r.status).json(r.data)
  } catch (err: any) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data)
    } else {
      console.error('Error proxying /status', err.message)
      res.status(502).json({ error: 'bad gateway' })
    }
  }
})

// POST /connect -> proxies to BAILEYS_BASE/connect
router.post('/connect', async (req, res) => {
  try {
    const headers = forwardHeaders(req)
    const r = await axios.post(`${BAILEYS_BASE}/connect`, req.body, { headers, timeout: 10000 })
    res.status(r.status).json(r.data)
  } catch (err: any) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data)
    } else {
      console.error('Error proxying /connect', err.message)
      res.status(502).json({ error: 'bad gateway' })
    }
  }
})

// POST /pair-code -> proxies to BAILEYS_BASE/pair-code
router.post('/pair-code', async (req, res) => {
  try {
    const headers = forwardHeaders(req)
    const r = await axios.post(`${BAILEYS_BASE}/pair-code`, req.body, { headers, timeout: 10000 })
    res.status(r.status).json(r.data)
  } catch (err: any) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data)
    } else {
      console.error('Error proxying /pair-code', err.message)
      res.status(502).json({ error: 'bad gateway' })
    }
  }
})

// POST /send -> proxies to BAILEYS_BASE/send
router.post('/send', async (req, res) => {
  try {
    const baileyToken = req.headers['x-baileys-token'] || req.headers['x-baileys-token'.toLowerCase()];
    const token = baileyToken ? (Array.isArray(baileyToken) ? baileyToken[0] : String(baileyToken)) : undefined;
    const r = await forwardSend(req.body, token);
    res.status(r.status).json(r.data)
  } catch (err: any) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data)
    } else {
      console.error('Error proxying /send', err.message)
      res.status(502).json({ error: 'bad gateway' })
    }
  }
})

export { router as baileysProxyRouter }
