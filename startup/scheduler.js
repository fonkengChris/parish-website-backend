import cron from 'node-cron';
import { getTodayLiturgicalColor } from '../utils/liturgicalCalendar.js';

/**
 * Setup scheduled tasks
 */
export function setupScheduler() {
  // Run at midnight every day to update liturgical color
  // Cron expression: '0 0 * * *' means "at 00:00 (midnight) every day"
  cron.schedule('0 0 * * *', async () => {
    try {
      const colorInfo = await getTodayLiturgicalColor();
      console.log(`[Scheduler] Liturgical color updated at midnight: ${colorInfo.color} (${colorInfo.hex})`);
      console.log(`[Scheduler] Date: ${colorInfo.date}`);
    } catch (error) {
      console.error('[Scheduler] Error updating liturgical color:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust to your parish's timezone
  });

  // Also run immediately on server start to log current color
  (async () => {
    try {
      const colorInfo = await getTodayLiturgicalColor();
      console.log(`[Scheduler] Current liturgical color: ${colorInfo.color} (${colorInfo.hex})`);
      console.log(`[Scheduler] Scheduled task will run daily at midnight to update color`);
    } catch (error) {
      console.error('[Scheduler] Error getting initial liturgical color:', error);
    }
  })();
}

