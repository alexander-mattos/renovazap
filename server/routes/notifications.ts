import express from 'express'
import { resendFailedNotification, getNotificationHistory, getNotificationStats, sendNotificationNow, listNotifications, updateNotification, deleteNotification } from '../services/notificationService'

const router = express.Router()

// Mount authentication at usage site; keep routes protected by middleware in index.ts

// GET /api/notifications/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getNotificationStats()
    res.json(stats)
  } catch (error) {
    console.error('Error getting notification stats', error)
    res.status(500).json({ error: 'Error getting notification stats' })
  }
})

// GET /api/notifications/ -> list all (query: status, policyId)
router.get('/', async (req, res) => {
  try {
    const { status, policyId, page, pageSize } = req.query;
    const pageNum = page ? Math.max(1, parseInt(page as string, 10)) : undefined;
    const size = pageSize ? Math.max(1, Math.min(200, parseInt(pageSize as string, 10))) : undefined;

    const result = await listNotifications({ status: status as string | undefined, policyId: policyId as string | undefined }, { page: pageNum, pageSize: size });
    res.json(result);
  } catch (error) {
    console.error('Error listing notifications', error);
    res.status(500).json({ error: 'Error listing notifications' });
  }
});

// PUT /api/notifications/:id -> update notification
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateNotification(id, req.body);
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating notification', error);
    res.status(500).json({ error: error?.message || 'Error updating notification' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteNotification(id);
    res.json({ message: 'Deleted' });
  } catch (error: any) {
    console.error('Error deleting notification', error);
    res.status(500).json({ error: error?.message || 'Error deleting notification' });
  }
});

// GET /api/notifications/history/:policyId
router.get('/history/:policyId', async (req, res) => {
  try {
    const { policyId } = req.params
    const history = await getNotificationHistory(policyId)
    res.json(history)
  } catch (error) {
    console.error('Error getting notification history', error)
    res.status(500).json({ error: 'Error getting notification history' })
  }
})

// POST /api/notifications/resend/:id
router.post('/resend/:id', async (req, res) => {
  try {
    const { id } = req.params
    await resendFailedNotification(id)
    res.json({ message: 'Resend queued' })
  } catch (error: any) {
    console.error('Error resending notification', error)
    res.status(500).json({ error: error?.message || 'Error resending notification' })
  }
})

// POST /api/notifications/send-now/:id -> send immediately regardless of status
router.post('/send-now/:id', async (req, res) => {
  try {
    const { id } = req.params
    await sendNotificationNow(id)
    res.json({ message: 'Send initiated' })
  } catch (error: any) {
    console.error('Error sending notification now', error)
    res.status(500).json({ error: error?.message || 'Error sending notification now' })
  }
})

export { router as notificationsRouter }

