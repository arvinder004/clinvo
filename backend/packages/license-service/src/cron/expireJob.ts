import cron from 'node-cron';
import type { Db } from '@clinvo/shared';
import { expireOverdueLicenses } from '../services/licenseService.js';
import { sendExpiredEmail } from '../services/notifyClient.js';

export function startCronJobs(db: Db): void {
  // Run daily at 00:05 UTC
  cron.schedule('5 0 * * *', async () => {
    console.log('[cron] Running license expiry job...');
    try {
      const expired = await expireOverdueLicenses(db);
      console.log(`[cron] Expired ${expired.length} licenses`);

      for (const { licenseId, tenantEmail } of expired) {
        await sendExpiredEmail(licenseId, tenantEmail);
      }
    } catch (err) {
      console.error('[cron] Expiry job failed:', err);
    }
  });

  console.log('[cron] Scheduled license expiry job at 00:05 UTC daily');
}
