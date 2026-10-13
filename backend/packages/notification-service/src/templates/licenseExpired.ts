export function licenseExpiredTemplate(licenseId: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>License Expired</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h1 style="color:#dc2626;">❌ Your Clinvo License Has Expired</h1>
  <p>Your Clinvo license (<code>${licenseId}</code>) has expired. API key verification will now fail until the license is renewed.</p>
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
    <strong>Impact:</strong> Any applications using your Clinvo API key will be unable to verify their license.
  </div>
  <div style="margin:24px 0;">
    <a href="https://clinvo.in/renew"
       style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;display:inline-block;">
      Renew License →
    </a>
  </div>
  <p>If you believe this is an error, contact our support team immediately.</p>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
  <p style="color:#9ca3af;font-size:12px;">Questions? Contact support@clinvo.in</p>
</body>
</html>
`;
}
