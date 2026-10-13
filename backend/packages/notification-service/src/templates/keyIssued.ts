export function keyIssuedTemplate(licenseId: string, rawKey: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Your Clinvo API Key</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h1 style="color:#2563eb;">Your Clinvo API Key is Ready</h1>
  <p>Your license has been issued successfully. Here is your API key — <strong>save it now, it will not be shown again.</strong></p>
  <div style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;padding:16px;font-family:monospace;font-size:14px;word-break:break-all;margin:16px 0;">
    ${rawKey}
  </div>
  <p style="color:#6b7280;font-size:13px;">License ID: <code>${licenseId}</code></p>
  <h2>How to use your key</h2>
  <p>Include the key in the <code>Authorization</code> header of your API requests:</p>
  <pre style="background:#1e293b;color:#e2e8f0;border-radius:8px;padding:16px;font-size:13px;">Authorization: Bearer ${rawKey}</pre>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
  <p style="color:#9ca3af;font-size:12px;">This email was sent by Clinvo. If you have questions, contact support@clinvo.in</p>
</body>
</html>
`;
}
