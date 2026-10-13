export function licenseExpiringTemplate(licenseId: string, daysLeft: number): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>License Expiring Soon</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h1 style="color:#d97706;">⚠️ Your Clinvo License Expires in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}</h1>
  <p>Your Clinvo license (<code>${licenseId}</code>) will expire in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
  <p>To avoid service interruption, please renew your subscription before it expires.</p>
  <div style="margin:24px 0;">
    <a href="https://clinvo.in/renew"
       style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;display:inline-block;">
      Renew Now →
    </a>
  </div>
  <p>If you have already renewed, please disregard this message.</p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
  <p style="color:#9ca3af;font-size:12px;">Questions? Contact support@clinvo.in</p>
</body>
</html>
`;
}
