import { env } from '../env.js';

async function postToNotifyService(
  event: string,
  to: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const response = await fetch(`${env.NOTIFY_SERVICE_URL}/v1/internal/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': env.INTERNAL_SERVICE_KEY,
      },
      body: JSON.stringify({ event, to, data }),
    });

    if (!response.ok) {
      console.error(
        `[notifyClient] Notification service responded with status ${response.status} for event '${event}'`,
      );
    }
  } catch (err) {
    // Notification failure must never propagate to the caller
    console.error(`[notifyClient] Failed to send '${event}' notification to ${to}:`, err);
  }
}

export async function sendKeyIssuedEmail(
  licenseId: string,
  tenantEmail: string,
  rawKey: string,
): Promise<void> {
  await postToNotifyService('key_issued', tenantEmail, { licenseId, rawKey });
}

export async function sendExpiringEmail(
  licenseId: string,
  tenantEmail: string,
  daysLeft: number,
): Promise<void> {
  await postToNotifyService('license_expiring', tenantEmail, { licenseId, daysLeft });
}

export async function sendExpiredEmail(
  licenseId: string,
  tenantEmail: string,
): Promise<void> {
  await postToNotifyService('license_expired', tenantEmail, { licenseId });
}
