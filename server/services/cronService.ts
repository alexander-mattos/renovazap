import cron from 'node-cron';
import { processPendingNotifications } from './notificationService';

// Initialize cron jobs
export const initCronJobs = (): void => {
  // Run notification processing every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled notification processing...');
    try {
      await processPendingNotifications();
    } catch (error) {
      console.error('Error in notification cron job:', error);
    }
  });

  console.log('Notification cron job scheduled');
};