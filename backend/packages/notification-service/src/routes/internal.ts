import { Router } from 'express';
import { z } from 'zod';
import { internalAuth } from '../middleware/internalAuth.js';
import { sendEmail } from '../services/emailService.js';
import { AppError } from '../middleware/errorHandler.js';
import { keyIssuedTemplate } from '../templates/keyIssued.js';
import { licenseExpiringTemplate } from '../templates/licenseExpiring.js';
import { licenseExpiredTemplate } from '../templates/licenseExpired.js';

const SendEmailBody = z.object({
  event: z.enum(['key_issued', 'license_expiring', 'license_expired']),
  to: z.string().email(),
  data: z.record(z.unknown()),
});

export function internalRouter(): Router {
  const router = Router();

  // POST /v1/internal/send
  router.post('/send', internalAuth, async (req, res, next) => {
    try {
      const parsed = SendEmailBody.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body'));
      }

      const { event, to, data } = parsed.data;
      let subject: string;
      let html: string;

      switch (event) {
        case 'key_issued':
          subject = 'Your Clinvo API Key';
          html = keyIssuedTemplate(String(data.licenseId ?? ''), String(data.rawKey ?? ''));
          break;
        case 'license_expiring':
          subject = `Your Clinvo License Expires in ${data.daysLeft} Day(s)`;
          html = licenseExpiringTemplate(String(data.licenseId ?? ''), Number(data.daysLeft ?? 0));
          break;
        case 'license_expired':
          subject = 'Your Clinvo License Has Expired';
          html = licenseExpiredTemplate(String(data.licenseId ?? ''));
          break;
        default:
          return next(new AppError(400, 'UNKNOWN_EVENT', 'Unknown event type'));
      }

      await sendEmail(to, subject, html);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
