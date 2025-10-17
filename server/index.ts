import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initCronJobs } from './services/cronService';
import { authRouter } from './routes/auth';
import { policyRouter } from './routes/policy';
import { whatsappRouter } from './routes/whatsapp';
import { baileysProxyRouter } from './routes/baileysProxy';
import { templateRouter } from './routes/template';
import { insuranceTypeRouter } from './routes/insuranceType';
import { insuranceProviderRouter } from './routes/insuranceProvider';
import { messageTemplatesRouter } from './routes/messageTemplates';
import { notificationsRouter } from './routes/notifications';
import { authenticateToken } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/policies', authenticateToken, policyRouter);
app.use('/api/whatsapp', authenticateToken, whatsappRouter);
app.use('/api/templates', authenticateToken, templateRouter);
app.use('/api/insurance-types', authenticateToken, insuranceTypeRouter);
app.use('/api/insurance-providers', authenticateToken, insuranceProviderRouter);
app.use('/api/message-templates', authenticateToken, messageTemplatesRouter);
app.use('/api/notifications', authenticateToken, notificationsRouter);
// Proxy endpoints to external Baileys API (mounted at root for compatibility with client paths)
// Place the proxy after the /api routes so it doesn't intercept /api/* endpoints
app.use('/', authenticateToken, baileysProxyRouter);
// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize cron jobs for notification scheduling
  initCronJobs();
});

export default app;